import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { resetPasswordApi } from '../api';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSend = async () => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await resetPasswordApi(email);
      setMessage(res.data?.message || 'Link de recuperação enviado para seu e-mail!');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao enviar link de recuperação.');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image source={require('../assets/logo.png')} style={styles.logo} />
        <Text style={styles.title}>Recuperar Senha</Text>
        <Text style={styles.subtitle}>Digite seu email para receber o link de recuperação</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={handleSend} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar link de recuperação</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkContainer}>
          <Text style={styles.link}>Voltar para o login</Text>
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
  logo: {
    width: 64,
    height: 64,
    marginBottom: 16,
    resizeMode: 'contain',
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
    textAlign: 'center',
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
  linkContainer: {
    marginTop: 16,
  },
  link: {
    color: '#2563eb',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  error: {
    color: 'red',
    marginBottom: 8,
    textAlign: 'center',
  },
  success: {
    color: 'green',
    marginBottom: 8,
    textAlign: 'center',
  },
}); 