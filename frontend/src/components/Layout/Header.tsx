import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../Auth/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import UploadModal from '../Upload/UploadModal';
import UserSearch from '../Search/UserSearch';

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
    navigate('/');
  };

  return (
    <header className={`${
      theme === 'dark' 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-primary-light border-primary-dark'
    } border-b sticky top-0 z-40 transition-colors`}>
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Link to="/" className={`text-xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-white'
          }`}>
            Spartan Net
          </Link>
          
          {/* Add feed link for authenticated users */}
          {isAuthenticated && (
            <div className="ml-6 hidden md:flex space-x-4">
              <Link to="/feed" className={`${
                theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-white hover:text-gray-200'
              }`}>
                Following
              </Link>
              <Link to="/profile" className={`${
                theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-white hover:text-gray-200'
              }`}>
                Profile
              </Link>
            </div>
          )}
        </div>
        
        {/* Search component - visible on larger screens */}
        <div className="hidden md:block max-w-md w-full mx-4">
          <UserSearch />
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search button - visible on mobile */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`md:hidden p-2 rounded-full ${
              theme === 'dark' 
                ? 'bg-gray-700 text-gray-300' 
                : 'bg-secondary-light text-gray-700'
            }`}
            aria-label="Search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
          
          {/* Theme toggle button */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full ${
              theme === 'dark' 
                ? 'bg-gray-700 text-yellow-300' 
                : 'bg-secondary-light text-gray-700'
            }`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>
          
          {isAuthenticated && (
            <button
              onClick={() => setShowUploadModal(true)}
              className={`${
                theme === 'dark'
                  ? 'text-gray-300 hover:text-white'
                  : 'text-gray-800 hover:text-black'
              }`}
              aria-label="Upload"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </button>
          )}
          
          {/* Rest of the header code remains the same */}
        </div>
      </div>
      
      {/* Mobile search - only visible when showSearch is true */}
      {showSearch && (
        <div className="md:hidden px-4 py-3 border-t border-gray-700">
          <UserSearch onClose={() => setShowSearch(false)} />
        </div>
      )}
      
      {/* Mobile navigation menu for authenticated users */}
      {isAuthenticated && showSearch && (
        <div className="md:hidden px-4 py-2 border-t border-gray-700 flex justify-around">
          <Link 
            to="/" 
            className={`flex flex-col items-center ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}
            onClick={() => setShowSearch(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link 
            to="/feed" 
            className={`flex flex-col items-center ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}
            onClick={() => setShowSearch(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            <span className="text-xs mt-1">Following</span>
          </Link>
          <Link 
            to="/profile" 
            className={`flex flex-col items-center ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}
            onClick={() => setShowSearch(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span className="text-xs mt-1">Profile</span>
          </Link>
        </div>
      )}
      
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />
    </header>
  );
};

export default Header;