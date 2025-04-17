import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useTheme } from '../../context/ThemeContext';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  const { login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for success message from registration
    if (location.state && (location.state as any).message) {
      setMessage((location.state as any).message);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await login({ username, password });
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        'Login failed. Please check your credentials and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      <div className={`rounded-lg shadow-md p-6 ${
        theme === 'dark' 
          ? 'bg-gray-800 text-white' 
          : 'bg-white text-gray-800'
      }`}>
        <h1 className="text-2xl font-bold mb-6 text-center">Log in to PhotoShare</h1>
        
        {message && (
          <div className={`border px-4 py-3 rounded mb-4 ${
            theme === 'dark'
              ? 'bg-green-900 border-green-800 text-green-200'
              : 'bg-green-100 border-green-400 text-green-700'
          }`}>
            {message}
          </div>
        )}
        
        {error && (
          <div className={`border px-4 py-3 rounded mb-4 ${
            theme === 'dark'
              ? 'bg-red-900 border-red-800 text-red-200'
              : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className={`block mb-2 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
            }`}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full border rounded px-3 py-2 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-800'
              }`}
              required
            />
          </div>
          
          <div className="mb-6">
            <label className={`block mb-2 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
            }`}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full border rounded px-3 py-2 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-800'
              }`}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded font-medium disabled:opacity-50 ${
              theme === 'dark'
                ? 'bg-accent-dark text-white'
                : 'bg-primary-light text-white'
            }`}
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
            Don't have an account?{' '}
            <Link to="/register" className={`hover:underline ${
              theme === 'dark' ? 'text-accent-dark' : 'text-primary-dark'
            }`}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;