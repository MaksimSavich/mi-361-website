import React, { useState } from 'react';
import { useAuth } from '../Auth/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import UserManagement from './UserManagement';
import InviteCodeManagement from './InviteCodeManagement';
import ContentModeration from './ContentModeration';
import CommentModeration from './CommentModeration'; // Import the new component

const AdminPage: React.FC = () => {
  // Update the type to include 'comments'
  const [activeTab, setActiveTab] = useState<'users' | 'invites' | 'content' | 'comments'>('users');
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();

  // Redirect non-admin users
  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className={`container mx-auto px-4 py-8 text-center ${
        theme === 'dark' ? 'text-white' : 'text-gray-800'
      }`}>
        <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className={`text-2xl font-bold mb-6 ${
        theme === 'dark' ? 'text-white' : 'text-gray-800'
      }`}>Admin Dashboard</h1>

      <div className={`border-b mb-6 ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <nav className="flex flex-wrap space-x-4 md:space-x-8">
          <button
            className={`py-4 font-medium ${
              activeTab === 'users' 
                ? theme === 'dark' 
                  ? 'border-b-2 border-white text-white' 
                  : 'border-b-2 border-black text-black'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            className={`py-4 font-medium ${
              activeTab === 'invites'
                ? theme === 'dark' 
                  ? 'border-b-2 border-white text-white' 
                  : 'border-b-2 border-black text-black'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('invites')}
          >
            Invite Codes
          </button>
          <button
            className={`py-4 font-medium ${
              activeTab === 'content'
                ? theme === 'dark' 
                  ? 'border-b-2 border-white text-white' 
                  : 'border-b-2 border-black text-black'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('content')}
          >
            Posts
          </button>
          <button
            className={`py-4 font-medium ${
              activeTab === 'comments'
                ? theme === 'dark' 
                  ? 'border-b-2 border-white text-white' 
                  : 'border-b-2 border-black text-black'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('comments')}
          >
            Comments
          </button>
        </nav>
      </div>

      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'invites' && <InviteCodeManagement />}
      {activeTab === 'content' && <ContentModeration />}
      {activeTab === 'comments' && <CommentModeration />}
    </div>
  );
};

export default AdminPage;