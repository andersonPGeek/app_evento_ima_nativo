import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Linking } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { verificarEmailApi } from '../api';

export default function LoginScreen({ navigation, route }) {
  const { login, loading, setShowBanner, setBannerLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  useEffect(() => {
    if (route?.params?.email) setEmail(route.params.email);
    if (route?.params?.senha) setSenha(route.params.senha);
  }, [route?.params]);

  const verifyEmail = async (email) => {
    try {
      setVerifyingEmail(true);
      setError('');
      
      const response = await verificarEmailApi(email);
      const data = response.data;
      
      if (data.success) {
        if (!data.existeNaBase) {
          // Usuário não existe na base - ir para SyncSympla
          navigation.navigate('SyncSympla', { email });
        } else if (data.primeiroLogin) {
          // Usuário existe mas é primeiro login - ir para CreatePassword
          navigation.replace('CreatePassword', { email, userId: data.userId });
        } else {
          // Usuário existe e não é primeiro login - mostrar campo senha
          setShowPasswordField(true);
        }
      } else {
        setError('Erro ao verificar e-mail. Tente novamente.');
      }
    } catch (err) {
      setError('Erro de conexão. Verifique sua internet.');
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleNextOrLogin = async () => {
    if (!email.trim()) {
      setError('Digite um e-mail válido');
      return;
    }

    if (!showPasswordField) {
      // Primeira etapa - verificar e-mail
      await verifyEmail(email.trim());
    } else {
      // Segunda etapa - fazer login com senha
      await handleLogin();
    }
  };

  const handleLogin = async () => {
    setError('');
    
    if (!senha.trim()) {
      setError('Digite sua senha');
        return;
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
      setBannerLoading(true); // Ativar loading do banner
      setShowBanner(true);
      setTimeout(() => {
      navigation.replace('Main');
      }, 100);
    } else if (result.user?.Role === 'user') {
      setBannerLoading(true); // Ativar loading do banner
      setShowBanner(true);
      setTimeout(() => {
      navigation.replace('Main', { screen: 'Eventos' });
      }, 100);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image source={require('../assets/logo.png')} style={styles.logo} />
        <Text style={styles.title}>Bem-vindo</Text>
        <Text style={styles.subtitle}>Digite o e-mail utilizado na compra do ingresso na Sympla</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#888"
        />
        
        {showPasswordField && (
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.inputPassword, { color: '#101828' }]}
            placeholder="Senha"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry={!showPassword}
            placeholderTextColor="#888"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.eye}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>
        )}
        
        {error ? <Text style={styles.error}>{error}</Text> : null}
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleNextOrLogin} 
          disabled={loading || verifyingEmail}
        >
          {loading || verifyingEmail ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {showPasswordField ? 'Entrar' : 'Próximo'}
            </Text>
          )}
        </TouchableOpacity>
        
        {showPasswordField && (
          <TouchableOpacity 
            onPress={() => navigation.navigate('ForgotPassword')} 
            style={styles.linkContainer}
          >
          <Text style={styles.link}>Esqueceu sua senha?</Text>
        </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={styles.helpButton}
        onPress={() => Linking.openURL('https://chatgpt.com/g/g-68715dfbd0e08191a6a9f22baf2b3a0b-atendente-app-iima-eventos')}
        activeOpacity={0.8}
      >
        <Image
          source={require('../../assets/atendente.png')}
          style={styles.helpImage}
        />
        <Text style={styles.helpText}>Posso te ajudar?</Text>
      </TouchableOpacity>
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
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    backgroundColor: '#101828', // preto do app
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    elevation: 2,
  },
  helpImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  helpText: {
    fontSize: 16,
    color: '#fff', // branco
    fontWeight: 'bold',
  },
}); 