import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { getEmpresaByUserApi, checkinWithQueueApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache local para códigos já lidos
const QR_CODE_CACHE_KEY = 'qr_codes_read';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas em millisegundos

export default function CheckinScreen() {
  const { user, token, companyId, showBanner } = useAuth();
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

  const loadQrCodeCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(QR_CODE_CACHE_KEY);
      if (cached) {
        const { codes, timestamp } = JSON.parse(cached);
        // Limpar cache se expirou
        if (Date.now() - timestamp < CACHE_DURATION) {
          setQrCodeCache(new Set(codes));
        } else {
          await AsyncStorage.removeItem(QR_CODE_CACHE_KEY);
        }
      }
    } catch (error) {
      console.log('Erro ao carregar cache de QR codes:', error);
    }
  };

  const saveQrCodeToCache = async (code) => {
    try {
      const newCache = new Set(qrCodeCache).add(code);
      setQrCodeCache(newCache);
      await AsyncStorage.setItem(QR_CODE_CACHE_KEY, JSON.stringify({
        codes: Array.from(newCache),
        timestamp: Date.now()
      }));
    } catch (error) {
      console.log('Erro ao salvar QR code no cache:', error);
    }
  };

  // Validar padrão do QR code
  const validateQrCodePattern = (code) => {
    // Padrão: 10 caracteres alfanuméricos, todas maiúsculas, sem caracteres especiais
    const pattern = /^[A-Z0-9]{10}$/;
    return pattern.test(code);
  };

  // Resetar estados quando a tela recebe foco
  useFocusEffect(
    React.useCallback(() => {
      console.log('🎯 [CHECKIN] Tela recebeu foco - ativando câmera');
      // Resetar todos os estados
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
        console.log('🎯 [CHECKIN] Tela perdeu foco - desativando câmera');
        setIsCameraActive(false);
      };
    }, [])
  );

  // Monitorar mudanças nas permissões da câmera
  useEffect(() => {
    console.log('🎯 [CHECKIN] Permissão da câmera:', {
      permission: permission?.granted,
      status: permission?.status
    });
  }, [permission]);

  // Monitorar mudanças nos estados que afetam a câmera
  useEffect(() => {
    console.log('🎯 [CHECKIN] Estados da câmera:', {
      loading,
      feedback,
      showObservationModal,
      isCameraActive,
      scanned,
      showBanner,
      permissionGranted: permission?.granted,
      permissionStatus: permission?.status
    });
  }, [loading, feedback, showObservationModal, isCameraActive, scanned, showBanner, permission]);

  const handleBarCodeScanned = async ({ data }) => {
    // Verificar se já está processando
    if (loading || processingQrCode) return;
    
    console.log('🎯 [CHECKIN] Iniciando leitura do QR:', data);
    setScanned(true);
    setFeedback(null);
    setMessage('');

    try {
      // 1. Validar padrão do QR code
      if (!validateQrCodePattern(data)) {
        console.log('🎯 [CHECKIN] Padrão inválido');
        setFeedback('invalid_pattern');
        setMessage('Código QR inválido. Verifique se o código tem 10 caracteres alfanuméricos.');
        return;
      }

      // 2. Verificar se já foi lido (cache)
      if (qrCodeCache.has(data)) {
        console.log('🎯 [CHECKIN] Código já lido (cache)');
        setFeedback('warning');
        setMessage('Este código já foi lido anteriormente.');
        return;
      }

      // 3. Usar companyId do contexto
      if (!companyId) {
        throw new Error('ID da empresa não encontrado');
      }
      
      // 4. Mostrar modal de observação (sem loading)
      console.log('🎯 [CHECKIN] Validações OK, abrindo modal');
      setCurrentQrCode(data);
      setObservation('');
      setShowObservationModal(true);
      
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      if (apiMessage === 'Usuário já realizou leitura neste estande') {
        setFeedback('warning');
        setMessage(apiMessage);
        // Salvar no cache mesmo se já foi lido em outro dispositivo
        await saveQrCodeToCache(data);
      } else {
        console.log('🎯 [CHECKIN] Erro na leitura:', err);
        console.log('QR CODe:', data, 'companyId:', companyId, 'token:', token)
        setFeedback('error');
        setMessage(apiMessage || 'Falha na Leitura');
      }
    }
  };

  const handleObservationSubmit = async () => {
    console.log('🎯 [CHECKIN] Confirmando observação');
    setProcessingQrCode(true);
    setShowObservationModal(false);
    setLoading(true); // Adicionar loading
    
    try {
      // Obter storedUserId do AsyncStorage
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) {
        throw new Error('ID do usuário não encontrado no dispositivo');
      }

      // 4. Fazer checkin via fila Redis com observação e storedUserId
      console.log('🎯 [CHECKIN] Chamando API com observação:', observation, 'storedUserId:', storedUserId);
      await checkinWithQueueApi(currentQrCode, companyId, token, observation, storedUserId);
      
      // 5. Salvar no cache após sucesso
      await saveQrCodeToCache(currentQrCode);
      
      setFeedback('success');
      setMessage('Leitura Realizada');
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      if (apiMessage === 'Usuário já realizou leitura neste estande') {
        setFeedback('warning');
        setMessage(apiMessage);
        // Salvar no cache mesmo se já foi lido em outro dispositivo
        await saveQrCodeToCache(currentQrCode);
      } else {
        console.log('🎯 [CHECKIN] Erro na leitura:', err);
        console.log('QR CODe:', currentQrCode, 'companyId:', companyId, 'token:', token, 'observation:', observation)
        setFeedback('error');
        setMessage(apiMessage || 'Falha na Leitura');
      }
    } finally {
      console.log('🎯 [CHECKIN] Finalizando processamento');
      setProcessingQrCode(false);
      setCurrentQrCode('');
      setObservation('');
      setLoading(false); // Remover loading
    }
  };

  const handleObservationCancel = () => {
    console.log('🎯 [CHECKIN] Cancelando modal de observação');
    setShowObservationModal(false);
    setCurrentQrCode('');
    setObservation('');
    setScanned(false);
    setFeedback(null);
    setMessage('');
    setIsCameraActive(true);
  };

  if (!permission) {
    // Permissão ainda está carregando
    return <View style={styles.center}><ActivityIndicator size="large" /><Text>Carregando permissão da câmera...</Text></View>;
  }

  if (!permission.granted) {
    // Permissão não concedida
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
          <Text style={styles.successText}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={() => { setScanned(false); setFeedback(null); setMessage(''); }}>
            <Text style={styles.buttonText}>Nova Leitura</Text>
          </TouchableOpacity>
        </View>
      )}
      {!loading && feedback === 'error' && (
        <View style={styles.center}>
          <Ionicons name="close-circle" size={80} color="#ef4444" />
          <Text style={styles.errorText}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={() => { setScanned(false); setFeedback(null); setMessage(''); }}>
            <Text style={styles.buttonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      )}
      {!loading && feedback === 'warning' && (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={80} color="#facc15" />
          <Text style={styles.warningText}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={() => { setScanned(false); setFeedback(null); setMessage(''); }}>
            <Text style={styles.buttonText}>Nova Leitura</Text>
          </TouchableOpacity>
        </View>
      )}
      {!loading && feedback === 'invalid_pattern' && (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={80} color="#f59e0b" />
          <Text style={styles.invalidPatternText}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={() => { setScanned(false); setFeedback(null); setMessage(''); }}>
            <Text style={styles.buttonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      )}
      {!loading && !feedback && !showObservationModal && !scanned && !showBanner && isCameraActive && permission?.granted && (
        <>
          {console.log('🎯 [CHECKIN] Renderizando câmera - loading:', loading, 'feedback:', feedback, 'showObservationModal:', showObservationModal, 'scanned:', scanned, 'showBanner:', showBanner, 'isCameraActive:', isCameraActive, 'permission:', permission?.granted)}
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing={facing}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarCodeScanned}
          />
        </>
      )}
      {!loading && !feedback && !showObservationModal && !scanned && !showBanner && isCameraActive && permission?.granted && (
        <>
          {console.log('🎯 [CHECKIN] Renderizando overlay da câmera - isCameraActive:', isCameraActive, 'permission:', permission?.granted)}
          <View style={styles.overlay}><Text style={styles.overlayText}>Aponte para o QR Code</Text></View>
        </>
      )}
      {!loading && !feedback && !showObservationModal && !scanned && !showBanner && isCameraActive && !permission?.granted && (
        <View style={styles.center}>
          <Text style={styles.errorText}>Aguardando permissão da câmera...</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Conceder permissão</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de Observação */}
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
              placeholder="Digite a observação (opcional)"
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
  successText: {
    color: '#166534',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
  },
  warningText: {
    color: '#b45309',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  invalidPatternText: {
    color: '#f59e0b',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
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
    minHeight: 120,
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