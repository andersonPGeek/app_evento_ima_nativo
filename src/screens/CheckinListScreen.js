import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
import { getEmpresaByUserApi, updateCheckinObservationApi } from '../api';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://events-br-ima.onrender.com/api';

export default function CheckinListScreen() {
  const { user, token, role, companyId } = useAuth();
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para modal de observação
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [observation, setObservation] = useState('');
  const [currentCheckinId, setCurrentCheckinId] = useState(null);
  const [currentCheckinObservation, setCurrentCheckinObservation] = useState('');
  const [updatingObservation, setUpdatingObservation] = useState(false);

  // Estados para modal de confirmação de exportação
  const [showExportModal, setShowExportModal] = useState(false);

  // Função para calcular larguras dinâmicas das colunas
  const calculateColumnWidths = (data) => {
    if (!data || data.length === 0) {
      return {
        nome: 150,
        cargo: 120,
        empresa: 120,
        email: 150,
        telefone: 100,
        observacao: 200,
        funcionario: 120,
        acoes: 80
      };
    }

    const widths = {
      nome: 0,
      cargo: 0,
      empresa: 0,
      email: 0,
      telefone: 0,
      observacao: 200, // Fixo para permitir quebra de linha
      funcionario: 0,
      acoes: 80 // Fixo para o botão
    };

    data.forEach(item => {
      // Calcular largura baseada no texto (aproximadamente 7px por caractere para fonte 13px)
      const nomeWidth = Math.max(widths.nome, (item.Nome?.length || 0) * 7 + 16);
      const cargoWidth = Math.max(widths.cargo, (item.Cargo?.length || 0) * 7 + 16);
      const empresaWidth = Math.max(widths.empresa, (item.Empresa?.length || 0) * 7 + 16);
      const emailWidth = Math.max(widths.email, (item.Email?.length || 0) * 7 + 16);
      const telefoneWidth = Math.max(widths.telefone, (item.Telefone_Celular?.length || 0) * 7 + 16);
      const funcionarioWidth = Math.max(widths.funcionario, (item.funcionario?.length || 0) * 7 + 16);

      widths.nome = Math.min(nomeWidth, 180); // Máximo 180px
      widths.cargo = Math.min(cargoWidth, 160); // Máximo 160px
      widths.empresa = Math.min(empresaWidth, 140); // Máximo 140px
      widths.email = Math.min(emailWidth, 220); // Máximo 220px
      widths.telefone = Math.min(telefoneWidth, 110); // Máximo 110px
      widths.funcionario = Math.min(funcionarioWidth, 140); // Máximo 140px
    });

    // Larguras mínimas
    widths.nome = Math.max(widths.nome, 100);
    widths.cargo = Math.max(widths.cargo, 90);
    widths.empresa = Math.max(widths.empresa, 90);
    widths.email = Math.max(widths.email, 130);
    widths.telefone = Math.max(widths.telefone, 70);
    widths.funcionario = Math.max(widths.funcionario, 90);

    return widths;
  };

  const columnWidths = calculateColumnWidths(checkins);

  useEffect(() => {
    if (!companyId) {
      setError('ID da empresa não encontrado');
      setLoading(false);
      return;
    }
    
    const fetchCheckins = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch(`${API_BASE}/checkins/estande/${companyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setCheckins(data);
        } else {
          setError('Erro ao carregar os checkins');
        }
      } catch (err) {
        setError('Erro ao buscar dados');
      } finally {
        setLoading(false);
      }
    };
    fetchCheckins();
  }, [companyId, token]);

  // Atualizar lista automaticamente quando a tela receber foco
  useFocusEffect(
    React.useCallback(() => {
      
      if (!companyId) {
        setError('ID da empresa não encontrado');
        setLoading(false);
        return;
      }
      
      const fetchCheckins = async () => {
        try {
          setRefreshing(true);
          setError('');
          const response = await fetch(`${API_BASE}/checkins/estande/${companyId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setCheckins(data);
          } else {
            setError('Erro ao carregar os checkins');
          }
        } catch (err) {
          setError('Erro ao buscar dados');
        } finally {
          setRefreshing(false);
        }
      };
      
      fetchCheckins();
    }, [companyId, token])
  );

  const handleExport = async () => {
    if (!companyId || !user?.id) return;
    
    // Mostrar modal de confirmação primeiro
    setShowExportModal(true);
  };

  const handleConfirmExport = async () => {
    if (!companyId || !user?.id) return;
    
    setShowExportModal(false);
    setExporting(true);
    try {
      const response = await fetch(`${API_BASE}/usuarios/checkins/${companyId}/${user.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'Exportação realizada com sucesso!',
          text2: `Os dados foram enviados para o e-mail ${user.email}`,
          position: 'bottom',
          visibilityTime: 4000,
        });
      } else {
        throw new Error('Erro ao exportar dados');
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao exportar dados',
        text2: 'Tente novamente mais tarde',
        position: 'bottom',
        visibilityTime: 4000,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleCancelExport = () => {
    setShowExportModal(false);
  };

  // Função para abrir modal de observação
  const handleEditObservation = (checkin) => {
    if (!checkin.id) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao editar observação',
        text2: 'ID do check-in não encontrado',
        position: 'bottom',
        visibilityTime: 3000,
      });
      return;
    }
    
    setCurrentCheckinId(checkin.id);
    setCurrentCheckinObservation(checkin.observacao || '');
    setObservation(checkin.observacao || '');
    setShowObservationModal(true);
  };

  // Função para confirmar observação
  const handleObservationSubmit = async () => {
    if (!currentCheckinId) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao atualizar observação',
        text2: 'ID do check-in não encontrado',
        position: 'bottom',
        visibilityTime: 3000,
      });
      return;
    }
    
    setUpdatingObservation(true);
    try {
      // Obter token do AsyncStorage
      const storedToken = await AsyncStorage.getItem('token');
      
      if (!storedToken) {
        throw new Error('Token não encontrado');
      }

      await updateCheckinObservationApi(currentCheckinId, observation, storedToken);
      
      // Atualizar a lista local
      setCheckins(prevCheckins => 
        prevCheckins.map(checkin => 
          checkin.id === currentCheckinId 
            ? { ...checkin, observacao: observation }
            : checkin
        )
      );

      Toast.show({
        type: 'success',
        text1: 'Observação atualizada com sucesso!',
        position: 'bottom',
        visibilityTime: 3000,
      });

      setShowObservationModal(false);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao atualizar observação',
        text2: err.response?.data?.message || 'Tente novamente mais tarde',
        position: 'bottom',
        visibilityTime: 4000,
      });
    } finally {
      setUpdatingObservation(false);
      setCurrentCheckinId(null);
      setCurrentCheckinObservation('');
      setObservation('');
    }
  };

  // Função para cancelar modal de observação
  const handleObservationCancel = () => {
    setShowObservationModal(false);
    setCurrentCheckinId(null);
    setCurrentCheckinObservation('');
    setObservation('');
  };

  return (
    <SafeAreaViewContext style={styles.container} edges={['top']}>
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <Text style={styles.header}>Leituras Realizadas</Text>
          {refreshing && (
            <View style={styles.refreshIndicator}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.refreshText}>Atualizando...</Text>
            </View>
          )}
        </View>
        {role === 'estandeAdmin' && (
          <TouchableOpacity 
            style={[styles.exportButton, exporting && styles.exportButtonDisabled]} 
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={18} color="#fff" style={styles.exportIcon} />
                <Text style={styles.exportButtonText}>Exportar</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {companyId === null || loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : (
        <View style={styles.tableContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: columnWidths.nome }]}>NOME</Text>
                <Text style={[styles.th, { width: columnWidths.cargo }]}>CARGO</Text>
                <Text style={[styles.th, { width: columnWidths.empresa }]}>EMPRESA</Text>
                <Text style={[styles.th, { width: columnWidths.email }]}>EMAIL</Text>
                <Text style={[styles.th, { width: columnWidths.telefone }]}>TEL</Text>
                <Text style={[styles.th, { width: columnWidths.observacao }]}>OBSERVAÇÃO</Text>
                <Text style={[styles.th, { width: columnWidths.funcionario }]}>FUNCIONÁRIO</Text>
                <Text style={[styles.th, { width: columnWidths.acoes }]}>AÇÕES</Text>
              </View>
              <FlatList
                data={checkins}
                keyExtractor={item => item.id?.toString() || Math.random().toString()}
                renderItem={({ item }) => (
                  <View style={styles.tableRow}>
                    <Text style={[styles.td, { width: columnWidths.nome }]} numberOfLines={1}>{item.Nome}</Text>
                    <Text style={[styles.td, { width: columnWidths.cargo }]} numberOfLines={1}>{item.Cargo}</Text>
                    <Text style={[styles.td, { width: columnWidths.empresa }]} numberOfLines={1}>{item.Empresa}</Text>
                    <Text style={[styles.td, { width: columnWidths.email }]} numberOfLines={1}>{item.Email}</Text>
                    <Text style={[styles.td, { width: columnWidths.telefone }]} numberOfLines={1}>{item.Telefone_Celular}</Text>
                    <Text style={[styles.td, { width: columnWidths.observacao }]} numberOfLines={2}>{item.observacao || '-'}</Text>
                    <Text style={[styles.td, { width: columnWidths.funcionario }]} numberOfLines={1}>{item.funcionario || '-'}</Text>
                    <View style={[styles.td, { width: columnWidths.acoes, alignItems: 'center' }]}>
                      <TouchableOpacity 
                        style={styles.editButton}
                        onPress={() => handleEditObservation(item)}
                      >
                        <Ionicons name="create-outline" size={16} color="#2563eb" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32, color: '#888' }}>Nenhum check-in encontrado</Text>}
                contentContainerStyle={{ paddingBottom: 32 }}
              />
            </View>
          </ScrollView>
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
            <Text style={styles.modalTitle}>Editar Observação</Text>
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
              <TouchableOpacity 
                style={styles.modalButton} 
                onPress={handleObservationCancel}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, updatingObservation && styles.modalButtonDisabled]} 
                onPress={handleObservationSubmit}
                disabled={updatingObservation}
              >
                {updatingObservation ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmação de Exportação */}
      <Modal
        visible={showExportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelExport}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.exportModalContent]}>
            <Text style={styles.modalTitle}>Confirmar Exportação</Text>
            <Text style={styles.modalText}>
              A base de dados será enviada para o e-mail:{'\n'}
              <Text style={styles.emailText}>{user?.email}</Text>
            </Text>
            <Text style={styles.modalSubtext}>
              ⚠️ Verifique também sua caixa de spam após o envio.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={handleCancelExport}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={handleConfirmExport}
              >
                <Text style={styles.modalButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaViewContext>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f7fd', paddingHorizontal: 0 },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  header: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#101828',
  },
  refreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  refreshText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#2563eb',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  exportIcon: {
    marginRight: 6,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  errorBox: { 
    backgroundColor: '#fee2e2', 
    borderColor: '#fca5a5', 
    borderWidth: 1, 
    borderRadius: 8, 
    marginHorizontal: 16, 
    marginBottom: 12, 
    padding: 12 
  },
  errorText: { 
    color: '#b91c1c', 
    fontWeight: 'bold' 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  tableContainer: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    marginHorizontal: 8, 
    paddingBottom: 8, 
    elevation: 2,
    flex: 1,
  },
  tableHeader: { 
    flexDirection: 'row', 
    borderBottomWidth: 2, 
    borderColor: '#d1d5db', 
    backgroundColor: '#f9fafb', 
    borderTopLeftRadius: 12, 
    borderTopRightRadius: 12, 
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  th: { 
    fontWeight: 'bold', 
    color: '#374151', 
    fontSize: 13, 
    textAlign: 'left',
    paddingHorizontal: 8,
  },
  tableRow: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderColor: '#f3f7fd', 
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  td: { 
    color: '#222', 
    fontSize: 13, 
    textAlign: 'left',
    paddingHorizontal: 8,
  },
  editButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#101828',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 20,
  },
  observationInput: {
    width: '100%',
    height: 120,
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#222',
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  charCount: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emailText: {
    fontWeight: 'bold',
    color: '#2563eb',
  },
  modalSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  exportModalContent: {
    padding: 24,
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    borderColor: '#d1d5db',
    borderWidth: 1,
  },
  cancelButtonText: {
    color: '#374151',
  },
  confirmButton: {
    backgroundColor: '#2563eb',
  },
}); 