import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { resetPasswordApi, verificarCodigoApi, verificarEmailApi, verificarCpfApi } from '../api';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('email'); // 'email', 'cpf' ou 'codigo'
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [codeError, setCodeError] = useState('');
  const [timer, setTimer] = useState(300); // 5 minutos em segundos
  const [timerActive, setTimerActive] = useState(false);
  
  // Novos estados para verificação de CPF
  const [ultimosDigitosCPF, setUltimosDigitosCPF] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyingCPF, setVerifyingCPF] = useState(false);
  
  // Estados para controle de tentativas
  const [cpfAttempts, setCpfAttempts] = useState(0);
  const [maxAttempts] = useState(5);
  const [isBlocked, setIsBlocked] = useState(false);

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

  // Função para verificar o email primeiro
  const verifyEmail = async () => {
    setVerifyingEmail(true);
    setError('');
    
    try {
      const response = await verificarEmailApi(email);
      const data = response.data;
      
      if (data.success && data.existeNaBase) {
        // Salvar a role e userId do usuário
        setUserRole(data.role);
        setUserId(data.userId);
        
        // Verificar se é role que precisa de validação de CPF
        if (data.role === 'estande' || data.role === 'estandeAdmin') {
          // Ir para validação de CPF
          setStep('cpf');
        } else {
          // Para outras roles, ir direto para envio do código
          await handleSendCode();
        }
      } else {
        setError('E-mail não encontrado na base de dados.');
      }
    } catch (err) {
      setError('Erro ao verificar e-mail. Tente novamente.');
    } finally {
      setVerifyingEmail(false);
    }
  };

  // Função para verificar CPF
  const verifyCPF = async () => {
    // Verificar se está bloqueado
    if (isBlocked) {
      setCpfError('Limite de tentativas excedido. Entre em contato com a administração do evento.');
      return;
    }

    if (!ultimosDigitosCPF || ultimosDigitosCPF.length !== 3) {
      setCpfError('Digite os 3 últimos dígitos do CPF');
      return;
    }

    setVerifyingCPF(true);
    setCpfError('');
    
    try {
      const response = await verificarCpfApi(email, userRole, ultimosDigitosCPF);
      const data = response.data;
      
      if (data.success && data.encontrado) {
        // CPF válido, ir direto para tela de criar senha
        navigation.replace('CreatePassword', { 
          email,
          userId: userId // Usar o userId real que veio da verificarEmailApi
        });
      } else {
        // CPF inválido, incrementar tentativas
        const newAttempts = cpfAttempts + 1;
        setCpfAttempts(newAttempts);
        
        if (newAttempts >= maxAttempts) {
          setIsBlocked(true);
          setCpfError('Limite de tentativas excedido. Entre em contato com a administração do evento.');
        } else {
          const remainingAttempts = maxAttempts - newAttempts;
          setCpfError(`CPF não confere com os dados cadastrados. Restam ${remainingAttempts} tentativa(s).`);
        }
      }
    } catch (err) {
      // Erro de conexão também conta como tentativa
      const newAttempts = cpfAttempts + 1;
      setCpfAttempts(newAttempts);
      
      if (newAttempts >= maxAttempts) {
        setIsBlocked(true);
        setCpfError('Limite de tentativas excedido. Entre em contato com a administração do evento.');
      } else {
        const remainingAttempts = maxAttempts - newAttempts;
        setCpfError(`Erro ao verificar CPF. Restam ${remainingAttempts} tentativa(s).`);
      }
    } finally {
      setVerifyingCPF(false);
    }
  };

  // Função original para enviar código (renomeada)
  const handleSendCode = async () => {
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

  // Função principal que gerencia o fluxo
  const handleSend = async () => {
    if (step === 'email') {
      await verifyEmail();
    } else if (step === 'cpf') {
      await verifyCPF();
    }
  };

  // Função para tratar entrada dos dígitos do CPF
  const handleCPFChange = (value) => {
    // Permitir apenas números e máximo 3 dígitos
    const numericValue = value.replace(/\D/g, '').slice(0, 3);
    setUltimosDigitosCPF(numericValue);
    setCpfError(''); // Limpar erro ao digitar
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
            <Text style={styles.subtitle}>Digite seu email cadastrado</Text>
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
            <TouchableOpacity style={styles.button} onPress={handleSend} disabled={verifyingEmail}>
              {verifyingEmail ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Próximo</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkContainer}>
              <Text style={styles.link}>Voltar para o login</Text>
            </TouchableOpacity>
          </>
        )}
        {step === 'cpf' && (
          <>
            <Text style={styles.subtitle}>Digite os 3 últimos dígitos do seu CPF</Text>
            <Text style={styles.emailInfo}>E-mail: {email}</Text>
            
            {!isBlocked && (
              <Text style={styles.attemptsInfo}>
                Tentativas restantes: {maxAttempts - cpfAttempts}
              </Text>
            )}
            
            <TextInput
              style={[styles.input, isBlocked && styles.inputDisabled]}
              placeholder="000"
              value={ultimosDigitosCPF}
              onChangeText={handleCPFChange}
              keyboardType="numeric"
              maxLength={3}
              placeholderTextColor="#888"
              editable={!isBlocked}
            />
            {cpfError ? <Text style={styles.error}>{cpfError}</Text> : null}
            {message ? <Text style={styles.success}>{message}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            
            {isBlocked ? (
              <View style={styles.blockedContainer}>
                <Text style={styles.blockedText}>
                  Muitas tentativas incorretas. Entre em contato com a administração do evento para recuperar sua senha.
                </Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.button} 
                onPress={handleSend} 
                disabled={verifyingCPF || loading}
              >
                {(verifyingCPF || loading) ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verificar CPF</Text>
                )}
              </TouchableOpacity>
            )}
            
            <TouchableOpacity onPress={() => setStep('email')} style={styles.linkContainer}>
              <Text style={styles.link}>Voltar</Text>
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
  emailInfo: {
    fontSize: 14,
    color: '#2563eb',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  attemptsInfo: {
    fontSize: 12,
    color: '#f59e0b',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
  blockedContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  blockedText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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