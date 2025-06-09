import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loginApi,
} from '../api';
import Toast from 'react-native-toast-message';

const API_BASE = 'https://events-br-ima.onrender.com/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [syncedEmails, setSyncedEmails] = useState(new Set());

  useEffect(() => {
    const loadStorage = async () => {
      try {
        setError(null);
        const storedToken = await AsyncStorage.getItem('token');
        const storedRole = await AsyncStorage.getItem('role');
        const storedUserId = await AsyncStorage.getItem('userId');
        const storedEmail = await AsyncStorage.getItem('userEmail');
        const storedTicket = await AsyncStorage.getItem('ticket');
        const storedSyncedEmails = await AsyncStorage.getItem('syncedEmails');
        
        if (storedToken && storedRole && storedUserId) {
          setToken(storedToken);
          setRole(storedRole);
          setTicket(storedTicket);
          setUser({ 
            id: storedUserId, 
            Role: storedRole,
            email: storedEmail,
            ticket: storedTicket
          });
        } else {
          await AsyncStorage.clear();
        }

        if (storedSyncedEmails) {
          setSyncedEmails(new Set(JSON.parse(storedSyncedEmails)));
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

  const syncWithSympla = async (email) => {
    try {
      // Login com usuário administrativo
      const adminLogin = await loginApi('ketherinyday@hotmail.com', '123456');
      const adminToken = adminLogin.data.token;

      // Chamar API de sincronização
      const response = await fetch(`${API_BASE}/sympla/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha na sincronização');
      }

      // Adicionar email à lista de sincronizados
      const newSyncedEmails = new Set(syncedEmails).add(email);
      setSyncedEmails(newSyncedEmails);
      await AsyncStorage.setItem('syncedEmails', JSON.stringify([...newSyncedEmails]));

      return true;
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return false;
    }
  };

  const login = async (email, senha) => {
    setLoading(true);
    setError(null);
    try {
      const response = await loginApi(email, senha);
      
      // Se chegou aqui, o login foi bem sucedido
      const { user, token } = response.data;
      if (!user || !token) {
        throw new Error('Dados de login inválidos');
      }

      // Se for primeiro acesso (email = senha), não setar user ainda
      if (email === senha) {
        setLoading(false);
        return { success: true, user: { ...user, email }, token, mustChangePassword: true };
      }

      // Login normal
      setUser({ ...user, email });
      setToken(token);
      setRole(user.Role);
      setTicket(user.Ticket);
      
      await Promise.all([
        AsyncStorage.setItem('token', token),
        AsyncStorage.setItem('role', user.Role),
        AsyncStorage.setItem('userId', user.id),
        AsyncStorage.setItem('userEmail', email),
        AsyncStorage.setItem('ticket', user.Ticket)
      ]);

      setLoading(false);
      return { success: true, user: { ...user, email } };

    } catch (error) {
      // Se o login falhou e é primeiro acesso (email = senha)
      if (email === senha && !syncedEmails.has(email)) {
        setLoading(false);
        return { 
          success: false, 
          error: 'sync_required',
          email: email
        };
      }

      // Se não é primeiro acesso ou já tentou sincronizar
      setLoading(false);
      return { 
        success: false, 
        error: 'Usuário ou senha inválidos' 
      };
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      setToken(null);
      setRole(null);
      setTicket(null);
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
      ticket,
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