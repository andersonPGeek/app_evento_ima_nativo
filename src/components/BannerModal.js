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
  const [shouldShowModal, setShouldShowModal] = useState(false);

  console.log('🎨 [BANNER] BannerModal renderizado, visible:', visible);

  useEffect(() => {
    console.log('🎨 [BANNER] useEffect triggered, visible:', visible);
    if (visible) {
      console.log('🎨 [BANNER] Banner visível, buscando dados...');
      fetchBanner();
    } else {
      // Resetar estados quando modal não está visível
      setBanner(null);
      setShouldShowModal(false);
      setLoading(true);
    }
  }, [visible]);

  const fetchBanner = async () => {
    console.log('🎨 [BANNER] Iniciando busca do banner...');
    try {
      setLoading(true);
      const response = await getCurrentBannerApi();
      console.log('🎨 [BANNER] Resposta da API:', response.data);
      
      if (response.data.success && response.data.banner) {
        console.log('🎨 [BANNER] Banner encontrado:', response.data.banner);
        setBanner(response.data.banner);
        setShouldShowModal(true); // Só mostra a modal se há banner válido
      } else {
        console.log('🎨 [BANNER] Nenhum banner disponível');
        // Não exibir modal quando não há banner
        onClose();
      }
    } catch (err) {
      // Tratar erro de forma silenciosa se for um erro esperado
      if (err.message === 'BANNER_NOT_FOUND' || err.isExpected) {
        console.log('🎨 [BANNER] Banner não encontrado - comportamento esperado');
      } else {
        console.error('🎨 [BANNER] Erro ao buscar banner:', err);
      }
      // Não exibir modal quando há erro na API
      onClose();
    } finally {
      console.log('🎨 [BANNER] Loading finalizado');
      setLoading(false);
    }
  };

  const handleClose = () => {
    console.log('🎨 [BANNER] Banner fechado pelo usuário');
    setBanner(null);
    setShouldShowModal(false);
    onClose();
  };

  // Só renderiza a modal se visible=true E shouldShowModal=true
  if (!visible || !shouldShowModal) {
    console.log('🎨 [BANNER] Modal não deve ser exibida - visible:', visible, 'shouldShowModal:', shouldShowModal);
    return null;
  }

  console.log('🎨 [BANNER] Renderizando modal, loading:', loading, 'banner:', !!banner);

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