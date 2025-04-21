import React, { useState, useEffect, useRef } from 'react';
import { Post } from '../../types/Post';
import { useTheme } from '../../context/ThemeContext';
import { generateVideoThumbnail } from '../../utils/VideoUtils';
import LikeButton from './LikeButton';

interface PostCardProps {
  post: Post;
  onClick: () => void;
  onPostUpdated?: (updatedPost: Post) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onClick, onPostUpdated }) => {
  const { theme } = useTheme();
  const [imageError, setImageError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(true);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [currentPost, setCurrentPost] = useState<Post>(post);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Update local post state when prop changes
  useEffect(() => {
    setCurrentPost(post);
  }, [post]);
  
  // Check if post has valid mediaUrl
  const hasValidMedia = currentPost.mediaUrl && currentPost.mediaUrl.trim() !== '';
  
  // Generate thumbnail for videos
  useEffect(() => {
    if (currentPost.mediaType === 'video' && hasValidMedia && !thumbnailUrl) {
      // Try to generate a thumbnail from the video
      const generateThumbnail = async () => {
        try {
          const thumbnail = await generateVideoThumbnail(currentPost.mediaUrl);
          setThumbnailUrl(thumbnail);
          console.log(`Generated thumbnail for video ${currentPost.id}`);
        } catch (err) {
          console.error(`Failed to generate thumbnail for video ${currentPost.id}:`, err);
          // Continue without a thumbnail
        }
      };
      
      generateThumbnail();
    }
  }, [currentPost, hasValidMedia, thumbnailUrl]);
  
  // Handle video events
  const handleVideoMouseOver = () => {
    if (videoRef.current && videoLoaded) {
      // Show play button on hover
      setShowPlayButton(true);
      
      // Using muted to bypass autoplay restrictions
      videoRef.current.muted = true;
      
      // Use play() Promise to handle autoplay blocking gracefully
      const playPromise = videoRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Video is playing
            console.log(`Video playing: ${currentPost.id}`);
            setIsPlaying(true);
            setShowPlayButton(false);
          })
          .catch(error => {
            // Auto-play was prevented
            console.warn(`Video autoplay prevented: ${error}`);
            setIsPlaying(false);
            setShowPlayButton(true);
          });
      }
    }
  };
  
  const handleVideoMouseOut = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
      setShowPlayButton(true);
    }
  };
  
  const handleVideoLoaded = () => {
    console.log(`Video loaded: ${currentPost.id}`);
    setVideoLoaded(true);
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
    setShowPlayButton(false);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    setShowPlayButton(true);
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
  
  return (
    <div 
      className={`rounded-lg overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition-all transform hover:scale-102 ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border border-gray-200'
      }`}
      onClick={onClick}
    >
      <div className="relative pb-[100%]">
        {hasValidMedia && !imageError ? (
          currentPost.mediaType === 'image' ? (
            <img 
              src={currentPost.mediaUrl} 
              alt="Post content"
              className="absolute top-0 left-0 w-full h-full object-cover"
              onError={() => {
                console.error(`Error loading image: ${currentPost.mediaUrl}`);
                setImageError(true);
              }}
            />
          ) : (
            <div className="absolute top-0 left-0 w-full h-full">
              {/* If we have a thumbnail, show it as a background image */}
              {thumbnailUrl && !videoLoaded && (
                <div 
                  className="absolute inset-0 bg-cover bg-center z-0"
                  style={{ backgroundImage: `url(${thumbnailUrl})` }}
                />
              )}
              
              {/* Video element */}
              <video 
                ref={videoRef}
                src={currentPost.mediaUrl} 
                className="w-full h-full object-cover z-10"
                controls={false}
                muted
                playsInline
                preload="metadata"
                onLoadedData={handleVideoLoaded}
                onMouseOver={handleVideoMouseOver}
                onMouseOut={handleVideoMouseOut}
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onClick={(e) => {
                  e.stopPropagation();
                  if (videoRef.current) {
                    if (videoRef.current.paused) {
                      videoRef.current.play();
                    } else {
                      videoRef.current.pause();
                    }
                  }
                }}
                onError={(e) => {
                  console.error(`Error loading video: ${currentPost.mediaUrl}`, e);
                  setImageError(true);
                }}
              />
              
              {/* Play button overlay - only show when video is paused */}
              {showPlayButton && !isPlaying && (
                <div 
                  className="absolute inset-0 flex items-center justify-center z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (videoRef.current) {
                      videoRef.current.play().catch(() => {});
                    }
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-black bg-opacity-60 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" className="w-6 h-6">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              )}
              
              {/* Video indicator icon */}
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded z-20">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
              </div>
            </div>
          )
        ) : (
          // Placeholder for missing or errored media
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" 
              className={`w-12 h-12 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className={`text-sm truncate ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>{currentPost.caption}</p>
        <div className="flex justify-between items-center mt-2">
          <p className={`text-xs ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>By {currentPost.username}</p>
          
          {/* Updated to use the LikeButton component */}
          <LikeButton 
            postId={currentPost.id}
            likes={currentPost.likes}
            liked={currentPost.liked}
            onLike={handleLikeChanged}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
};

export default PostCard;