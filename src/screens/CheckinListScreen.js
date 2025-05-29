import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
import { getEmpresaByUserApi } from '../api';

const API_BASE = 'https://events-br-ima.onrender.com/api';

export default function CheckinListScreen() {
  const { user, token } = useAuth();
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companyId, setCompanyId] = useState(null);

  useEffect(() => {
    console.log('user', user);
    console.log('token', token);
    if (!user?.id || !token) return; // Aguarda contexto pronto
    console.log('user.id', user.id);
    console.log('token', token);
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

  return (
    <SafeAreaViewContext style={styles.container} edges={['top']}>
      <Text style={styles.header}>Leituras Realizadas</Text>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {companyId === null || loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : (
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>NOME</Text>
            <Text style={styles.th}>CARGO</Text>
            <Text style={styles.th}>EMPRESA</Text>
            <Text style={styles.th}>EMAIL</Text>
            <Text style={styles.th}>TEL</Text>
          </View>
          <FlatList
            data={checkins}
            keyExtractor={(_, idx) => idx.toString()}
            renderItem={({ item }) => (
              <View style={styles.tableRow}>
                <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>{item.Nome}</Text>
                <Text style={styles.td} numberOfLines={1}>{item.Cargo}</Text>
                <Text style={styles.td} numberOfLines={1}>{item.Empresa}</Text>
                <Text style={styles.td} numberOfLines={1}>{item.Email}</Text>
                <Text style={styles.td} numberOfLines={1}>{item.Telefone_Celular}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32, color: '#888' }}>Nenhum check-in encontrado</Text>}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        </View>
      )}
    </SafeAreaViewContext>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f7fd', paddingHorizontal: 0 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#101828', marginBottom: 12, textAlign: 'left', marginLeft: 16 },
  errorBox: { backgroundColor: '#fee2e2', borderColor: '#fca5a5', borderWidth: 1, borderRadius: 8, marginHorizontal: 16, marginBottom: 12, padding: 12 },
  errorText: { color: '#b91c1c', fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tableContainer: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 8, paddingBottom: 8, elevation: 2 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 2, borderColor: '#d1d5db', backgroundColor: '#f9fafb', borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingVertical: 8, paddingHorizontal: 4 },
  th: { flex: 1, fontWeight: 'bold', color: '#374151', fontSize: 13, textAlign: 'left' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f3f7fd', paddingVertical: 8, paddingHorizontal: 4 },
  td: { flex: 1, color: '#222', fontSize: 13, textAlign: 'left' },
}); 