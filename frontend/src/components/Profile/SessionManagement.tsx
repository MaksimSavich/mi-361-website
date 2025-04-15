import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { revokeSession, revokeAllSessions } from '../../services/auth';

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
        <h2 className="text-xl font-semibold">Active Sessions</h2>
        <button
          onClick={handleRevokeAllSessions}
          className="bg-red-600 text-white px-4 py-2 rounded text-sm"
        >
          Log out of all other devices
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      {loading ? (
        <p className="text-center py-8">Loading...</p>
      ) : sessions.length === 0 ? (
        <p className="text-center py-8">No active sessions found</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {session.device}
                        </div>
                        {session.isCurrent && (
                          <div className="text-xs text-green-600">Current session</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {session.ipAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(session.lastActive).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {!session.isCurrent && (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        className="text-red-600 hover:text-red-900"
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