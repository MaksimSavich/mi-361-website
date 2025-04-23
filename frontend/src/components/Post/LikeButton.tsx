import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthContext';
import { likePost, unlikePost, getLikeStatus } from '../../services/posts';
import { useTheme } from '../../context/ThemeContext';

interface LikeButtonProps {
  postId: string;
  likes: number;
  liked?: boolean;
  onLike?: (newLikes: number, liked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
}

const LikeButton: React.FC<LikeButtonProps> = ({
    postId,
    likes: initialLikes,
    liked: initialLiked = false,
    onLike,
    size = 'md',
    showCount = true,
    className = '',
  }) => {
    const [likes, setLikes] = useState(initialLikes);
    const [liked, setLiked] = useState(initialLiked);
    const [isProcessing, setIsProcessing] = useState(false);
    const { isAuthenticated } = useAuth();
    const { theme } = useTheme();

     useEffect(() => {
    setLikes(initialLikes);
    setLiked(initialLiked);
  }, [initialLikes, initialLiked]);

  // Verify like status on mount
  useEffect(() => {
    const verifyLikeStatus = async () => {
      if (!isAuthenticated) return;
      
      try {
        const status = await getLikeStatus(postId);
        // Only update if different to avoid circular updates
        if (status.liked !== liked) {
          setLiked(status.liked);
          setLikes(status.likes);
        }
      } catch (error) {
        console.error('Failed to verify like status:', error);
      }
    };
    
    verifyLikeStatus();
  }, [postId, isAuthenticated]);

  // Handle like/unlike action
  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    
    if (!isAuthenticated) {
      // If not authenticated, prompt user to log in
      alert('Please log in to like posts');
      return;
    }
    
    if (isProcessing) return; // Prevent multiple rapid clicks
    
    setIsProcessing(true);
    
    try {
      if (liked) {
        // Unlike the post
        const response = await unlikePost(postId);
        setLikes(response.likes);
        setLiked(response.liked);
        
        // Propagate change to parent component if callback provided
        if (onLike) {
          onLike(response.likes, response.liked);
        }
      } else {
        // Like the post
        const response = await likePost(postId);
        setLikes(response.likes);
        setLiked(response.liked);
        
        // Propagate change to parent component if callback provided
        if (onLike) {
          onLike(response.likes, response.liked);
        }
      }
    } catch (error) {
      console.error('Failed to update like status:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Determine icon size based on prop
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  
  // Build class names based on theme and liked state
  const heartColor = liked 
    ? theme === 'dark' ? 'text-red-500' : 'text-red-600' 
    : theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  
  const iconClasses = `${iconSize} ${heartColor} ${isProcessing ? 'opacity-50' : ''}`;
  
  return (
    <button
      onClick={handleLikeToggle}
      disabled={isProcessing || !isAuthenticated}
      className={`flex items-center ${isAuthenticated ? 'hover:opacity-80' : ''} ${className}`}
      aria-label={liked ? 'Unlike post' : 'Like post'}
    >
      {liked ? (
        // Filled heart icon (liked)
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="currentColor" 
          className={iconClasses}
        >
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        </svg>
      ) : (
        // Outlined heart icon (not liked)
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={1.5} 
          stroke="currentColor" 
          className={iconClasses}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      )}
      
      {showCount && (
        <span className={`ml-1 ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        } ${size === 'sm' ? 'text-xs' : ''}`}>
          {likes}
        </span>
      )}
    </button>
  );
};

export default LikeButton;