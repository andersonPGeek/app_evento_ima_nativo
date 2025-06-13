import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, FlatList, ScrollView, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
import telefoneIcon from '../../assets/telefone.png';
import websiteIcon from '../../assets/website.png';
import whatsappIcon from '../../assets/whatsapp.png';

const API_BASE = 'https://events-br-ima.onrender.com/api';

export default function SponsorShowcaseScreen() {
  const { user, token } = useAuth();
  const userId = user?.id;
  const [categorias, setCategorias] = useState(['all']);
  const [sponsorsList, setSponsorsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkedInCompanies, setCheckedInCompanies] = useState({});
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState('all');
  const dataFetchedRef = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      if (dataFetchedRef.current) return;
      dataFetchedRef.current = true;
      setLoading(true);
      try {
        // Buscar check-ins do usuário
        if (userId) {
          const checkinsResponse = await fetch(`${API_BASE}/usuarios-empresas/usuario/${userId}`);
          if (checkinsResponse.ok) {
            const checkinsData = await checkinsResponse.json();
            const checkinsMap = checkinsData.reduce((acc, curr) => {
              acc[curr.ID_empresa] = curr.id;
              return acc;
            }, {});
            setCheckedInCompanies(checkinsMap);
          }
        }
        // Buscar categorias
        const categoriasResponse = await fetch(`${API_BASE}/categorias-patrocinio`);
        if (!categoriasResponse.ok) throw new Error('Erro ao buscar categorias');
        const categoriasData = await categoriasResponse.json();
        const tiposPatrocinio = ['all', ...categoriasData.map(cat => cat.Tipo)];
        setCategorias(tiposPatrocinio);
        // Buscar empresas
        const empresasResponse = await fetch(`${API_BASE}/empresas`);
        if (!empresasResponse.ok) throw new Error('Erro ao buscar empresas');
        const empresasData = await empresasResponse.json();
        const mappedSponsors = empresasData.map(empresa => ({
          id: empresa.id,
          name: empresa.nomeEmpresa,
          tier: empresa.categoriaPatrocinio,
          logo: empresa.logo,
          description: empresa.descricao || '',
          website: empresa.site_web || '',
          telefone: empresa.telefone || '',
          contatoComercial: empresa.contato_comercial || '',
          whatsapp: empresa.site || '',
        }));
        setSponsorsList(mappedSponsors);
      } catch (err) {
        setError(err.message || 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const handleFavoriteChange = async (empresaId, isFavorite, checkInId) => {
    setCheckedInCompanies(prev => {
      const newState = { ...prev };
      if (isFavorite && checkInId) {
        newState[empresaId] = checkInId;
      } else {
        delete newState[empresaId];
      }
      return newState;
    });
  };

  const handleFavoriteClick = async (sponsor) => {
    if (!userId) return;
    const isFavorite = !!checkedInCompanies[sponsor.id];
    if (isFavorite) {
      // Remover dos favoritos
      const checkInId = checkedInCompanies[sponsor.id];
      await fetch(`${API_BASE}/usuarios-empresas/${checkInId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      handleFavoriteChange(sponsor.id, false, '');
    } else {
      // Adicionar aos favoritos
      const res = await fetch(`${API_BASE}/usuarios_empresas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ID_empresa: sponsor.id, ID_usuario: userId }),
      });
      if (res.ok) {
        const data = await res.json();
        handleFavoriteChange(sponsor.id, true, data.id);
      }
    }
  };

  if (error) {
    return <SafeAreaViewContext style={styles.center} edges={['top']}><Text style={{ color: 'red' }}>{error}</Text></SafeAreaViewContext>;
  }
  if (loading) {
    return <SafeAreaViewContext style={styles.center} edges={['top']}><ActivityIndicator size="large" /><Text>Carregando...</Text></SafeAreaViewContext>;
  }

  // Filtro de categorias e favoritos
  const filteredSponsors = sponsorsList.filter(sponsor =>
    (selectedCategoria === 'all' ? true : sponsor.tier === selectedCategoria) &&
    (showOnlyFavorites ? checkedInCompanies[sponsor.id] : true)
  );

  return (
    <SafeAreaViewContext style={{ flex: 1, backgroundColor: '#f3f7fd' }} edges={['top']}>
      <Text style={styles.header}>Expositores</Text>
      <View style={styles.favRow}>
        <TouchableOpacity
          style={[styles.favButton, showOnlyFavorites && styles.favButtonActive]}
          onPress={() => setShowOnlyFavorites(v => !v)}
        >
          <AntDesign name="heart" size={18} color={showOnlyFavorites ? '#fff' : '#e11d48'} style={{ marginRight: 6 }} />
          <Text style={[styles.favButtonText, showOnlyFavorites && { color: '#fff' }]}>{showOnlyFavorites ? 'Mostrar Todos' : 'Mostrar Favoritos'}</Text>
        </TouchableOpacity>
      </View>
      {/* Barra de categorias rolável horizontalmente */}
      <View style={styles.categoriasContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriasRow} contentContainerStyle={{ paddingHorizontal: 8, marginBottom: 4 }}>
          {categorias.map(categoria => (
            <TouchableOpacity
              key={categoria}
              style={[styles.categoriaTab, selectedCategoria === categoria && styles.categoriaTabActive]}
              onPress={() => setSelectedCategoria(categoria)}
            >
              <Text style={[styles.categoriaTabText, selectedCategoria === categoria && styles.categoriaTabTextActive]}>{categoria}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {/* Listagem de expositores */}
      <FlatList
        data={filteredSponsors}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 350, paddingTop: 16 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32 }}>Nenhum expositor encontrado</Text>}
        renderItem={({ item }) => (
          <SponsorCard
            sponsor={item}
            isFavorite={!!checkedInCompanies[item.id]}
            checkInId={checkedInCompanies[item.id]}
            userId={userId}
            token={token}
            onFavoriteChange={handleFavoriteChange}
          />
        )}
      />
    </SafeAreaViewContext>
  );
}

