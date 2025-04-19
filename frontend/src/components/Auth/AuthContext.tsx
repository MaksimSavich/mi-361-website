import React, { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import { User } from '../../types/User';
import { login as loginApi, logout as logoutApi } from '../../services/auth';
import { LoginCredentials } from '../../services/auth';
import api from '../../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  isAuthenticated: false,
});

export const useAuth = () => useContext(AuthContext);

interface JwtPayload {
  userId: string;
  exp: number;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async (token: string) => {
    try {
      console.log('Refreshing user with token:', token); // Debug log
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('User data refreshed:', userData); // Debug log
        setUser(userData);
        return true;
      } else {
        console.error('Failed to refresh user', response.status, response.statusText);
        localStorage.removeItem('token');
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      localStorage.removeItem('token');
      setUser(null);
      return false;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      console.log('Initial token:', token); // Debug log
      
      if (token) {
        try {
          const decoded = jwtDecode<JwtPayload>(token);
          console.log('Decoded token:', decoded); // Debug log
          
          // Token expires in less than 1 day, attempt to refresh
          if (decoded.exp * 1000 < Date.now() + 24 * 60 * 60 * 1000) {
            try {
              console.log('Token is close to expiration, attempting refresh'); // Debug log
              // Send request to refresh token
              const refreshResponse = await api.post('/auth/refresh-token');
              const newToken = refreshResponse.data.token;
              
              console.log('New token received:', newToken); // Debug log
              localStorage.setItem('token', newToken);
              
              // Verify and set user with new token
              await refreshUser(newToken);
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              localStorage.removeItem('token');
              setUser(null);
            }
          } else {
            // Token is still valid, just refresh user data
            await refreshUser(token);
          }
        } catch (error) {
          console.error('Token validation error:', error);
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await loginApi(credentials);
    localStorage.setItem('token', response.token);
    setUser(response.user);
  };

  const logout = async () => {
    await logoutApi();
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};