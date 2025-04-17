import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { theme } = useTheme();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      
      navigate('/login', { state: { message: 'Registration successful! Please log in.' } });
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        'Registration failed. Please try again.'
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
        <h1 className="text-2xl font-bold mb-6 text-center">Create an Account</h1>
        
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
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`w-full border rounded px-3 py-2 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-800'
              }`}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className={`block mb-2 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
            }`}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full border rounded px-3 py-2 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-800'
              }`}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className={`block mb-2 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
            }`}>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full border rounded px-3 py-2 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-800'
              }`}
              required
            />
            <p className={`text-xs mt-1 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Must be at least 8 characters long
            </p>
          </div>
          
          <div className="mb-6">
            <label className={`block mb-2 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
            }`}>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
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
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
            Already have an account?{' '}
            <Link to="/login" className={`hover:underline ${
              theme === 'dark' ? 'text-accent-dark' : 'text-primary-dark'
            }`}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;