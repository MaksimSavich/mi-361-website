import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { revokeSession, revokeAllSessions } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';

interface Session {
  id: string;
  device: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

const SessionManagement: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { theme } = useTheme();

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/sessions');
      setSessions(response.data);
    } catch (err) {
      setError('Failed to fetch active sessions');
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    setError(null);
    setSuccess(null);
    
    try {
      await revokeSession(sessionId);
      setSuccess('Session revoked successfully');
      // Update sessions list
      setSessions(sessions.filter(session => session.id !== sessionId));
    } catch (err) {
      setError('Failed to revoke session');
      console.error('Error revoking session:', err);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!window.confirm('Are you sure you want to log out of all other devices?')) {
      return;
    }
    
    setError(null);
    setSuccess(null);
    
    try {
      await revokeAllSessions();
      setSuccess('All other sessions revoked successfully');
      // Keep only current session
      fetchSessions();
    } catch (err) {
      setError('Failed to revoke all sessions');
      console.error('Error revoking all sessions:', err);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-xl font-semibold ${
          theme === 'dark' ? 'text-white' : 'text-gray-800'
        }`}>Active Sessions</h2>
        <button
          onClick={handleRevokeAllSessions}
          className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
        >
          Log out of all other devices
        </button>
      </div>
      
      {error && (
        <div className={`border px-4 py-3 rounded mb-4 ${
          theme === 'dark'
            ? 'bg-red-900 border-red-800 text-red-200'
            : 'bg-red-100 border-red-400 text-red-700'
        }`}>
          {error}
        </div>
      )}
      
      {success && (
        <div className={`border px-4 py-3 rounded mb-4 ${
          theme === 'dark'
            ? 'bg-green-900 border-green-800 text-green-200'
            : 'bg-green-100 border-green-400 text-green-700'
        }`}>
          {success}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
            theme === 'dark' ? 'border-accent-dark' : 'border-primary-light'
          }`}></div>
        </div>
      ) : sessions.length === 0 ? (
        <p className={`text-center py-8 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          No active sessions found
        </p>
      ) : (
        <div className={`rounded-lg shadow overflow-hidden ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={`${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Device
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  IP Address
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Last Active
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${
              theme === 'dark' ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'
            }`}>
              {sessions.map((session) => (
                <tr key={session.id} className={
                  theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {session.device}
                        </div>
                        {session.isCurrent && (
                          <div className="text-xs text-green-500">Current session</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {session.ipAddress}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {new Date(session.lastActive).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {!session.isCurrent && (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        className={`hover:underline ${
                          theme === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-900'
                        }`}
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SessionManagement;