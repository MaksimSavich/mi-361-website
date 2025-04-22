import React, { useState, useRef, useEffect } from 'react';
import { Post } from '../../types/Post';
import CommentSection from './CommentSection';
import { useTheme } from '../../context/ThemeContext';
import { generateVideoThumbnail } from '../../utils/VideoUtils';
import { useAuth } from '../Auth/AuthContext';
import api from '../../services/api';
import OptionsMenu from './OptionsMenu';
import LikeButton from './LikeButton';

interface PostDetailProps {
  post: Post;
  onClose: () => void;
  onPostDeleted?: (postId: string) => void;
  onPostUpdated?: (updatedPost: Post) => void;
  isAdmin?: boolean; // New prop
}

const PostDetail: React.FC<PostDetailProps> = ({ 
  post, 
  onClose, 
  onPostDeleted, 
  onPostUpdated,
  isAdmin = false // Default to false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentPost, setCurrentPost] = useState<Post>(post);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { theme } = useTheme();
  const { user, isAuthenticated } = useAuth();

  // Initialize caption state when post changes
  useEffect(() => {
    setCurrentPost(post);
    setEditCaption(post.caption);
  }, [post]);

  // Ensure post.comments exists, defaulting to empty array if undefined
  const comments = currentPost.comments || [];
  
  // Check if current user is the owner of the post or is an admin
  const isPostOwner = isAdmin || (isAuthenticated && user?.id === currentPost.userId);

  // Handler for post deletion
  const handleDeletePost = async () => {
    if (!isAuthenticated || !isPostOwner) return;
    
    setIsDeleting(true);
    try {
      // Use admin API endpoint if isAdmin flag is true
      const endpoint = isAdmin ? `/admin/posts/${currentPost.id}` : `/posts/${currentPost.id}`;
      await api.delete(endpoint);
      
      // Notify parent component about deletion
      if (onPostDeleted) {
        onPostDeleted(currentPost.id); // Pass the post ID
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Handler for editing post
  const handleEditPost = () => {
    setIsEditing(true);
  };
  
  // Handler for saving edited post
  const handleSavePost = async () => {
    if (!isAuthenticated || !isPostOwner || !editCaption.trim()) return;
    
    setIsUpdating(true);
    try {
      const response = await api.put(`/posts/${currentPost.id}`, {
        caption: editCaption
      });
      
      // Update the post in the UI
      const updatedPost = {
        ...currentPost,
        caption: response.data.caption
      };
      
      setCurrentPost(updatedPost);
      
      // Propagate change to parent component if callback provided
      if (onPostUpdated) {
        onPostUpdated(updatedPost);
      }
      
      // Exit edit mode
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update post:', error);
      alert('Failed to update post. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handler for canceling edit
  const handleCancelEdit = () => {
    setEditCaption(currentPost.caption);
    setIsEditing(false);
  };

  // Handle like state changes
  const handleLikeChanged = (newLikes: number, liked: boolean) => {
    const updatedPost = {
      ...currentPost,
      likes: newLikes,
      liked: liked
    };
    
    setCurrentPost(updatedPost);
    
    // Propagate change to parent component if callback provided
    if (onPostUpdated) {
      onPostUpdated(updatedPost);
    }
  };

  // Generate thumbnail for videos
  useEffect(() => {
    if (currentPost.mediaType === 'video' && currentPost.mediaUrl && !thumbnailUrl) {
      // Try to generate a thumbnail from the video
      const generateThumbnail = async () => {
        try {
          const thumbnail = await generateVideoThumbnail(currentPost.mediaUrl);
          setThumbnailUrl(thumbnail);
          console.log(`Generated detail thumbnail for video ${currentPost.id}`);
        } catch (err) {
          console.error(`Failed to generate detail thumbnail for video ${currentPost.id}:`, err);
          // Continue without a thumbnail
        }
      };
      
      generateThumbnail();
    }
  }, [currentPost, thumbnailUrl]);

  // Log media URLs for debugging
  useEffect(() => {
    if (currentPost.mediaUrl) {
      console.log(`PostDetail - ID: ${currentPost.id}, Media URL: ${currentPost.mediaUrl}, Type: ${currentPost.mediaType}`);
    }
  }, [currentPost]);

  const togglePlay = (e: React.MouseEvent<HTMLVideoElement>) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        setIsLoadingVideo(true);
        // Use play() Promise to handle potential play failures
        const playPromise = videoRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setIsLoadingVideo(false);
              console.log(`Detail video playing: ${currentPost.id}`);
            })
            .catch(error => {
              console.warn(`Detail video play prevented: ${error}`);
              setIsLoadingVideo(false);
              // We might need to mute to allow autoplay
              if (videoRef.current) {
                videoRef.current.muted = true;
                videoRef.current.play()
                  .then(() => {
                    setIsPlaying(true);
                  })
                  .catch(() => {
                    setIsPlaying(false);
                  });
              }
            });
        }
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleVideoLoaded = () => {
    console.log(`Detail video loaded: ${currentPost.id}`);
    setVideoLoaded(true);
    setIsLoadingVideo(false);
  };

  const handleLoadStart = () => {
    setIsLoadingVideo(true);
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
  };
  
  // Check if post has valid mediaUrl
  const hasValidMedia = currentPost.mediaUrl && currentPost.mediaUrl.trim() !== '';

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className={`rounded-lg overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col md:flex-row ${
          theme === 'dark' ? 'bg-gray-900' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:w-2/3 relative bg-black">
          {hasValidMedia && !imageError ? (
            currentPost.mediaType === 'image' ? (
              <img 
                src={currentPost.mediaUrl} 
                alt="Post content"
                className="absolute top-0 left-0 w-full h-full object-contain"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="relative w-full h-full">
                {/* If we have a thumbnail, show it as background while video loads */}
                {thumbnailUrl && !videoLoaded && (
                  <div 
                    className="absolute inset-0 bg-cover bg-center z-0 flex items-center justify-center"
                    style={{ backgroundImage: `url(${thumbnailUrl})` }}
                  >
                    <div className="w-16 h-16 rounded-full bg-black bg-opacity-60 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" className="w-8 h-8">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}
                
                <video 
                  ref={videoRef}
                  src={currentPost.mediaUrl} 
                  className="w-full h-full object-contain z-10"
                  controls
                  controlsList="nodownload"
                  playsInline
                  preload="auto"
                  poster={thumbnailUrl || undefined}
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                  onLoadStart={handleLoadStart}
                  onLoadedData={handleVideoLoaded}
                  onError={(e) => {
                    console.error(`Error loading detail video: ${currentPost.mediaUrl}`, e);
                    setImageError(true);
                  }}
                />
                
                {/* Loading spinner */}
                {isLoadingVideo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 pointer-events-none z-20">
                    <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
                      theme === 'dark' ? 'border-accent-dark' : 'border-primary-light'
                    }`}></div>
                  </div>
                )}
                
                {/* Custom play button when video is paused and not loading - only in center area */}
                {!isPlaying && !isLoadingVideo && videoLoaded && (
                  <div 
                    className="absolute left-1/4 right-1/4 top-1/4 bottom-1/4 flex items-center justify-center cursor-pointer z-20" 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (videoRef.current) {
                        videoRef.current.play().catch(() => {});
                      }
                    }}
                  >
                    <div className="w-16 h-16 rounded-full bg-black bg-opacity-60 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" className="w-8 h-8">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            // Placeholder for missing or errored media
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-800">
              <div className="text-center p-8">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" 
                  className={`w-24 h-24 mx-auto mb-4 text-gray-400`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <p className="text-gray-300">Media not available</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="md:w-1/3 flex flex-col h-full">
          <div className={`p-4 border-b ${
            theme === 'dark' ? 'border-gray-800 text-white' : 'border-gray-200 text-gray-800'
          }`}>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  <span className="font-medium">
                    {currentPost.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="font-medium ml-3">{currentPost.username}</p>
              </div>
              
              {/* Options Menu Button */}
              <OptionsMenu 
                isOwner={isPostOwner}
                onDelete={handleDeletePost}
                onEdit={handleEditPost}
                position="left"
              />
            </div>
            
            {isEditing ? (
              <div className="mt-2">
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className={`w-full border rounded p-2 resize-none focus:outline-none ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                  }`}
                  rows={3}
                />
                <div className="flex justify-end mt-2 space-x-2">
                  <button
                    onClick={handleCancelEdit}
                    className={`px-3 py-1 rounded text-sm ${
                      theme === 'dark'
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePost}
                    disabled={isUpdating || !editCaption.trim()}
                    className={`px-3 py-1 rounded text-sm disabled:opacity-50 ${
                      theme === 'dark'
                        ? 'bg-accent-dark text-white'
                        : 'bg-primary-light text-white'
                    }`}
                  >
                    {isUpdating ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <p>{currentPost.caption}</p>
            )}
            <div className="mt-3 flex items-center text-sm">
              {/* Like Button */}
              <LikeButton 
                postId={currentPost.id}
                likes={currentPost.likes}
                liked={currentPost.liked}
                onLike={handleLikeChanged}
                className="mr-4"
              />
              
              <span className={`${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {new Date(currentPost.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <CommentSection 
            postId={currentPost.id} 
            comments={comments}
            onPostUpdate={() => {
              // Reload comments if needed
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default PostDetail;