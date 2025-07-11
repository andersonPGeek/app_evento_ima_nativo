import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { getCurrentBannerApi } from '../api';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function BannerModal({ visible, onClose }) {
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      fetchBanner();
    }
  }, [visible]);

  const fetchBanner = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getCurrentBannerApi();
      
      if (response.data.success && response.data.banner) {
        setBanner(response.data.banner);
      } else {
        setError('Nenhum banner disponível no momento');
      }
    } catch (err) {
      setError('Erro ao carregar banner');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setBanner(null);
    setError('');
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Bem-vindo ao Evento!</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#101828" />
                <Text style={styles.loadingText}>Carregando banner...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : banner ? (
              <View style={styles.bannerContainer}>
                <Image
                  source={{ uri: banner.url }}
                  style={styles.bannerImage}
                  resizeMode="contain"
                />
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: width * 0.9,
    maxHeight: height * 0.8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#101828',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  bannerContainer: {
    alignItems: 'center',
  },
  bannerImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 16,
  },
}); 