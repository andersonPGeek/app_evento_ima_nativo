import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { checkinWithQueueApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache local para códigos já lidos
const QR_CODE_CACHE_KEY = 'qr_codes_read';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas em millisegundos
const DUPLICATE_READ_MESSAGE = 'Este código já foi lido anteriormente.';

const isDuplicateCheckinMessage = (message) => {
  if (!message || typeof message !== 'string') return false;

  const normalized = message.toLowerCase();
  return (
    normalized.includes('já realizou checkin neste estande') ||
    normalized.includes('já realizou leitura neste estande')
  );
};

export default function CheckinScreen() {
  const { token, companyId, showBanner } = useAuth();
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'success' | 'error' | 'warning' | 'invalid_pattern'
  const [message, setMessage] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [qrCodeCache, setQrCodeCache] = useState(new Set());

  // Modal de observação
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [observation, setObservation] = useState('');
  const [currentQrCode, setCurrentQrCode] = useState('');
  const [processingQrCode, setProcessingQrCode] = useState(false);

  // Carregar cache de códigos já lidos
  useEffect(() => {
    loadQrCodeCache();
  }, []);

  // Validar padrão do QR code
  const validateQrCodePattern = (code) => {
    if (!code || typeof code !== 'string') {
      return false;
    }

    const pattern = /^[A-Z0-9]{10}$/;

    try {
      return pattern.test(code);
    } catch (error) {
      return false;
    }
  };

  const loadQrCodeCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(QR_CODE_CACHE_KEY);
      if (cached) {
        const parsedData = JSON.parse(cached);

        if (parsedData && Array.isArray(parsedData.codes) && typeof parsedData.timestamp === 'number') {
          if (Date.now() - parsedData.timestamp < CACHE_DURATION) {
            setQrCodeCache(new Set(parsedData.codes));
          } else {
            await AsyncStorage.removeItem(QR_CODE_CACHE_KEY);
            setQrCodeCache(new Set());
          }
        } else {
          await AsyncStorage.removeItem(QR_CODE_CACHE_KEY);
          setQrCodeCache(new Set());
        }
      } else {
        setQrCodeCache(new Set());
      }
    } catch (error) {
      setQrCodeCache(new Set());
      try {
        await AsyncStorage.removeItem(QR_CODE_CACHE_KEY);
      } catch (clearError) {
        // Ignorar erro de limpeza
      }
    }
  };

  const saveQrCodeToCache = async (code) => {
    if (!code || typeof code !== 'string') {
      return;
    }

    try {
      const currentCache = qrCodeCache || new Set();
      const newCache = new Set(currentCache).add(code);

      setQrCodeCache(newCache);

      const dataToSave = {
        codes: Array.from(newCache),
        timestamp: Date.now()
      };

      await AsyncStorage.setItem(QR_CODE_CACHE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      try {
        const currentCache = qrCodeCache || new Set();
        const newCache = new Set(currentCache).add(code);
        setQrCodeCache(newCache);
      } catch (memoryError) {
        // Se até o cache em memória falhar, continuar sem cache
      }
    }
  };

  const isCodeInCache = (code) => {
    try {
      if (!code || typeof code !== 'string' || !qrCodeCache) {
        return false;
      }

      return qrCodeCache.has(code);
    } catch (error) {
      return false;
    }
  };

  const showAlreadyReadWarning = async (code) => {
    setFeedback('warning');
    setMessage(DUPLICATE_READ_MESSAGE);

    if (code) {
      try {
        await saveQrCodeToCache(code);
      } catch (cacheError) {
        // Ignorar erros de cache
      }
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setScanned(false);
      setFeedback(null);
      setMessage('');
      setShowObservationModal(false);
      setCurrentQrCode('');
      setObservation('');
      setLoading(false);
      setProcessingQrCode(false);
      setIsCameraActive(true);

      return () => {
        setIsCameraActive(false);
      };
    }, [])
  );

  const handleBarCodeScanned = async ({ data }) => {
    if (loading || processingQrCode) return;

    setScanned(true);
    setFeedback(null);
    setMessage('');

    try {
      if (!validateQrCodePattern(data)) {
        setFeedback('invalid_pattern');
        setMessage('Código QR inválido.');
        return;
      }

      if (isCodeInCache(data)) {
        await showAlreadyReadWarning(data);
        return;
      }

      if (!companyId) {
        throw new Error('ID da empresa não encontrado');
      }

      setCurrentQrCode(data);
      setObservation('');
      setShowObservationModal(true);
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      if (isDuplicateCheckinMessage(apiMessage)) {
        await showAlreadyReadWarning(data);
      } else {
        setFeedback('error');
        setMessage(apiMessage || 'Falha na Leitura');
      }
    }
  };

  const handleObservationSubmit = async () => {
    setProcessingQrCode(true);
    setShowObservationModal(false);
    setLoading(true);

    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) {
        throw new Error('ID do usuário não encontrado no dispositivo');
      }

      await checkinWithQueueApi(currentQrCode, companyId, token, observation, storedUserId);

      try {
        await saveQrCodeToCache(currentQrCode);
      } catch (cacheError) {
        // Ignorar erros de cache
      }

      setFeedback('success');
      setMessage('Leitura Realizada');
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      if (isDuplicateCheckinMessage(apiMessage)) {
        await showAlreadyReadWarning(currentQrCode);
      } else {
        setFeedback('error');
        setMessage(apiMessage || 'Falha na Leitura');
      }
    } finally {
      setProcessingQrCode(false);
      setCurrentQrCode('');
      setObservation('');
      setLoading(false);
    }
  };

  const handleObservationCancel = () => {
    setShowObservationModal(false);
    setCurrentQrCode('');
    setObservation('');
    setScanned(false);
    setFeedback(null);
    setMessage('');
    setIsCameraActive(true);
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Carregando permissão da câmera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>Precisamos da sua permissão para acessar a câmera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Conceder permissão</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, feedback === 'success' ? styles.success : feedback === 'error' ? styles.error : feedback === 'warning' ? styles.warning : null]}>
      {loading && <ActivityIndicator size="large" color="#101828" style={{ marginTop: 32 }} />}
      {!loading && feedback === 'success' && (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
          <Text style={[styles.feedbackText, styles.successTextColor]}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={() => { setScanned(false); setFeedback(null); setMessage(''); }}>
            <Text style={styles.buttonText}>Nova Leitura</Text>
          </TouchableOpacity>
        </View>
      )}
      {!loading && feedback === 'error' && (
        <View style={styles.center}>
          <Ionicons name="close-circle" size={80} color="#ef4444" />
          <Text style={[styles.feedbackText, styles.errorTextColor]}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={() => { setScanned(false); setFeedback(null); setMessage(''); }}>
            <Text style={styles.buttonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      )}
      {!loading && feedback === 'warning' && (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={80} color="#facc15" />
          <Text style={[styles.feedbackText, styles.warningTextColor]}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={() => { setScanned(false); setFeedback(null); setMessage(''); }}>
            <Text style={styles.buttonText}>Nova Leitura</Text>
          </TouchableOpacity>
        </View>
      )}
      {!loading && feedback === 'invalid_pattern' && (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={80} color="#f59e0b" />
          <Text style={[styles.feedbackText, styles.invalidPatternTextColor]}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={() => { setScanned(false); setFeedback(null); setMessage(''); }}>
            <Text style={styles.buttonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      )}
      {!loading && !feedback && !showObservationModal && !scanned && !showBanner && isCameraActive && permission?.granted && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing={facing}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarCodeScanned}
        />
      )}
      {!loading && !feedback && !showObservationModal && !scanned && !showBanner && isCameraActive && permission?.granted && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>Aponte para o QR Code</Text>
        </View>
      )}
      {!loading && !feedback && !showObservationModal && !scanned && !showBanner && isCameraActive && !permission?.granted && (
        <View style={styles.center}>
          <Text style={[styles.feedbackText, styles.errorTextColor]}>Aguardando permissão da câmera...</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Conceder permissão</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showObservationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleObservationCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Inclua alguma informação que facilite o seu contato com esta pessoa</Text>
            <TextInput
              style={styles.observationInput}
              placeholder="Digite a observação"
              multiline
              numberOfLines={6}
              value={observation}
              onChangeText={setObservation}
              maxLength={150}
            />
            <Text style={styles.charCount}>{observation.length}/150</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={handleObservationCancel}>
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={handleObservationSubmit}>
                <Text style={styles.modalButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f7fd',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  success: {
    backgroundColor: '#d1fae5',
  },
  error: {
    backgroundColor: '#fee2e2',
  },
  warning: {
    backgroundColor: '#fef9c3',
  },
  feedbackText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
    width: '100%',
    lineHeight: 30,
  },
  errorTextColor: {
    color: '#b91c1c',
  },
  warningTextColor: {
    color: '#b45309',
  },
  invalidPatternTextColor: {
    color: '#f59e0b',
  },
  successTextColor: {
    color: '#166534',
  },
  button: {
    marginTop: 32,
    backgroundColor: '#101828',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  overlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  overlayText: {
    backgroundColor: '#101828cc',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '85%',
    maxHeight: '70%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#101828',
    textAlign: 'center',
  },
  observationInput: {
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#101828',
    minHeight: 60,
  },
  charCount: {
    alignSelf: 'flex-end',
    marginTop: -15,
    marginBottom: 15,
    fontSize: 12,
    color: '#666',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {
    backgroundColor: '#101828',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
