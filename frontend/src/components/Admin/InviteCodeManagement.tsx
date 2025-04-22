// frontend/src/components/Admin/InviteCodeManagement.tsx (new file)
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface InviteCode {
  id: string;
  code: string;
  createdBy: string;
  usedBy?: string;
  usedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

const InviteCodeManagement: React.FC = () => {
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expiryDays, setExpiryDays] = useState(30); // Default 30 days
  const { theme } = useTheme();

  useEffect(() => {
    fetchInviteCodes();
  }, []);

  const fetchInviteCodes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/invite-codes');
      setInviteCodes(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch invite codes');
      console.error('Error fetching invite codes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    setError(null);
    setSuccess(null);
    
    try {
      const response = await api.post('/admin/invite-codes', { expiryDays });
      setSuccess(`New invite code generated: ${response.data.code}`);
      
      // Add new code to the list
      setInviteCodes([response.data, ...inviteCodes]);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate invite code');
      console.error('Error generating invite code:', err);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setSuccess('Code copied to clipboard');
      })
      .catch(() => {
        setError('Failed to copy code');
      });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-xl font-semibold ${
          theme === 'dark' ? 'text-white' : 'text-gray-800'
        }`}>Invite Code Management</h2>
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
      
      <div className={`mb-6 p-6 rounded-lg ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      } shadow`}>
        <h3 className={`text-lg font-medium mb-4 ${
          theme === 'dark' ? 'text-white' : 'text-gray-800'
        }`}>Generate New Invite Code</h3>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            <label className="block mb-2">Code expiry (days):</label>
            <input
              type="number"
              min="0"
              max="365"
              value={expiryDays}
              onChange={(e) => setExpiryDays(parseInt(e.target.value) || 0)}
              className={`border rounded px-3 py-2 w-32 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-800'
              }`}
            />
            <p className={`text-xs mt-1 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Set to 0 for no expiry
            </p>
          </div>
          
          <button
            onClick={handleGenerateCode}
            className={`mt-6 px-4 py-2 rounded font-medium ${
              theme === 'dark'
                ? 'bg-accent-dark text-white'
                : 'bg-primary-light text-white'
            }`}
          >
            Generate Code
          </button>
        </div>
      </div>
      
      <h3 className={`text-lg font-medium mb-4 ${
        theme === 'dark' ? 'text-white' : 'text-gray-800'
      }`}>Invite Codes</h3>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
            theme === 'dark' ? 'border-accent-dark' : 'border-primary-light'
          }`}></div>
        </div>
      ) : inviteCodes.length === 0 ? (
        <p className={`text-center py-8 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          No invite codes found
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
                  Code
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Created
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Expires
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Status
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
              {inviteCodes.map((code) => (
                <tr key={code.id} className={
                  theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {code.code}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {new Date(code.createdAt).toLocaleDateString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {code.expiresAt 
                      ? new Date(code.expiresAt).toLocaleDateString() 
                      : 'Never'
                    }
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm`}>
                    {code.usedBy ? (
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        theme === 'dark' 
                          ? 'bg-gray-700 text-gray-300' 
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        Used on {new Date(code.usedAt!).toLocaleDateString()}
                      </span>
                    ) : code.expiresAt && new Date(code.expiresAt) < new Date() ? (
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        theme === 'dark' 
                          ? 'bg-red-900 text-red-200' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        Expired
                      </span>
                    ) : (
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        theme === 'dark' 
                          ? 'bg-green-900 text-green-200' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {!code.usedBy && (
                      <button
                        onClick={() => copyToClipboard(code.code)}
                        className={`${
                          theme === 'dark' 
                            ? 'text-accent-dark hover:text-accent-dark/80' 
                            : 'text-primary-dark hover:text-primary-dark/80'
                        }`}
                      >
                        Copy
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

export default InviteCodeManagement;