import axios from 'axios';

const API_BASE = 'https://events-br-ima.onrender.com/api';
const API_BASE_APP = 'https://app-eventos-ima.vercel.app';

export const loginApi = async (email, senha) => {
  return axios.post(`${API_BASE}/auth/login`, { Email: email, senha });
};

export const resetPasswordApi = async (email) => {
  return axios.post(`${API_BASE}/auth/reset-password`, { email });
};

export const criarSenhaApi = async (userId, password) => {
  return axios.post(`${API_BASE}/auth/criar-senha`, { id_usuario: userId, senha: password });
};

export const getEmpresaByUserApi = async (userId, token) => {
  return axios.get(`${API_BASE}/empresas/usuario/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const checkinApi = async (codigoQr, companyId, token) => {
  return axios.post(`${API_BASE}/checkins/estande/${codigoQr}/${companyId}`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const verificarCodigoApi = async (codigo) => {
  return axios.get(`${API_BASE}/auth/verificar-codigo/${codigo}`);
}; 