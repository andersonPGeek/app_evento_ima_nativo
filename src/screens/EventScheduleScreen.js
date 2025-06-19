import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, FlatList, Modal, Image, StyleSheet, ScrollView, SafeAreaView, Platform, Linking, Alert, KeyboardAvoidingView } from 'react-native';
import { Ionicons, MaterialIcons, Feather, AntDesign, FontAwesome5 } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { WebView } from 'react-native-webview';
import { format, addDays, isAfter, isBefore, isEqual, parseISO } from 'date-fns';
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
  const { eventId, dataEvento, dataFimEvento } = route?.params || {};
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
  const [selectedSpeakerIndexes, setSelectedSpeakerIndexes] = useState({});
  const [eventStartDate, setEventStartDate] = useState(null);
  const [eventEndDate, setEventEndDate] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedAgendaDate, setSelectedAgendaDate] = useState(null);
  const [agendaCache, setAgendaCache] = useState({});

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

  // useEffect para montar o array de datas disponíveis a partir dos params, se existirem
  useEffect(() => {
    let start, end;
    if (dataEvento && dataFimEvento) {
      start = new Date(dataEvento._seconds ? dataEvento._seconds * 1000 : dataEvento);
      end = new Date(dataFimEvento._seconds ? dataFimEvento._seconds * 1000 : dataFimEvento);
      let dates = [];
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        dates.push(new Date(d));
      }
      setAvailableDates(dates);
      setEventStartDate(start);
      setEventEndDate(end);
      setSelectedAgendaDate(format(start, 'yyyy-MM-dd'));
    }
  }, [dataEvento, dataFimEvento]);

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
      // Só monta as datas se não vieram dos params
      if (!(dataEvento && dataFimEvento)) {
        setAvailableDates([]);
        setSelectedAgendaDate(null);
        setEventStartDate(null);
        setEventEndDate(null);
      }
      const eventResponse = await fetch(`${API_BASE}/eventos/${eventId}`);
      if (!eventResponse.ok) throw new Error('Falha ao buscar dados do evento');
      const eventData = await eventResponse.json();
      if (eventData.dataInicio && eventData.dataFim && !(dataEvento && dataFimEvento)) {
        setEventDates({ dataInicio: eventData.dataInicio, dataFim: eventData.dataFim });
        setSelectedDate(new Date(eventData.dataInicio._seconds * 1000));
        // Novo: gerar array de datas disponíveis
        const start = new Date(eventData.dataInicio._seconds * 1000);
        const end = new Date(eventData.dataFim._seconds * 1000);
        let dates = [];
        for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
          dates.push(new Date(d));
        }
        setAvailableDates(dates);
        setEventStartDate(start);
        setEventEndDate(end);
        setSelectedAgendaDate(format(start, 'yyyy-MM-dd'));
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

  // Função para buscar agenda com cache
  const fetchAgenda = useCallback(async (eventId, palcoId, trilhaId) => {
    const cacheKey = `${eventId}-${palcoId}-${trilhaId}`;
    if (agendaCache[cacheKey]) {
      setSessions(agendaCache[cacheKey]);
      return;
    }
    setIsLoadingLectures(true);
    try {
      const url = `${API_BASE}/programacao_evento/new/${eventId}/${palcoId}/${trilhaId}`;
      const response = await fetch(url);
      if (response.status === 404) {
        setSessions([]);
        setAgendaCache(prev => ({ ...prev, [cacheKey]: [] }));
        return;
      }
      if (!response.ok) throw new Error(`Erro ao buscar detalhes das palestras: ${response.status}`);
      const data = await response.json();
      const formattedSessions = data.palestras?.map((lecture) => {
        let speakers = (lecture.palestrantes || []).map((p) => ({
          id: p.id,
          name: p.nome_palestrante || '',
          avatar: p.foto_palestrante || '',
          role: p.cargo_palestrante && p.empresa_palestrante ? `${p.cargo_palestrante} @ ${p.empresa_palestrante}` : '',
          bio: p.minibio_palestrante || '',
          social: {
            linkedin: p.linkedin_palestrante || null,
            instagram: p.instagram_palestrante || null,
            facebook: p.facebook_palestrante || null
          },
          isModerator: false
        }));
        const m = lecture.moderador;
        const hasModerator = m && (m.nome_palestrante || m.foto_palestrante || m.id);
        if (hasModerator) {
          speakers = [
            {
              id: m.id || `mod-${lecture.id}`,
              name: m.nome_palestrante || 'Moderador',
              avatar: m.foto_palestrante || '',
              role: m.cargo_palestrante && m.empresa_palestrante ? `${m.cargo_palestrante} @ ${m.empresa_palestrante}` : '',
              bio: '',
              social: {
                linkedin: m.linkedin_palestrante || null,
                instagram: m.instagram_palestrante || null,
                facebook: m.facebook_palestrante || null
              },
              isModerator: true
            },
            ...speakers
          ];
        }
        return {
          id: lecture.id || Math.random().toString(36).substr(2, 9),
          lectureId: lecture.id,
          title: lecture.titulo_palestra,
          description: lecture.descricao_palestra,
          speakers,
          track: lecture.nometrilha,
          stage: lecture.nomepalco,
          location: lecture.local,
          duration: lecture.duracao?.minutes !== undefined ? `${lecture.duracao.minutes} min` : `${lecture.duracao.hours} h`,
          time: formatFirestoreDate(lecture.hora),
          type: lecture.tipo || 'Palestra',
          dataProgramacao: lecture.dataProgramacao || null,
        };
      }) || [];
      setSessions(formattedSessions);
      setAgendaCache(prev => ({ ...prev, [cacheKey]: formattedSessions }));
    } catch (err) {
      setError(err.message || 'Erro desconhecido');
    } finally {
      setIsLoadingLectures(false);
    }
  }, [agendaCache]);

  // useEffect para buscar agenda usando cache
  useEffect(() => {
    if (!eventId || !selectedTrack || !selectedStage) return;
    fetchAgenda(eventId, selectedStage, selectedTrack);
  }, [eventId, selectedTrack, selectedStage, fetchAgenda]);

  // Filtros e agrupamento
  const filteredSessions = searchQuery.trim() === ''
    ? sessions.filter((session) => {
        if (!selectedAgendaDate) return true;
        if (!session.dataProgramacao) return true;
        // session.dataProgramacao pode ser string ISO
        return session.dataProgramacao.slice(0, 10) === selectedAgendaDate;
      })
    : sessions.filter((session) => {
        if (!selectedAgendaDate) return (session.speakers?.length > 0 ? session.speakers[0].name : '').toLowerCase().includes(searchQuery.toLowerCase());
        if (!session.dataProgramacao) return (session.speakers?.length > 0 ? session.speakers[0].name : '').toLowerCase().includes(searchQuery.toLowerCase());
        return session.dataProgramacao.slice(0, 10) === selectedAgendaDate && (session.speakers?.length > 0 ? session.speakers[0].name : '').toLowerCase().includes(searchQuery.toLowerCase());
      });
  const timeSlots = filteredSessions.reduce((acc, session) => {
    const existingSlot = acc.find(slot => slot.time === session.time);
    if (existingSlot) existingSlot.sessions.push(session);
    else acc.push({ time: session.time || '', sessions: [session] });
    return acc;
  }, []).sort((a, b) => a.time.localeCompare(b.time));

  // Definir renderItem no escopo correto
  const renderItem = ({ item: slot }) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.timeSlot}>{slot.time}</Text>
      {slot.sessions.map((session, idx) => {
        // Novo: identificar moderador
        const moderator = session.speakers && session.speakers[0]?.isModerator ? session.speakers[0] : null;
        return (
          <View key={session.id + '-' + (session.dataProgramacao || '') + '-' + idx} style={styles.sessionCardRow}>
            {/* Infos do card */}
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={0.8}
              onPress={() => { setSelectedSession(session); setRating(0); }}
            >
              <View style={styles.sessionHeaderInfo}>
                <View style={styles.badgesRow}>
                  <View style={styles.badge}><Text style={styles.badgeText}>{session.stage}</Text></View>
                  <View style={styles.badge}><Text style={styles.badgeText}>{session.track}</Text></View>
                </View>
                <Text style={styles.sessionTitle}>
                  {session.type !== 'Palestra' ? session.type : session.title}
                </Text>
                <View style={{ height: 6 }} />
                <View style={styles.sessionInfoRow}>
                  <Ionicons name="time" size={16} color="#101828" style={{ marginRight: 4 }} />
                  <Text style={styles.sessionInfo}>{session.time} ({session.duration})</Text>
                </View>
                <View style={{ height: 6 }} />
                {moderator && moderator.name ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <Text style={{ fontWeight: 'bold', color: '#2563eb', fontSize: 13 }}>Moderador : </Text>
                    <Text style={{ color: '#101828', fontSize: 13 }}>{moderator.name}</Text>
                  </View>
                ) : null}
                <View style={styles.sessionInfoRow}>
                  <Ionicons name="location" size={16} color="#2563eb" style={{ marginRight: 4 }} />
                  <Text style={styles.sessionInfo}>{session.location}</Text>
                </View>
                {session.type !== 'Palestra' ? (
                  <Image
                    source={require('../../assets/almoco.png')}
                    style={styles.specialImage}
                    resizeMode="cover"
                  />
                ) : (
                  session.speakers && session.speakers.length > 0 ? (
                    <View style={styles.horizontalCarouselContainer}>
                      <FlatList
                        data={session.speakers}
                        keyExtractor={sp => sp.id?.toString() || Math.random().toString()}
                        showsHorizontalScrollIndicator={false}
                        style={styles.horizontalCarousel}
                        contentContainerStyle={{ alignItems: 'center' }}
                        horizontal
                        renderItem={({ item: speaker }) => {
                          let avatarStyle = [styles.avatar];
                          if (speaker.isModerator) {
                            avatarStyle.push(styles.avatarModerator);
                          }
                          return (
                            <View style={{ alignItems: 'center', marginRight: 12 }}>
                              {speaker.avatar ? (
                                <Image
                                  source={{ uri: speaker.avatar }}
                                  style={avatarStyle}
                                />
                              ) : (
                                <View style={styles.avatarPlaceholder}><Ionicons name="person" size={28} color="#888" /></View>
                              )}
                              <Text style={styles.speakerNameSmall} numberOfLines={1}>
                                {speaker.name?.split(' ')[0]}
                                {speaker.isModerator && speaker.name ? ' (Moderador)' : ''}
                              </Text>
                            </View>
                          );
                        }}
                      />
                    </View>
                  ) : (
                    <View style={styles.verticalCarouselContainer}>
                      <View style={[styles.avatarPlaceholder, { backgroundColor: '#f3f3f3', justifyContent: 'center', alignItems: 'center' }]}> 
                        <FontAwesome5 name="coffee" size={32} color="#bfa16a" />
                      </View>
                    </View>
                  )
                )}
              </View>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );

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
      {isFiltersOpen && (
        <View style={styles.filtersBox}>
          <TextInput
            style={styles.input}
            placeholder="Buscar palestrante..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {/* Filtro de trilha */}
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
      {/* Botões de data - sempre renderiza o container */}
      {(() => {
        let filteredDates = [];
        if (Array.isArray(availableDates) && availableDates.filter(Boolean).length > 0) {
          filteredDates = availableDates
            .filter((dateObj, idx, arr) => {
              if (!dateObj) return false;
              const dateStr = format(dateObj, 'yyyy-MM-dd');
              return arr.findIndex(d => d && format(d, 'yyyy-MM-dd') === dateStr) === idx;
            });
          // LOG: keys geradas
          const keys = filteredDates.map(dateObj => format(dateObj, 'yyyy-MM-dd'));
        }
        return (
          <View style={styles.datesScrollView}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.datesScrollViewContent}
            >
              {filteredDates.length > 0
                ? filteredDates.map((dateObj) => {
                    const dateStr = format(dateObj, 'yyyy-MM-dd');
                    return (
                      <TouchableOpacity
                        key={dateStr}
                        style={[
                          styles.dateButton,
                          selectedAgendaDate === dateStr && styles.dateButtonActive
                        ]}
                        onPress={() => setSelectedAgendaDate(dateStr)}
                      >
                        <Text style={[
                          styles.dateButtonText,
                          selectedAgendaDate === dateStr && styles.dateButtonTextActive
                        ]}>
                          {format(dateObj, 'dd/MM/yyyy')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                : (
                  <View style={[styles.dateButton, { opacity: 0.3 }]}> 
                    <Text style={styles.dateButtonText}>Data</Text>
                  </View>
                )
              }
            </ScrollView>
          </View>
        );
      })()}
      {/* Container dos botões de palco - sempre renderiza o container */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContentContainer}
        >
          {Array.isArray(stages) && stages.length > 0
            ? stages.map(stage => {
                return (
                  <TouchableOpacity
                    key={stage.id}
                    style={[styles.tab, selectedStage === stage.id && !showingMap ? styles.tabActive : null]}
                    onPress={() => { setShowingMap(false); setSelectedStage(stage.id); }}
                  >
                    <Text style={[styles.tabText, selectedStage === stage.id && !showingMap ? styles.tabTextActive : null]}>{stage.nomePalco}</Text>
                  </TouchableOpacity>
                );
              })
            : (
              <View style={[styles.tab, { opacity: 0.3 }]}> 
                <Text style={styles.tabText}>Palco</Text>
              </View>
            )
          }
          <TouchableOpacity
            style={[styles.tab, showingMap ? styles.tabActive : null]}
            onPress={() => setShowingMap(true)}
          >
            <Ionicons name="map" size={16} color={showingMap ? '#2563eb' : '#101828'} style={{ marginRight: 4 }} />
            <Text style={[styles.tabText, showingMap ? styles.tabTextActive : null]}>Mapa do Evento</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      {/* Lista de agenda */}
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
            keyExtractor={slot => {
              const sessionIds = slot.sessions.map(s => s.id).join('_');
              const key = `${slot.time}-${sessionIds}`;
              return key;
            }}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            renderItem={renderItem}
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
  const [selectedSpeakerIndex, setSelectedSpeakerIndex] = useState(0);

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
        {/* Lista de palestrantes */}
        {session.speakers && session.speakers.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Palestrantes</Text>
            {session.speakers.map((speaker, idx) => (
              <View key={speaker.id || idx} style={styles.speakerRow}>
                {speaker.avatar ? (
                  <Image source={{ uri: speaker.avatar }} style={styles.avatarLarge} />
                ) : (
                  <View style={styles.avatarLargePlaceholder}><Ionicons name="person" size={40} color="#888" /></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.speakerNameLarge}>{speaker.name}</Text>
                  <Text style={styles.speakerRole}>{speaker.role}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    {speaker.social?.linkedin && (
                      <TouchableOpacity onPress={() => openSocial(speaker.social.linkedin)}>
                        <AntDesign name="linkedin-square" size={24} color="#2563eb" />
                      </TouchableOpacity>
                    )}
                    {speaker.social?.instagram && (
                      <TouchableOpacity onPress={() => openSocial(speaker.social.instagram)}>
                        <AntDesign name="instagram" size={24} color="#d62976" />
                      </TouchableOpacity>
                    )}
                    {speaker.social?.facebook && (
                      <TouchableOpacity onPress={() => openSocial(speaker.social.facebook)}>
                        <AntDesign name="facebook-square" size={24} color="#1877f3" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
        <Text style={styles.sectionTitle}>Avaliação da Palestra</Text>
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
    height: 52,
    marginHorizontal: 16,
    marginTop: 8,
    flexDirection: 'row',
  },
  tabsContentContainer: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
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
    maxHeight: 44,
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
  verticalCarouselContainer: {
    width: 52,
    height: 156,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  verticalCarousel: {
    width: 52,
    height: 156,
  },
  sessionCardRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    alignItems: 'flex-start',
  },
  sessionHeaderInfo: {
    flex: 1,
    marginLeft: 8,
  },
  avatarSelected: {
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  avatarSelectedBlack: {
    borderWidth: 2,
    borderColor: '#101828',
  },
  horizontalCarouselContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
    minHeight: 70,
    maxHeight: 80,
  },
  horizontalCarousel: {
    flexGrow: 0,
    height: 70,
  },
  avatarModerator: {
    borderWidth: 3,
    borderColor: '#2563eb',
  },
  speakerNameSmall: {
    fontSize: 12,
    color: '#101828',
    fontWeight: 'bold',
    marginTop: 2,
    maxWidth: 60,
    textAlign: 'center',
  },
  filtersContainer: {
    backgroundColor: '#f3f7fd',
  },
  datesScrollView: {
    height: 52,
    marginHorizontal: 16,
    marginTop: 8,
  },
  datesScrollViewContent: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  dateButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#e3e7ee',
    minHeight: 36,
    maxHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  dateButtonText: {
    color: '#101828',
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
  },
  dateButtonTextActive: {
    color: '#fff',
  },
  specialImage: {
    width: '100%',
    height: 90,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 8,
    alignSelf: 'center',
  },
}); 