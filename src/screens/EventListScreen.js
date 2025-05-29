import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image, StyleSheet, Linking } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const API_URL = 'https://events-br-ima.onrender.com/api/eventos';

export default function EventListScreen() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const navigation = useNavigation();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Erro ao buscar eventos');
      const data = await response.json();
      const eventos = data.eventos || [];
      setEvents(eventos);
    } catch (err) {
      setError('Erro ao buscar eventos');
    } finally {
      setLoading(false);
    }
  };

  const openMaps = (address) => {
    const encoded = encodeURIComponent(address);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
    Linking.openURL(url);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.foto }} style={styles.image} />
        <View style={styles.dateBadge}>
          <Ionicons name="calendar" size={16} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.dateText}>{formatDate(item.dataEvento)}</Text>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{item.nomeEvento}</Text>
        <View style={styles.row}>
          <Ionicons name="location" size={16} color="#2563eb" style={{ marginRight: 4 }} />
          <Text style={styles.location}>{formatAddress(item)}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="people" size={16} color="#2563eb" style={{ marginRight: 4 }} />
          <Text style={styles.participants}>{item.participantes} participantes</Text>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Agenda', { eventId: item.id })}>
            <Text style={styles.buttonText}>Entrar</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapButton} onPress={() => openMaps(formatAddress(item))}>
            <Ionicons name="map" size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  function formatDate(dataEvento) {
    if (!dataEvento) return '';
    try {
      const d = Array.isArray(dataEvento) ? dataEvento[0] : dataEvento;
      const date = new Date(d._seconds * 1000);
      return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '';
    }
  }

  function formatAddress(item) {
    // Rua, número - bairro, cidade - estado, cep
    return `${item.logradouro || ''}, ${item.numero || ''} - ${item.bairro || ''}, ${item.cidade || ''} - ${item.estado || ''}, ${item.cep || ''}`;
  }

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator size="large" /><Text>Carregando eventos...</Text></SafeAreaView>;
  }

  if (error) {
    return <SafeAreaView style={styles.center}><Text style={{ color: 'red' }}>{error}</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f7fd' }} edges={["top"]}>
      <Text style={styles.header}>Selecione um Evento</Text>
      <FlatList
        data={events}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32 }}>Nenhum evento encontrado</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f7fd',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
    color: '#101828',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
    backgroundColor: '#eee',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  dateBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#101828cc',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dateText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  info: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#101828',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#3a4a5c',
    flex: 1,
  },
  participants: {
    fontSize: 14,
    color: '#2563eb',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#101828',
    borderRadius: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  mapButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f3f7fd',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e3e7ee',
  },
}); 