import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loginApi,
} from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStorage = async () => {
      try {
        setError(null);
        const storedToken = await AsyncStorage.getItem('token');
        const storedRole = await AsyncStorage.getItem('role');
        const storedUserId = await AsyncStorage.getItem('userId');
        const storedEmail = await AsyncStorage.getItem('userEmail');
        
        if (storedToken && storedRole && storedUserId) {
          setToken(storedToken);
          setRole(storedRole);
          setUser({ 
            id: storedUserId, 
            Role: storedRole,
            email: storedEmail 
          });
        } else {
          // Se não encontrar dados válidos, limpa o storage
          await AsyncStorage.clear();
        }
      } catch (e) {
        setError('Erro ao carregar dados do dispositivo');
        console.error('Erro ao carregar storage:', e);
      } finally {
        setInitializing(false);
      }
    };
    loadStorage();
  }, []);

  const login = async (email, senha) => {
    setLoading(true);
    setError(null);
    try {
      const response = await loginApi(email, senha);
      const { user, token } = response.data;
      
      // Validação dos dados
      if (!user || !token) {
        throw new Error('Dados de login inválidos');
      }

      // Se o e-mail e senha são iguais, não define o usuário no contexto
      if (email === senha) {
        setLoading(false);
        return { success: true, user: { ...user, email } };
      }

      setUser({ ...user, email });
      setToken(token);
      setRole(user.Role);
      
      // Salva no AsyncStorage
      await Promise.all([
        AsyncStorage.setItem('token', token),
        AsyncStorage.setItem('role', user.Role),
        AsyncStorage.setItem('userId', user.id),
        AsyncStorage.setItem('userEmail', email)
      ]);

      setLoading(false);
      return { success: true, user: { ...user, email } };
    } catch (error) {
      setLoading(false);
      let msg = 'Usuário ou senha inválidos';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      setToken(null);
      setRole(null);
      setError(null);
      await AsyncStorage.clear();
    } catch (e) {
      console.error('Erro ao fazer logout:', e);
      setError('Erro ao fazer logout');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      role, 
      loading, 
      initializing, 
      error,
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 