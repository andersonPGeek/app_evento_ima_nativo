import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { resetPasswordApi, verificarCodigoApi } from '../api';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('email'); // 'email' ou 'codigo'
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [codeError, setCodeError] = useState('');
  const [timer, setTimer] = useState(300); // 5 minutos em segundos
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    let interval = null;
    if (step === 'codigo' && timerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [step, timerActive, timer]);

  const handleSend = async () => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await resetPasswordApi(email);
      setMessage(res.data?.message || 'Código enviado para seu e-mail!');
      setStep('codigo');
      setTimer(300);
      setTimerActive(true);
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.msg || 'Erro ao enviar link de recuperação.');
    }
    setLoading(false);
  };

  const handleCodeChange = (value, idx) => {
    // Se o valor tem mais de 1 caractere, provavelmente é um código colado
    if (value.length > 1) {
      const codeDigits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newCode = ['', '', '', '', '', ''];
      codeDigits.forEach((digit, index) => {
        if (index < 6) newCode[index] = digit;
      });
      setCode(newCode);
      return;
    }
    
    // Validação para apenas números
    if (!/^[0-9]?$/.test(value)) return;
    
    const newCode = [...code];
    newCode[idx] = value;
    setCode(newCode);
    // Foco automático para o próximo campo
    if (value && idx < 5) {
      const nextInput = `codeInput${idx + 1}`;
      if (refs[nextInput]) refs[nextInput].focus();
    }
  };

  const refs = {};

  const handleVerifyCode = async () => {
    setCodeError('');
    const codigo = code.join('');
    if (codigo.length !== 6) {
      setCodeError('Digite os 6 números do código.');
      return;
    }
    setLoading(true);
    try {
      const response = await verificarCodigoApi(codigo);
      navigation.replace('CreatePassword', { 
        email,
        userId: response.data.id_usuario
      });
    } catch (err) {
      setCodeError(err.response?.data?.message || 'Código inválido ou expirado.');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await resetPasswordApi(email);
      setMessage('Novo código enviado para seu e-mail!');
      setCode(['', '', '', '', '', '']);
      setTimer(300);
      setTimerActive(true);
    } catch (err) {
      setError('Erro ao reenviar código.');
    }
    setLoading(false);
  };

  const formatTimer = (t) => {
    const m = String(Math.floor(t / 60)).padStart(2, '0');
    const s = String(t % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image source={require('../assets/logo.png')} style={styles.logo} />
        <Text style={styles.title}>Recuperar Senha</Text>
        {step === 'email' && (
          <>
            <Text style={styles.subtitle}>Digite seu email para receber o link de recuperação</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#888"
            />
            {message ? <Text style={styles.success}>{message}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.button} onPress={handleSend} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar link de recuperação</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkContainer}>
              <Text style={styles.link}>Voltar para o login</Text>
            </TouchableOpacity>
          </>
        )}
        {step === 'codigo' && (
          <>
            <Text style={styles.subtitle}>Digite o código de 6 números enviado para seu e-mail</Text>
            <Text style={styles.timer}>{formatTimer(timer)}</Text>
            <View style={styles.codeContainer}>
              {[0,1,2,3,4,5].map((idx) => (
                <TextInput
                  key={idx}
                  ref={ref => refs[`codeInput${idx}`] = ref}
                  style={[styles.codeInput, { color: '#101828' }]}
                  keyboardType="numeric"
                  maxLength={6}
                  value={code[idx]}
                  onChangeText={value => handleCodeChange(value, idx)}
                  returnKeyType="next"
                  textAlign="center"
                  placeholder="-"
                  placeholderTextColor="#888"
                />
              ))}
            </View>
            {codeError ? <Text style={styles.error}>{codeError}</Text> : null}
            {message ? <Text style={styles.success}>{message}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.button} onPress={handleVerifyCode} disabled={loading || timer === 0}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verificar código</Text>}
            </TouchableOpacity>
            {timer === 0 && (
              <TouchableOpacity onPress={handleResend} style={styles.linkContainer}>
                <Text style={styles.link}>Reenviar código</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkContainer}>
              <Text style={styles.link}>Voltar para o login</Text>
            </TouchableOpacity>
          </>
        )}
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
  timer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 12,
    marginTop: 4,
    letterSpacing: 2,
    alignSelf: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  codeInput: {
    width: 36,
    height: 44,
    borderWidth: 1,
    borderColor: '#e3e7ee',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    fontSize: 20,
    textAlign: 'center',
    marginHorizontal: 4,
  },
}); 