import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../contexts/AuthContext';

export default function TicketScreen() {
  const { ticket } = useAuth();

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Nenhum ticket encontrado</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Seu Ingresso</Text>
      <Text style={styles.subtitle}>Apresente este QR Code na entrada do evento</Text>
      <View style={styles.qrContainer}>
        <QRCode
          value={ticket}
          size={250}
          backgroundColor="white"
          color="black"
        />
      </View>
      <Text style={styles.ticketText}>{ticket}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f7fd',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#101828',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#3a4a5c',
    marginBottom: 32,
    textAlign: 'center',
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ticketText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#b91c1c',
    textAlign: 'center',
    marginTop: 32,
  },
}); 