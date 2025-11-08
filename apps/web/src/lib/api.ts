import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';

export const api = axios.create({
  baseURL,
});

// Add Authorization header if token exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
