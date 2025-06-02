import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
import { getEmpresaByUserApi } from '../api';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const API_BASE = 'https://events-br-ima.onrender.com/api';

export default function CheckinListScreen() {
  const { user, token, role } = useAuth();
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [companyId, setCompanyId] = useState(null);

  useEffect(() => {
    if (!user?.id || !token) return; // Aguarda contexto pronto
    const fetchCompanyId = async () => {
      try {
        const empresaRes = await getEmpresaByUserApi(user.id, token);
        const id = empresaRes?.data?.data?.ID_empresa;
        setCompanyId(id || '');
      } catch (err) {
        setCompanyId('');
      }
    };
    fetchCompanyId();
  }, [user, token]);

  useEffect(() => {
    if (companyId === null) return; // ainda não buscou
    if (companyId === '') {
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

  const handleExport = async () => {
    if (!companyId || !user?.id) return;
    
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

  return (
    <SafeAreaViewContext style={styles.container} edges={['top']}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Leituras Realizadas</Text>
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
                <Text style={[styles.th, { width: 200 }]}>NOME</Text>
                <Text style={[styles.th, { width: 150 }]}>CARGO</Text>
                <Text style={[styles.th, { width: 150 }]}>EMPRESA</Text>
                <Text style={[styles.th, { width: 200 }]}>EMAIL</Text>
                <Text style={[styles.th, { width: 120 }]}>TEL</Text>
              </View>
              <FlatList
                data={checkins}
                keyExtractor={(_, idx) => idx.toString()}
                renderItem={({ item }) => (
                  <View style={styles.tableRow}>
                    <Text style={[styles.td, { width: 200 }]} numberOfLines={1}>{item.Nome}</Text>
                    <Text style={[styles.td, { width: 150 }]} numberOfLines={1}>{item.Cargo}</Text>
                    <Text style={[styles.td, { width: 150 }]} numberOfLines={1}>{item.Empresa}</Text>
                    <Text style={[styles.td, { width: 200 }]} numberOfLines={1}>{item.Email}</Text>
                    <Text style={[styles.td, { width: 120 }]} numberOfLines={1}>{item.Telefone_Celular}</Text>
                  </View>
                )}
                ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32, color: '#888' }}>Nenhum check-in encontrado</Text>}
                contentContainerStyle={{ paddingBottom: 32 }}
              />
            </View>
          </ScrollView>
        </View>
      )}
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
  header: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#101828',
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
}); 