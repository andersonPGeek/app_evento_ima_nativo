import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { getEmpresaByUserApi, checkinApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CheckinScreen() {
  const { user, token } = useAuth();
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'success' | 'error' | 'warning' | null
  const [message, setMessage] = useState('');

  const handleBarCodeScanned = async ({ data }) => {
    setScanned(true);
    setLoading(true);
    setFeedback(null);
    setMessage('');
    try {
      // Buscar companyId
      const empresaRes = await getEmpresaByUserApi(user.id, token);
      const companyId = empresaRes.data.data.ID_empresa;
      // Fazer checkin
      await checkinApi(data, companyId, token);
      setFeedback('success');
      setMessage('Checkin Realizado');
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      if (apiMessage === 'Usuário já realizou checkin neste estande') {
        setFeedback('warning');
        setMessage(apiMessage);
      } else {
        setFeedback('error');
        setMessage(apiMessage || 'Falha no Checkin');
      }
    }
    setLoading(false);
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
            <Text style={styles.buttonText}>Novo Checkin</Text>
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
            <Text style={styles.buttonText}>Novo Checkin</Text>
          </TouchableOpacity>
        </View>
      )}
      {!loading && !feedback && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing={facing}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
      )}
      {!loading && !feedback && (
        <View style={styles.overlay}><Text style={styles.overlayText}>Aponte para o QR Code</Text></View>
      )}
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
}); 