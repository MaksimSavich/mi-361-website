import api from './api';
import { User } from '../types/User';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  name?: string;
  phoneNumber?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', credentials);
  return response.data;
};

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/register', data);
  return response.data;
};

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
  localStorage.removeItem('token');
};

export const revokeSession = async (sessionId: string): Promise<void> => {
  await api.post('/auth/revoke-session', { sessionId });
};

export const revokeAllSessions = async (): Promise<void> => {
  await api.post('/auth/revoke-all-sessions');
};