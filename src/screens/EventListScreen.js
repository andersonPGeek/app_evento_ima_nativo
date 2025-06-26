import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image, StyleSheet, Linking, TextInput, Animated, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth, getEventsCache, setEventsCache, getPalestrantesCache, setPalestrantesCache } from '../contexts/AuthContext';

const API_URL = 'https://events-br-ima.onrender.com/api/eventos';
const PALESTRANTES_URL = 'https://events-br-ima.onrender.com/api/eventos/palestrante';

const MIN_SEARCH_WIDTH = 48; // largura mínima para o campo de busca

// Função utilitária para remover acentos
function removeDiacritics(str) {
  return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\x00-\x7F]/g, '');
}

export default function EventListScreen() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [palestrantes, setPalestrantes] = useState([]);
  const [filteredPalestrantes, setFilteredPalestrantes] = useState([]);
  const [selectedPalestrantes, setSelectedPalestrantes] = useState([]);
  const [showPalestrantesList, setShowPalestrantesList] = useState(false);
  const [searchInputLayout, setSearchInputLayout] = useState({ y: 0, height: 0 });

  const searchInputRef = useRef(null);
  const navigation = useNavigation();
  const { user } = useAuth();

  useEffect(() => {
    fetchEvents();
    fetchPalestrantes();
  }, []);

  useEffect(() => {
    setFilteredPalestrantes(palestrantes);
  }, [palestrantes]);

  const fetchEvents = async () => {
    const cachedEvents = getEventsCache();
    if (cachedEvents) {
      setEvents(cachedEvents);
      setFilteredEvents(cachedEvents);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/palestrante`);
      if (!response.ok) throw new Error('Erro ao buscar eventos');
      const data = await response.json();
      const eventos = (data.eventos || []).filter(e => String(e.id) !== '20');
      setEvents(eventos);
      setFilteredEvents(eventos);
      setEventsCache(eventos);
    } catch (err) {
      setError('Erro ao buscar eventos');
    } finally {
      setLoading(false);
    }
  };

  const fetchPalestrantes = async () => {
    const cachedPalestrantes = getPalestrantesCache();
    if (cachedPalestrantes) {
      setPalestrantes(cachedPalestrantes);
      return;
    }

    try {
      const response = await fetch(PALESTRANTES_URL);
      if (!response.ok) throw new Error('Erro ao buscar palestrantes');
      const data = await response.json();

      // Extrair todos os palestrantes de todos os eventos
      let allPalestrantes = [];
      if (data.eventos && Array.isArray(data.eventos)) {
        data.eventos.forEach(evento => {
          if (Array.isArray(evento.palestrantes)) {
            allPalestrantes = allPalestrantes.concat(evento.palestrantes);
          }
        });
      }

      // Remover duplicados por id
      const uniquePalestrantes = [];
      const seen = new Set();
      for (const p of allPalestrantes) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          uniquePalestrantes.push(p);
        }
      }

      setPalestrantes(uniquePalestrantes);
      setPalestrantesCache(uniquePalestrantes);
    } catch (err) {
      console.error('Erro ao buscar palestrantes:', err);
    }
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    if (text.trim() === "") {
      setFilteredPalestrantes(palestrantes);
      setShowPalestrantesList(false);
      return;
    }
    const textoNormalizado = removeDiacritics(text.toLowerCase());
    const filtrados = palestrantes.filter(p =>
      removeDiacritics(p.nome.toLowerCase()).includes(textoNormalizado)
    );

    setFilteredPalestrantes(filtrados);
    setShowPalestrantesList(true);
  };

  const handlePalestranteSelect = (palestrante) => {
    if (!selectedPalestrantes.find(p => p.id === palestrante.id)) {
      const novosSelecionados = [...selectedPalestrantes, palestrante];
      setSelectedPalestrantes(novosSelecionados);
      filterEventsByPalestrantes(novosSelecionados);
    }
    setSearchText('');
    setFilteredPalestrantes([]);
    setShowPalestrantesList(false);
  };

  const removePalestranteFilter = (palestranteId) => {
    const newSelected = selectedPalestrantes.filter(p => p.id !== palestranteId);
    setSelectedPalestrantes(newSelected);
    filterEventsByPalestrantes(newSelected);
  };

  const filterEventsByPalestrantes = (selectedPalestrantes) => {
    if (!selectedPalestrantes || selectedPalestrantes.length === 0) {
      setFilteredEvents(events);
      return;
    }
    const filtered = events.filter(event =>
      event.palestrantes?.some(p => selectedPalestrantes.some(sp => sp.id === p.id))
    );
    setFilteredEvents(filtered);
  };

  const clearSearch = () => {
    setSearchText('');
    setFilteredPalestrantes([]);
    setShowPalestrantesList(false);
    setSelectedPalestrantes([]);
    setFilteredEvents(events);
  };

  const openMaps = (address) => {
    const encoded = encodeURIComponent(address);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
    Linking.openURL(url);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.foto }} style={styles.image} defaultSource={require('../../assets/logo.png')} />
        <View style={styles.dateBadge}>
          <Ionicons name="calendar" size={16} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.dateText}>{formatDateRange(item.dataEvento, item.dataFimEvento)}</Text>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{item.nomeEvento}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="calendar" size={16} color="#2563eb" style={{ marginRight: 4 }} />
          <Text style={styles.dateTextCard}>{formatDateRange(item.dataEvento, item.dataFimEvento)}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="location" size={16} color="#2563eb" style={{ marginRight: 4 }} />
          <Text style={styles.location}>{formatAddress(item)}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="people" size={16} color="#2563eb" style={{ marginRight: 4 }} />
          <Text style={styles.participants}>{item.participantes} participantes</Text>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => {
              navigation.navigate('Agenda', { 
                eventId: item.id,
                dataEvento: item.dataEvento,
                dataFimEvento: item.dataFimEvento
              });
            }}
          >
            <Text style={styles.buttonText}>Entrar</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapButton} onPress={() => openMaps(formatAddress(item))}>
            <Ionicons name="map" size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>
        {selectedPalestrantes.length > 0 && (
          <View style={styles.eventPalestrantesRow}>
            {item.palestrantes?.filter(p => selectedPalestrantes.some(sp => sp.id === p.id)).map(p => (
              <View key={p.id} style={styles.eventPalestranteBox}>
                <Image source={{ uri: p.foto }} style={styles.eventPalestranteFoto} defaultSource={require('../../assets/logo.png')} />
                <Text style={styles.eventPalestranteNome}>{p.nome}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  function formatDateRange(dataInicio, dataFim) {
    if (!dataInicio) return '';
    try {
      const dInicio = Array.isArray(dataInicio) ? dataInicio[0] : dataInicio;
      const dateInicio = new Date(dInicio._seconds ? dInicio._seconds * 1000 : dInicio);
      let strInicio = dateInicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      if (!dataFim) return strInicio;
      const dFim = Array.isArray(dataFim) ? dataFim[0] : dataFim;
      const dateFim = new Date(dFim._seconds ? dFim._seconds * 1000 : dFim);
      let strFim = dateFim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      if (strInicio === strFim) return strInicio;
      return `${strInicio} - ${strFim}`;
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
      <View style={styles.searchContainerRelative} pointerEvents="box-none">
        <View style={styles.searchInputContainer} onLayout={e => setSearchInputLayout(e.nativeEvent.layout)}>
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { paddingRight: 40 }]}
            placeholder="Buscar palestrante..."
            value={searchText}
            onChangeText={handleSearchChange}
            placeholderTextColor="#888"
          />
          <View style={styles.searchIconContainer}>
            <Ionicons name="search" size={20} color="#101828" />
          </View>
        </View>
        {showPalestrantesList && filteredPalestrantes.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.overlay}
              activeOpacity={1}
              onPress={() => {
                setShowPalestrantesList(false);
                setSearchText('');
              }}
            />
            <View
              style={[styles.palestrantesListAbsolute, { top: searchInputLayout.y + searchInputLayout.height }]}
              pointerEvents="auto"
            >
              <ScrollView
                style={{ maxHeight: 280 }}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                {filteredPalestrantes.map(palestrante => (
                  <TouchableOpacity
                    key={palestrante.id}
                    style={styles.palestranteItem}
                    onPress={() => handlePalestranteSelect(palestrante)}
                  >
                    <Image
                      source={{ uri: palestrante.foto }}
                      style={styles.palestranteFoto}
                      defaultSource={require('../../assets/logo.png')}
                    />
                    <Text style={styles.palestranteNome}>{palestrante.nome}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        )}
        {selectedPalestrantes.length > 0 && (
          <View style={styles.selectedPalestrantes}>
            {selectedPalestrantes.map(palestrante => (
              <View key={palestrante.id} style={styles.selectedPalestrante}>
                <Image
                  source={{ uri: palestrante.foto }}
                  style={styles.selectedPalestranteFoto}
                  defaultSource={require('../../assets/logo.png')}
                />
                <TouchableOpacity style={styles.selectedPalestranteRemove} onPress={() => removePalestranteFilter(palestrante.id)}>
                  <Ionicons name="close-circle" size={18} color="#888" />
                </TouchableOpacity>
                <Text style={styles.selectedPalestranteNome}>
                  {palestrante.nome.split(' ')[0]}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <FlatList
        data={filteredEvents}
        keyExtractor={(item, index) => `${item.id}-${index}`}
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
  searchContainer: {
    padding: 16,
  },
  searchContainerRelative: {
    padding: 16,
    position: 'relative',
    zIndex: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 0,
    height: 48,
    minWidth: 48,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#101828',
    height: 48,
    paddingVertical: 0,
  },
  searchIcon: {
    display: 'none',
  },
  searchIconContainer: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  clearIcon: {
    width: 32,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 40,
    top: 0,
    bottom: 0,
    zIndex: 2,
  },
  palestrantesList: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1000,
  },
  palestrantesListAbsolute: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 20,
    zIndex: 1001,
    maxHeight: 280,
  },
  palestranteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  palestranteFoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  palestranteNome: {
    fontSize: 16,
    color: '#101828',
  },
  selectedPalestrantes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  selectedPalestrante: {
    alignItems: 'center',
    marginRight: 8,
    position: 'relative',
  },
  selectedPalestranteFoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 4,
    backgroundColor: '#eee',
  },
  selectedPalestranteNome: {
    fontSize: 12,
    color: '#101828',
    textAlign: 'center',
  },
  selectedPalestranteRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 10,
    zIndex: 2,
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
  eventPalestrantesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  eventPalestranteBox: {
    alignItems: 'center',
    marginRight: 8,
  },
  eventPalestranteFoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 2,
    backgroundColor: '#eee',
  },
  eventPalestranteNome: {
    fontSize: 12,
    color: '#101828',
    textAlign: 'center',
    maxWidth: 60,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
    elevation: 9,
  },
  dateTextCard: {
    color: '#101828',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
}); 