function SponsorCard({ sponsor, isFavorite, checkInId, userId, token, onFavoriteChange }) {
  const [isFav, setIsFav] = useState(isFavorite);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setIsFav(isFavorite);
  }, [isFavorite]);

  const handleFavoriteClick = async () => {
    if (isProcessing || !userId) return;
    
    setIsAnimating(true);
    setIsProcessing(true);
    
    try {
      if (isFav) {
        // Remover dos favoritos
        const response = await fetch(`${API_BASE}/usuarios-empresas/${checkInId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Erro ao remover favorito');
        setIsFav(false);
        onFavoriteChange?.(sponsor.id, false, '');
      } else {
        // Adicionar aos favoritos
        const response = await fetch(`${API_BASE}/usuarios-empresas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ ID_empresa: sponsor.id, ID_usuario: userId }),
        });
        if (!response.ok) throw new Error('Erro ao adicionar favorito');
        const data = await response.json();
        setIsFav(true);
        onFavoriteChange?.(sponsor.id, true, data.id);
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      // Em caso de erro, mantém o estado anterior
      setIsFav(!isFav);
      onFavoriteChange?.(sponsor.id, !isFav, '');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setIsAnimating(false), 200);
    }
  };

  // Função para abrir o discador
  const handlePhonePress = () => {
    if (sponsor.telefone) {
      Linking.openURL(`tel:${sponsor.telefone}`);
    }
  };

  // Função para abrir o site
  const handleWebsitePress = () => {
    if (sponsor.website) {
      Linking.openURL(sponsor.website.startsWith('http') ? sponsor.website : `https://${sponsor.website}`);
    }
  };

  // Função para abrir o whatsapp (usando o campo já existente)
  const handleWhatsappPress = () => {
    if (sponsor.whatsapp) {
      try {
        // Extrair o número do telefone da URL
        const match = sponsor.whatsapp.match(/wa\.me\/(\d+)/);
        if (match && match[1]) {
          const numero = match[1];
          // Criar URL usando o formato whatsapp://send
          const whatsappUrl = `whatsapp://send?phone=${numero}&text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20seu%20serviço!%20vim%20do%20evento%20da%20Iima!`;
          console.log("Whatsapp URL", whatsappUrl);
          Linking.openURL(whatsappUrl);
        } else {
          console.error("Formato de URL do WhatsApp inválido");
        }
      } catch (error) {
        console.error("Erro ao processar URL do WhatsApp:", error);
      }
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <TouchableOpacity onPress={handleFavoriteClick} disabled={isProcessing} style={{ opacity: isProcessing ? 0.6 : 1 }}>
          <AntDesign
            name="heart"
            size={24}
            color={isFav ? '#e11d48' : '#e5e7eb'}
            style={[{ marginRight: 8 }, isAnimating && { transform: [{ scale: 0.9 }] }]}
          />
        </TouchableOpacity>
        <Image source={{ uri: sponsor.logo }} style={styles.logo} />
        <View style={styles.badge}><Text style={styles.badgeText}>{sponsor.tier}</Text></View>
      </View>
      <Text style={styles.cardTitle}>{sponsor.name}</Text>
      {sponsor.contatoComercial ? (
        <View style={styles.contatoComercialContainer}>
          <Text style={styles.contatoComercialLabel}>Comercial: </Text>
          <Text style={styles.contatoComercialText}>{sponsor.contatoComercial}</Text>
        </View>
      ) : null}
      {/* Descrição abaixo da categoria, se existir */}
      {sponsor.description ? (
        <Text style={styles.cardDesc}>{sponsor.description}</Text>
      ) : null}
      {/* Botões de contato */}
      <View style={styles.contactButtonsRow}>
        <TouchableOpacity style={styles.contactButton} onPress={handlePhonePress} disabled={!sponsor.telefone}>
          <Image source={telefoneIcon} style={styles.contactIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactButton} onPress={handleWebsitePress} disabled={!sponsor.website}>
          <Image source={websiteIcon} style={styles.contactIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactButton} onPress={handleWhatsappPress} disabled={!sponsor.whatsapp}>
          <Image source={whatsappIcon} style={styles.contactIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f7fd' },
  header: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 16, marginBottom: 16, color: '#101828' },
  favRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginRight: 16, marginBottom: 8 },
  favButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  favButtonActive: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  favButtonText: { color: '#e11d48', fontWeight: 'bold' },
  categoriasContainer: {
    backgroundColor: '#f3f7fd',
    paddingVertical: 8,
    marginBottom: 8,
    zIndex: 1,
  },
  categoriasRow: { 
    flexDirection: 'row',
  },
  categoriaTab: {
    backgroundColor: '#f3f7fd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 0,
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 64,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriaTabActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  categoriaTabText: { color: '#101828', fontWeight: 'bold', fontSize: 13, textTransform: 'uppercase' },
  categoriaTabTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 20, padding: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  logo: { width: 48, height: 48, borderRadius: 8, marginRight: 8, backgroundColor: '#eee' },
  badge: { backgroundColor: '#f3f7fd', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 'auto' },
  badgeText: { color: '#2563eb', fontSize: 12, fontWeight: 'bold' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#101828', marginBottom: 2 },
  cardDesc: { fontSize: 14, color: '#3a4a5c', marginBottom: 8 },
  contactButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  contactButton: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f7fd', borderRadius: 8, height: 44, marginHorizontal: 4 },
  contactIcon: { width: 28, height: 28, resizeMode: 'contain' },
  contatoComercialContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  contatoComercialLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#101828',
  },
  contatoComercialText: {
    fontSize: 14,
    color: '#3a4a5c',
  },
}); 