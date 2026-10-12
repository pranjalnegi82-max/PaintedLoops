import axios from 'axios';
const configured = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'https://paintedloops-backend.onrender.com')).replace(/\/+$/, '');
export const API_ORIGIN = configured.replace(/\/api$/, '');
const api = axios.create({ baseURL: `${API_ORIGIN}/api`, timeout: 45000 });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(res => res.data, err => {
  if (err.response?.status === 401 && !err.config?.url?.match(/^\/auth\/(login|register)$/)) {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('pl-session-expired'));
  }
  return Promise.reject(new Error(err.response?.data?.message || (err.code === 'ECONNABORTED' ? 'The shop is taking longer than expected. Please try again.' : 'Unable to reach the shop. Check your connection and try again.')));
});
export default api;
