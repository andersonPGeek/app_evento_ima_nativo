import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen({ navigation, route }) {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (route?.params?.email) setEmail(route.params.email);
    if (route?.params?.senha) setSenha(route.params.senha);
  }, [route?.params]);

  const handleLogin = async () => {
    setError('');
    if (email && senha && email === senha) {
      const result = await login(email, senha);
      if (result.success && result.mustChangePassword && result.user && result.token) {
        navigation.replace('CreatePassword', { userId: result.user.id, email, token: result.token });
        return;
      } else if (result.success && result.user) {
        navigation.replace('CreatePassword', { userId: result.user.id, email });
        return;
      } else if (result.error === 'sync_required') {
        navigation.navigate('SyncSympla', { email });
        return;
      } else {
        setError(result.error || 'Erro ao autenticar para criar senha.');
        return;
      }
    }

    const result = await login(email, senha);
    if (!result.success) {
      if (result.error === 'sync_required') {
        navigation.navigate('SyncSympla', { email });
        return;
      }
      setError(result.error);
      return;
    }

    // Redirecionamento por role
    if (result.user?.Role === 'estande' || result.user?.Role === 'estandeAdmin') {
      navigation.replace('Main');
    } else if (result.user?.Role === 'user') {
      // Futuramente: navigation.replace('EventosWebView');
      setError('Usuário autenticado, mas navegação para user ainda não implementada.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image source={require('../assets/logo.png')} style={styles.logo} />
        <Text style={styles.title}>Bem-vindo</Text>
        <Text style={styles.subtitle}>Faça login para acessar o evento</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputPassword}
            placeholder="Senha"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.eye}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.linkContainer}>
          <Text style={styles.link}>Esqueceu sua senha?</Text>
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#e3e7ee',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    marginBottom: 12,
  },
  inputPassword: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
  },
  eye: {
    fontSize: 18,
    paddingHorizontal: 10,
    color: '#888',
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
}); 