import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { searchUsers } from '../../services/users';
import { UserWithFollowCount } from '../../types/User';
import { useDebounce } from '../../utils/hooks';

interface UserSearchProps {
  onClose?: () => void;
}

const UserSearch: React.FC<UserSearchProps> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserWithFollowCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  
  const { theme } = useTheme();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Debounce search query to avoid too many API calls
  const debouncedQuery = useDebounce(query, 300);

  // Focus input on component mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle click outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
        if (onClose) onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Search for users when query changes
  useEffect(() => {
    const fetchUsers = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await searchUsers(debouncedQuery);
        setResults(data);
      } catch (err) {
        console.error('Error searching users:', err);
        setError('Failed to search users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [debouncedQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowResults(true);
  };

  const handleItemClick = () => {
    setShowResults(false);
    setQuery('');
    if (onClose) onClose();
  };

  return (
    <div 
      ref={searchRef}
      className={`relative w-full max-w-md`}
    >
      <div className={`relative`}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowResults(true)}
          placeholder="Search users..."
          className={`w-full px-4 py-2 pr-10 rounded-lg border ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
          }`}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {loading ? (
            <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${
              theme === 'dark' ? 'border-gray-400' : 'border-gray-600'
            }`}></div>
          ) : (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={1.5} 
              stroke="currentColor" 
              className={`w-5 h-5 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" 
              />
            </svg>
          )}
        </div>
      </div>
      
      {showResults && (debouncedQuery || results.length > 0) && (
        <div className={`absolute z-50 mt-1 w-full rounded-md shadow-lg max-h-80 overflow-y-auto ${
          theme === 'dark' 
            ? 'bg-gray-800 border border-gray-700' 
            : 'bg-white border border-gray-200'
        }`}>
          {error && (
            <div className={`px-4 py-3 text-sm ${
              theme === 'dark' ? 'text-red-400' : 'text-red-500'
            }`}>
              {error}
            </div>
          )}
          
          {results.length === 0 && !loading && !error && debouncedQuery && (
            <div className={`px-4 py-3 text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              No users found
            </div>
          )}
          
          {results.map(user => (
            <Link 
              key={user.id} 
              to={`/users/${user.id}`}
              onClick={handleItemClick}
              className={`block px-4 py-3 hover:${
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
              }`}
            >
              <div className="flex items-center">
                <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center overflow-hidden ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>
                    {user.username}
                  </p>
                  {user.name && (
                    <p className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {user.name}
                    </p>
                  )}
                </div>
                
                <div className="ml-auto text-xs">
                  <div className={`${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {user.followerCount} followers
                  </div>
                  {user.isFollowing && (
                    <div className="mt-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800 inline-block">
                      Following
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserSearch;