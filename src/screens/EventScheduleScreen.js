import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, FlatList, Modal, Image, StyleSheet, ScrollView, SafeAreaView, Platform, Linking, Alert, KeyboardAvoidingView } from 'react-native';
import { Ionicons, MaterialIcons, Feather, AntDesign } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { WebView } from 'react-native-webview';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

const API_BASE = 'https://events-br-ima.onrender.com/api';
const API_BASE_APP = 'https://app-eventos-ima.vercel.app';

function formatFirestoreDate(timestamp) {
  try {
    if (typeof timestamp === 'string') {
      return timestamp.substring(0, 5);
    }
    const date = new Date(timestamp._seconds * 1000);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Horário não disponível';
  }
}

export default function EventScheduleScreen({ route }) {
  const navigation = useNavigation();
  const eventId = route?.params?.eventId;
  const [stages, setStages] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventDates, setEventDates] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingLectures, setIsLoadingLectures] = useState(false);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [eventMapUrl, setEventMapUrl] = useState(null);
  const [showingMap, setShowingMap] = useState(false);
  const [rating, setRating] = useState(0);
  const eventDataFetchedRef = useRef(false);
  const lecturesFetchedRef = useRef({});
  const { user, token } = useAuth();

  // Verificação do eventId e recarregamento dos dados
  useEffect(() => {
    if (!eventId) {
      Alert.alert(
        'Selecione um Evento',
        'Por favor, selecione um evento na lista de eventos para visualizar a agenda.',
        [
          {
            text: 'Voltar para Eventos',
            onPress: () => navigation.navigate('Eventos')
          }
        ]
      );
      return;
    }

    // Resetar os refs e estados quando o eventId mudar
    eventDataFetchedRef.current = false;
    lecturesFetchedRef.current = {};
    fetchEventData();
  }, [eventId, navigation]);

  const fetchEventData = async () => {
    if (!eventId) return;
    
    try {
      setIsLoadingInitial(true);
      // Limpar dados anteriores
      setStages([]);
      setTracks([]);
      setSessions([]);
      setSelectedTrack('');
      setSelectedStage('');
      setEventMapUrl(null);
      setError(null);
      
      const eventResponse = await fetch(`${API_BASE}/eventos/${eventId}`);
      if (!eventResponse.ok) throw new Error('Falha ao buscar dados do evento');
      const eventData = await eventResponse.json();
      if (eventData.dataInicio && eventData.dataFim) {
        setEventDates({ dataInicio: eventData.dataInicio, dataFim: eventData.dataFim });
        setSelectedDate(new Date(eventData.dataInicio._seconds * 1000));
      }
      if (eventData.mapaEvento) setEventMapUrl(eventData.mapaEvento);
      const agendaResponse = await fetch(`${API_BASE}/agenda/evento/${eventId}`);

      if (!agendaResponse.ok) throw new Error('Falha ao buscar dados da agenda');
      const agendaData = await agendaResponse.json();
      setTracks(agendaData.trilhas || []);
      setStages(agendaData.palcos || []);
      if (agendaData.trilhas?.length > 0) setSelectedTrack(agendaData.trilhas[0].id);
      if (agendaData.palcos?.length > 0) setSelectedStage(agendaData.palcos[0].id);
    } catch (err) {
      setError(err.message || 'Erro desconhecido');
    } finally {
      setIsLoadingInitial(false);
    }
  };

  useEffect(() => {
    if (tracks.length > 0 && !selectedTrack) setSelectedTrack(tracks[0].id);
    if (stages.length > 0 && !selectedStage) setSelectedStage(stages[0].id);
  }, [tracks, stages]);

  useEffect(() => {
    if (!eventId || !selectedTrack || !selectedStage) return;
    const fetchKey = `${eventId}-${selectedStage}-${selectedTrack}`;
    if (lecturesFetchedRef.current[fetchKey]) return;
    lecturesFetchedRef.current[fetchKey] = true;
    const fetchLectureDetails = async () => {
      try {
        setIsLoadingLectures(true);
        const url = `${API_BASE}/programacao_evento/${eventId}/${selectedStage}/${selectedTrack}`;
        const response = await fetch(url);
        if (response.status === 404) { setSessions([]); return; }
        if (!response.ok) throw new Error(`Erro ao buscar detalhes das palestras: ${response.status}`);
        const data = await response.json();
        const formattedSessions = data.palestras?.map((lecture) => ({
          id: lecture.id || Math.random().toString(36).substr(2, 9),
          lectureId: lecture.id,
          title: lecture.titulo_palestra,
          description: lecture.descricao_palestra,
          speaker: {
            name: lecture.nome_palestrante || '',
            avatar: lecture.foto_palestrante || '',
            role: lecture.cargo_palestrante && lecture.empresa_palestrante ? `${lecture.cargo_palestrante} @ ${lecture.empresa_palestrante}` : '',
            bio: lecture.minibio_palestrante || '',
            social: {
              linkedin: lecture.linkedin_palestrante || null,
              instagram: lecture.instagram_palestrante || null,
              facebook: lecture.facebook_palestrante || null
            }
          },
          track: lecture.nometrilha,
          stage: lecture.nomepalco,
          location: lecture.local,
          duration: lecture.duracao?.minutes !== undefined ? `${lecture.duracao.minutes} min` : `${lecture.duracao.hours} h`,
          time: formatFirestoreDate(lecture.hora),
          type: lecture.tipo || 'Palestra'
        })) || [];
        setSessions(formattedSessions);
      } catch (err) {
        setError(err.message || 'Erro desconhecido');
      } finally {
        setIsLoadingLectures(false);
      }
    };
    fetchLectureDetails();
  }, [eventId, selectedTrack, selectedStage]);

  // Filtros e agrupamento
  const filteredSessions = searchQuery.trim() === ''
    ? sessions
    : sessions.filter((session) => (session.speaker?.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
  const timeSlots = filteredSessions.reduce((acc, session) => {
    const existingSlot = acc.find(slot => slot.time === session.time);
    if (existingSlot) existingSlot.sessions.push(session);
    else acc.push({ time: session.time || '', sessions: [session] });
    return acc;
  }, []).sort((a, b) => a.time.localeCompare(b.time));

  // Renderização
  if (!eventId) {
    return (
      <SafeAreaViewContext style={styles.center}>
        <Text style={{ color: '#3a4a5c', textAlign: 'center', padding: 20 }}>
          Selecione um evento para visualizar a agenda
        </Text>
      </SafeAreaViewContext>
    );
  }

  if (isLoadingInitial) {
    return <SafeAreaViewContext style={styles.center}><ActivityIndicator size="large" /><Text>Carregando dados do evento...</Text></SafeAreaViewContext>;
  }

  if (error) {
    return <SafeAreaViewContext style={styles.center}><Text style={{ color: 'red' }}>{error}</Text></SafeAreaViewContext>;
  }

  return (
    <SafeAreaViewContext style={{ flex: 1, backgroundColor: '#f3f7fd' }} edges={["top"]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Agenda do Evento</Text>
        <TouchableOpacity style={styles.filterButton} onPress={() => setIsFiltersOpen(v => !v)}>
          <Feather name="filter" size={20} color="#101828" />
          <Text style={styles.filterButtonText}>Filtros</Text>
        </TouchableOpacity>
      </View>
      {/* Filtros recolhidos por padrão */}
      {isFiltersOpen && (
        <View style={styles.filtersBox}>
          <TextInput
            style={styles.input}
            placeholder="Buscar palestrante..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View style={styles.pickerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Trilha</Text>
              <Picker
                selectedValue={selectedTrack}
                onValueChange={setSelectedTrack}
                style={styles.picker}
              >
                {tracks.map(track => (
                  <Picker.Item key={track.id} label={track.nome} value={track.id} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      )}
      {/* Abas pequenas e arredondadas, idênticas ao original */}
      <View style={styles.tabsContainer}>
        {stages.map(stage => (
          <TouchableOpacity
            key={stage.id}
            style={[styles.tab, selectedStage === stage.id && !showingMap ? styles.tabActive : null]}
            onPress={() => { setShowingMap(false); setSelectedStage(stage.id); }}
          >
            <Text style={[styles.tabText, selectedStage === stage.id && !showingMap ? styles.tabTextActive : null]}>{stage.nomePalco}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.tab, showingMap ? styles.tabActive : null]}
          onPress={() => setShowingMap(true)}
        >
          <Ionicons name="map" size={16} color={showingMap ? '#2563eb' : '#101828'} style={{ marginRight: 4 }} />
          <Text style={[styles.tabText, showingMap ? styles.tabTextActive : null]}>Mapa do Evento</Text>
        </TouchableOpacity>
      </View>
      {/* Conteúdo das tabs */}
      {showingMap ? (
        <View style={{ flex: 1, minHeight: 300 }}>
          {eventMapUrl ? (
            <WebView
              source={{ uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(eventMapUrl)}` }}
              style={{ flex: 1, minHeight: 300, margin: 16, borderRadius: 12, overflow: 'hidden' }}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['*']}
              useWebKit={true}
              allowsInlineMediaPlayback={true}
              startInLoadingState={true}
            />
          ) : (
            <View style={styles.center}><Text>Mapa do evento não disponível</Text></View>
          )}
        </View>
      ) : (
        isLoadingLectures ? (
          <View style={styles.center}><ActivityIndicator size="large" /><Text>Carregando palestras...</Text></View>
        ) : timeSlots.length === 0 ? (
          <View style={styles.center}><Text>Não há palestras cadastradas para os filtros selecionados</Text></View>
        ) : (
          <FlatList
            data={timeSlots}
            keyExtractor={slot => slot.time}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            renderItem={({ item: slot }) => (
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.timeSlot}>{slot.time}</Text>
                {slot.sessions.map(session => (
                  <TouchableOpacity
                    key={session.id}
                    style={styles.sessionCard}
                    onPress={() => { setSelectedSession(session); setRating(0); }}
                  >
                    <View style={styles.sessionHeader}>
                      {session.speaker.avatar ? (
                        <Image source={{ uri: session.speaker.avatar }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarPlaceholder}><Ionicons name="person" size={28} color="#888" /></View>
                      )}
                      <View style={{ flex: 1 }}>
                        <View style={styles.badgesRow}>
                          <View style={styles.badge}><Text style={styles.badgeText}>{session.stage}</Text></View>
                          <View style={styles.badge}><Text style={styles.badgeText}>{session.track}</Text></View>
                        </View>
                        <Text style={styles.sessionTitle}>{session.title}</Text>
                        <View style={styles.sessionInfoRow}>
                          <Ionicons name="time" size={16} color="#101828" style={{ marginRight: 4 }} />
                          <Text style={styles.sessionInfo}>{session.time} ({session.duration})</Text>
                        </View>
                        <Text style={styles.speakerName}>{session.speaker.name}</Text>
                        <Text style={styles.speakerRole}>{session.speaker.role}</Text>
                        <View style={styles.sessionInfoRow}>
                          <Ionicons name="location" size={16} color="#2563eb" style={{ marginRight: 4 }} />
                          <Text style={styles.sessionInfo}>{session.location}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
        )
      )}
      {/* Modal de detalhes da palestra */}
      <Modal
        visible={!!selectedSession}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedSession(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { minHeight: 300, maxHeight: '90%' }]}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedSession(null)}>
              <AntDesign name="close" size={24} color="#101828" />
            </TouchableOpacity>
            {selectedSession && (
              <SessionDetailsModal
                session={selectedSession}
                user={user}
                token={token}
                onClose={() => setSelectedSession(null)}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaViewContext>
  );
}

function SessionDetailsModal({ session, user, token, onClose }) {
  const [rating, setRating] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [showMotivo, setShowMotivo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [hasExistingRating, setHasExistingRating] = useState(false);

  const fetchRating = async () => {
    if (!user || !session.lectureId) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/nota-palestras/${session.lectureId}/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setRating(data.nota_palestra);
        setMotivo(data.motivo || '');
        setHasExistingRating(true);
        setShowMotivo(data.nota_palestra <= 3);
      }
    } catch (e) {
      setHasExistingRating(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRating();
    // eslint-disable-next-line
  }, [session.lectureId, user?.id]);

  const handleRating = async (star) => {
    if (!user || !token) return;
    setRating(star);
    setError('');
    setSuccess('');
    if (star > 3) {
      setShowMotivo(false);
      setMotivo('');
      await submitRating(star, '');
    } else {
      setShowMotivo(true);
    }
  };

  const submitRating = async (star, motivoText) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        ID_palestra: session.lectureId,
        ID_usuario: user.id,
        nota_palestra: star,
        motivo: motivoText || undefined
      };
      const method = hasExistingRating ? 'PUT' : 'POST';
      const res = await fetch(`${API_BASE}/nota-palestras`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSuccess('Avaliação enviada com sucesso!');
        setHasExistingRating(true);
        setShowMotivo(star <= 3);
        await fetchRating();
      } else {
        setError('Erro ao enviar avaliação.');
      }
    } catch (e) {
      setError('Erro ao enviar avaliação.');
    }
    setLoading(false);
  };

  const handleMotivoSubmit = async () => {
    if (motivo.trim().length < 10) {
      Alert.alert('Motivo obrigatório', 'Por favor, forneça um motivo com pelo menos 10 caracteres.');
      return;
    }
    await submitRating(rating, motivo);
  };

  const openSocial = (url) => {
    if (url) Linking.openURL(url).catch(() => Alert.alert('Erro', 'Não foi possível abrir o link.'));
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.modalBadgesRow}>
          <View style={styles.badge}><Text style={styles.badgeText}>{session.track}</Text></View>
        </View>
        <Text style={styles.modalTitle}>{session.title}</Text>
        <View style={styles.sessionInfoRow}>
          <Ionicons name="time" size={16} color="#101828" style={{ marginRight: 4 }} />
          <Text style={styles.sessionInfo}>{session.time} • {session.duration}</Text>
        </View>
        <View style={styles.sessionInfoRow}>
          <Ionicons name="location" size={16} color="#2563eb" style={{ marginRight: 4 }} />
          <Text style={styles.sessionInfo}>{session.location}</Text>
        </View>
        <Text style={styles.sectionTitle}>Sobre a Palestra</Text>
        <Text style={styles.sessionDescription}>{session.description}</Text>
        <Text style={styles.sectionTitle}>Palestrante</Text>
        <View style={styles.speakerRow}>
          {session.speaker.avatar ? (
            <Image source={{ uri: session.speaker.avatar }} style={styles.avatarLarge} />
          ) : (
            <View style={styles.avatarLargePlaceholder}><Ionicons name="person" size={40} color="#888" /></View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.speakerNameLarge}>{session.speaker.name}</Text>
            <Text style={styles.speakerRole}>{session.speaker.role}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {session.speaker.social?.linkedin ? (
                <TouchableOpacity onPress={() => openSocial(session.speaker.social.linkedin)}>
                  <AntDesign name="linkedin-square" size={24} color="#2563eb" />
                </TouchableOpacity>
              ) : null}
              {session.speaker.social?.instagram ? (
                <TouchableOpacity onPress={() => openSocial(session.speaker.social.instagram)}>
                  <AntDesign name="instagram" size={24} color="#d62976" />
                </TouchableOpacity>
              ) : null}
              {session.speaker.social?.facebook ? (
                <TouchableOpacity onPress={() => openSocial(session.speaker.social.facebook)}>
                  <AntDesign name="facebook-square" size={24} color="#1877f3" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Avaliação</Text>
        {loading && <ActivityIndicator size="small" color="#101828" style={{ marginVertical: 8 }} />}
        {error ? <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text> : null}
        {success ? <Text style={{ color: 'green', marginBottom: 8 }}>{success}</Text> : null}
        <View style={styles.ratingRow}>
          {[1,2,3,4,5].map(star => (
            <TouchableOpacity key={star} onPress={() => handleRating(star)} disabled={!user || loading}>
              <AntDesign name={star <= rating ? 'star' : 'staro'} size={28} color="#facc15" />
            </TouchableOpacity>
          ))}
        </View>
        {showMotivo && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: '#b45309', fontWeight: 'bold', marginBottom: 4 }}>Por favor, nos ajude a melhorar informando o motivo da sua avaliação</Text>
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="Descreva o motivo da sua avaliação..."
              value={motivo}
              onChangeText={setMotivo}
              multiline
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.button, { marginTop: 8, opacity: loading || motivo.trim().length < 10 ? 0.6 : 1 }]}
              onPress={handleMotivoSubmit}
              disabled={loading || motivo.trim().length < 10}
            >
              <Text style={styles.buttonText}>Enviar Avaliação</Text>
            </TouchableOpacity>
          </View>
        )}
        {!user && (
          <Text style={{ color: '#888', marginTop: 8 }}>Faça login para avaliar</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f7fd' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 0 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#101828' },
  filterButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, elevation: 2 },
  filterButtonText: { marginLeft: 6, color: '#101828', fontWeight: 'bold' },
  filtersBox: { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 16, elevation: 2 },
  input: { backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e3e7ee', paddingHorizontal: 12, height: 44, marginBottom: 12 },
  pickerRow: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 14, color: '#101828', marginBottom: 4 },
  picker: { backgroundColor: '#fff', borderRadius: 8 },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginRight: 0,
    minHeight: 36,
    minWidth: 110,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e3e7ee',
    elevation: 0,
    shadowOpacity: 0,
  },
  tabActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  tabText: {
    color: '#101828',
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#fff',
  },
  timeSlot: { fontSize: 18, fontWeight: 'bold', color: '#101828', marginBottom: 8 },
  sessionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: '#eee' },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  badge: { backgroundColor: '#f3f7fd', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginRight: 4 },
  badgeText: { color: '#2563eb', fontSize: 12, fontWeight: 'bold' },
  sessionTitle: { fontSize: 16, fontWeight: 'bold', color: '#101828', marginBottom: 2 },
  sessionInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  sessionInfo: { fontSize: 14, color: '#3a4a5c' },
  speakerName: { fontSize: 15, fontWeight: 'bold', color: '#101828', marginTop: 4 },
  speakerRole: { fontSize: 13, color: '#3a4a5c', marginBottom: 2 },
  modalOverlay: { flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalClose: { position: 'absolute', top: 16, right: 16, zIndex: 10 },
  modalBadgesRow: { flexDirection: 'row', gap: 8, marginBottom: 8, marginTop: 32 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#101828', marginBottom: 8, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#101828', marginTop: 16, marginBottom: 4 },
  sessionDescription: { fontSize: 14, color: '#3a4a5c', marginBottom: 8 },
  speakerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 8 },
  avatarLarge: { width: 64, height: 64, borderRadius: 32, marginRight: 16, backgroundColor: '#eee' },
  avatarLargePlaceholder: { width: 64, height: 64, borderRadius: 32, marginRight: 16, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  speakerNameLarge: { fontSize: 18, fontWeight: 'bold', color: '#101828' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 