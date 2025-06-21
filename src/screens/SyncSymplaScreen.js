import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { TextInput } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';

const API_BASE = 'https://events-br-ima.onrender.com/api';
const ADMIN_EMAIL = 'ketherinyday@hotmail.com';
const ADMIN_PASSWORD = '123456';

// Mapeamento de IDs
const EVENTO_ID_MAP = {
  '8': 's2abab5',
  '4': 's2ab991',
  '2': 's2ac494',
  '7': 's2ac55f',
  '9': 's2aaff4',
  '20': 's2ac649',
  '1': 's2ac649'
};

function maskTicket(value) {
  // Remove tudo que não for letra ou número
  let v = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  // Aplica a máscara SSSS-SS-SSSS
  if (v.length > 4) v = v.slice(0, 4) + '-' + v.slice(4);
  if (v.length > 7) v = v.slice(0, 7) + '-' + v.slice(7);
  return v.slice(0, 12); // Limita a 12 caracteres (incluindo os traços)
}

export default function SyncSymplaScreen({ navigation, route }) {
  const { email } = route.params;
  const [eventos, setEventos] = useState([]);
  const [selectedEvento, setSelectedEvento] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEventos();
  }, []);

  const fetchEventos = async () => {
    try {
      const response = await fetch(`${API_BASE}/eventos`);
      const data = await response.json();
      // Remover evento com id = 5
      const eventosFiltrados = (data.eventos || []).filter(e => String(e.id) !== '5');
      setEventos(eventosFiltrados);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Não foi possível carregar os eventos',
        position: 'bottom',
      });
    }
  };

  const handleSync = async () => {
    if (!selectedEvento || !ticketNumber) {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Por favor, preencha todos os campos',
        position: 'bottom',
      });
      return;
    }

    setLoading(true);
    try {
      // Login administrativo para obter o token
      const adminLogin = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Email: ADMIN_EMAIL, senha: ADMIN_PASSWORD })
      });
      const adminData = await adminLogin.json();
      const adminToken = adminData.token;
      if (!adminToken) throw new Error('Falha ao obter token administrativo');

      const symplaEventId = EVENTO_ID_MAP[selectedEvento];
      const response = await fetch(
        `${API_BASE}/sympla/participant/${symplaEventId}/${ticketNumber}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Sucesso',
          text2: 'Sincronização realizada com sucesso',
          position: 'bottom',
        });
        navigation.replace('Login', { email, senha: email });
      } else {
        throw new Error(data.message || 'Erro na sincronização');
      }
    } catch (error) {
      console.error('Erro na sincronização:', error);
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Erro na importação do Sympla. Por favor, procure a administração do evento.',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Sincronização com Sympla</Text>
        <Text style={styles.subtitle}>Selecione o evento e informe seu ticket</Text>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedEvento}
            onValueChange={(value) => setSelectedEvento(value)}
            style={styles.picker}
            itemStyle={styles.pickerItem}
            mode="dropdown"
            dropdownIconColor="#101828"
            prompt="Selecione um evento"
          >
            <Picker.Item label="Selecione um evento" value="" />
            {eventos.map((evento) => (
              <Picker.Item
                key={evento.id}
                label={evento.nomeEvento}
                value={evento.id}
                style={{ fontSize: 18, height: 50, color: '#101828' }}
              />
            ))}
          </Picker>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Ticket (ex: U3T8-9K-7FMG)"
          value={ticketNumber}
          onChangeText={v => setTicketNumber(maskTicket(v))}
          maxLength={12}
          autoCapitalize="characters"
          placeholderTextColor="#888"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleSync}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sincronizar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f7fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#3a4a5c',
    marginBottom: 16,
  },
  pickerContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e3e7ee',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    marginBottom: 12,
    overflow: 'hidden',
    minHeight: 54,
  },
  picker: {
    width: '100%',
    height: 54,
    fontSize: 18,
  },
  pickerItem: {
    fontSize: 18,
    height: 54,
    color: '#101828',
    textAlign: 'left',
  },
  input: {
    width: '100%',
    height: 44,
    borderWidth: 1,
    borderColor: '#e3e7ee',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
    fontSize: 16,
    letterSpacing: 2,
  },
  button: {
    width: '100%',
    height: 44,
    backgroundColor: '#101828',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 