import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { followUser, unfollowUser, getFollowStatus } from '../../services/users';

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  onFollowChanged?: (isFollowing: boolean) => void;
  className?: string;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  isFollowing: initialIsFollowing,
  onFollowChanged,
  className = '',
}) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  // Important: Update when props change
  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  // Verify follow status on mount
  useEffect(() => {
    const verifyFollowStatus = async () => {
      try {
        const status = await getFollowStatus(userId);
        // Only update if different to avoid circular updates
        if (status.isFollowing !== isFollowing) {
          setIsFollowing(status.isFollowing);
        }
      } catch (error) {
        console.error('Failed to verify follow status:', error);
      }
    };
    
    verifyFollowStatus();
  }, [userId]);

  const handleToggleFollow = async () => {
    setLoading(true);

    try {
      if (isFollowing) {
        await unfollowUser(userId);
        setIsFollowing(false);
      } else {
        await followUser(userId);
        setIsFollowing(true);
      }

      // Notify parent component if callback provided
      if (onFollowChanged) {
        onFollowChanged(!isFollowing);
      }
    } catch (error) {
      console.error('Failed to toggle follow status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleFollow}
      disabled={loading}
      className={`px-4 py-1 rounded-full text-sm ${
        isFollowing
          ? theme === 'dark'
            ? 'bg-gray-700 text-white border border-gray-600 hover:bg-gray-600'
            : 'bg-gray-200 text-gray-800 border border-gray-300 hover:bg-gray-300'
          : theme === 'dark'
            ? 'bg-accent-dark text-white hover:bg-accent-dark/90'
            : 'bg-primary-light text-white hover:bg-primary-light/90'
      } ${className}`}
    >
      {loading ? '...' : isFollowing ? 'Following' : 'Follow'}
    </button>
  );
};

export default FollowButton;