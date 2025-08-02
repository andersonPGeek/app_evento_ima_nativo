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

export const checkinApi = async (codigoQr, companyId, token, observacao = '', storedUserId) => {
  return axios.post(`${API_BASE}/checkins/estande/${codigoQr}/${companyId}/${observacao}/${storedUserId}`, {
  }, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Função para simular processamento via fila Redis
export const checkinWithQueueApi = async (codigoQr, companyId, token, observacao = '', storedUserId) => {
  // Simular delay de processamento da fila
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Chamar a API original com observação e storedUserId
  return checkinApi(codigoQr, companyId, token, observacao, storedUserId);
};

// Nova API para atualizar observação de check-in
export const updateCheckinObservationApi = async (checkinId, observacao, token) => {
  return axios.put(`${API_BASE}/checkins/estande/${checkinId}`, {
    observacao
  }, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const verificarCodigoApi = async (codigo) => {
  return axios.get(`${API_BASE}/auth/verificar-codigo/${codigo}`);
};

export const getCurrentBannerApi = async () => {
  try {
    const response = await axios.get(`${API_BASE}/banner/current`, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response;
  } catch (error) {
    // Para 404, não é um erro real, é comportamento esperado
    if (error.response?.status === 404) {
      // Retornar um erro customizado que não será tratado como erro de JavaScript
      const customError = new Error('BANNER_NOT_FOUND');
      customError.isExpected = true; // Marcar como erro esperado
      throw customError;
    } else {
      throw error;
    }
  }
}; 