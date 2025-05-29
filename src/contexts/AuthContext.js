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

  useEffect(() => {
    // Recupera token e role do AsyncStorage ao iniciar o app
    const loadStorage = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedRole = await AsyncStorage.getItem('role');
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedToken && storedRole && storedUserId) {
          setToken(storedToken);
          setRole(storedRole);
          setUser({ id: storedUserId, Role: storedRole });
        }
      } catch (e) {}
      setInitializing(false);
    };
    loadStorage();
  }, []);

  const login = async (email, senha) => {
    setLoading(true);
    try {
      const response = await loginApi(email, senha);
      const { user, token } = response.data;
      setUser(user);
      setToken(token);
      setRole(user.Role);
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('role', user.Role);
      await AsyncStorage.setItem('userId', user.id);
      setLoading(false);
      return { success: true, user };
    } catch (error) {
      setLoading(false);
      let msg = 'Erro ao fazer login';
      if (error.response?.data?.message) msg = error.response.data.message;
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setRole(null);
    await AsyncStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, token, role, loading, initializing, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 