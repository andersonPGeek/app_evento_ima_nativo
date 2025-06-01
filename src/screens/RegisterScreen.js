import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { getEmpresaByUserApi } from '../api';

const API_BASE = 'https://events-br-ima.onrender.com/api';

// Função para formatar CPF
const formatCPF = (cpf) => {
  // Remove todos os caracteres não numéricos
  const numbers = cpf.replace(/\D/g, '');
  
  // Aplica a máscara
  if (numbers.length <= 3) {
    return numbers;
  } else if (numbers.length <= 6) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  } else if (numbers.length <= 9) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  } else {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  }
};

// Função para validar CPF
const validateCPF = (cpf) => {
  // Remove caracteres não numéricos
  const numbers = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (numbers.length !== 11) {
    return false;
  }

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(numbers)) {
    return false;
  }

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers.charAt(i)) * (10 - i);
  }
  let rest = 11 - (sum % 11);
  let digit1 = rest > 9 ? 0 : rest;

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers.charAt(i)) * (11 - i);
  }
  rest = 11 - (sum % 11);
  let digit2 = rest > 9 ? 0 : rest;

  return digit1 === parseInt(numbers.charAt(9)) && digit2 === parseInt(numbers.charAt(10));
};

export default function RegisterScreen() {
  const { user, token } = useAuth();
  const [formData, setFormData] = useState({ Nome: '', CPF: '', Telefone: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (name, value) => {
    if (name === 'CPF') {
      // Formata o CPF enquanto digita
      const formattedCPF = formatCPF(value);
      setFormData(prev => ({ ...prev, [name]: formattedCPF }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    // Valida o CPF antes de enviar
    if (!validateCPF(formData.CPF)) {
      setError('CPF inválido');
      setLoading(false);
      return;
    }

    try {
      // Remove formatação do CPF antes de enviar
      const cpfNumbers = formData.CPF.replace(/\D/g, '');
      
      // 1. Cadastrar usuário
      const res = await fetch(`${API_BASE}/usuarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          CPF: cpfNumbers, // Envia apenas números
          Role: 'estande',
          CEP: '',
          Numero: '',
          Logradouro: '',
          Bairro: '',
          Cidade: '',
          Estado: '',
          Pontuacao: 0,
          senha: formData.email
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao cadastrar usuário');
      }
      const userData = await res.json();
      // 2. Buscar companyId do estande logado
      const empresaRes = await getEmpresaByUserApi(user.id, token);
      const companyId = empresaRes?.data?.data?.ID_empresa;
      if (!companyId) throw new Error('ID da empresa não encontrado');
      // 3. Vincular usuário à empresa
      const res2 = await fetch(`${API_BASE}/empresas/vincular-usuario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_usuario: userData.id,
          id_empresa: companyId,
        })
      });
      if (!res2.ok) {
        const errorData = await res2.json();
        throw new Error(errorData.message || 'Erro ao vincular usuário à empresa');
      }
      setSuccess('Usuário cadastrado e vinculado com sucesso!');
      setFormData({ Nome: '', CPF: '', Telefone: '', email: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar o cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f7fd' }} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.header}>Cadastro de Usuário</Text>
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
          {success ? <View style={styles.successBox}><Text style={styles.successText}>{success}</Text></View> : null}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nome</Text>
            <TextInput style={styles.input} value={formData.Nome} onChangeText={v => handleChange('Nome', v)} placeholder="" autoCapitalize="words" />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>CPF</Text>
            <TextInput style={styles.input} value={formData.CPF} onChangeText={v => handleChange('CPF', v)} placeholder="" keyboardType="numeric" maxLength={14} />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Telefone</Text>
            <TextInput style={styles.input} value={formData.Telefone} onChangeText={v => handleChange('Telefone', v)} placeholder="" keyboardType="phone-pad" />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={formData.email} onChangeText={v => handleChange('email', v)} placeholder="" keyboardType="email-address" autoCapitalize="none" />
          </View>
          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Cadastrar</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 12 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#101828', marginBottom: 16, marginTop: 8 },
  formGroup: { marginBottom: 12 },
  label: { fontSize: 15, color: '#101828', marginBottom: 4, fontWeight: '500' },
  input: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e3e7ee', paddingHorizontal: 12, height: 44, fontSize: 15 },
  button: { backgroundColor: '#101828', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  errorBox: { backgroundColor: '#fee2e2', borderColor: '#fca5a5', borderWidth: 1, borderRadius: 8, marginBottom: 12, padding: 10 },
  errorText: { color: '#b91c1c', fontWeight: 'bold', textAlign: 'center' },
  successBox: { backgroundColor: '#d1fae5', borderColor: '#34d399', borderWidth: 1, borderRadius: 8, marginBottom: 12, padding: 10 },
  successText: { color: '#166534', fontWeight: 'bold', textAlign: 'center' },
}); 