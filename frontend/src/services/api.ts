import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token and handling 401 errors
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('Request interceptor - current token:', token); // Debug log
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    console.log('Response interceptor - error:', error.response?.status); // Debug log

    // If the error is a 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        console.log('Attempting to refresh token'); // Debug log

        // Attempt to refresh the token
        const response = await api.post('/auth/refresh-token');
        const newToken = response.data.token;

        console.log('New token received:', newToken); // Debug log

        // Ensure the token is not empty before storing
        if (newToken) {
          localStorage.setItem('token', newToken);
          console.log('Token stored in localStorage'); // Debug log
        } else {
          console.error('Received empty token');
          throw new Error('Empty token received');
        }

        // Update the Authorization header for the original request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Clear token and redirect
        localStorage.removeItem('token');
        window.location.href = '/login';
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;