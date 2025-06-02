import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { criarSenhaApi } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function CreatePasswordScreen({ route, navigation }) {
  const { userId, email, token } = route.params;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login } = useAuth();

  const handleCreatePassword = async () => {
    setError('');
    setSuccess('');
    if (!password || !confirmPassword) {
      setError('Preencha todos os campos.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve conter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const res = await criarSenhaApi(userId, password);
      setSuccess(res.data?.message || 'Senha criada com sucesso!');
      setTimeout(async () => {
        const result = await login(email, password);
        if (result.success && result.user) {
          navigation.replace('Main');
        } else {
          navigation.navigate('Login', { email });
        }
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar senha.');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image source={require('../assets/logo.png')} style={styles.logo} />
        <Text style={styles.title}>Criar Nova Senha</Text>
        <Text style={styles.subtitle}>Digite sua nova senha e confirme</Text>
        <TextInput
          style={styles.input}
          placeholder="Nova Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirme a Senha"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={handleCreatePassword} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Criar Senha</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkContainer}>
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