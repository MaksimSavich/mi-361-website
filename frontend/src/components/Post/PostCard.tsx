import React, { useState, useEffect, useRef } from 'react';
import { Post } from '../../types/Post';
import { useTheme } from '../../context/ThemeContext';
import { generateVideoThumbnail } from '../../utils/VideoUtils';

interface PostCardProps {
  post: Post;
  onClick: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onClick }) => {
  const { theme } = useTheme();
  const [imageError, setImageError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(true);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Check if post has valid mediaUrl
  const hasValidMedia = post.mediaUrl && post.mediaUrl.trim() !== '';
  
  // Generate thumbnail for videos
  useEffect(() => {
    if (post.mediaType === 'video' && hasValidMedia && !thumbnailUrl) {
      // Try to generate a thumbnail from the video
      const generateThumbnail = async () => {
        try {
          const thumbnail = await generateVideoThumbnail(post.mediaUrl);
          setThumbnailUrl(thumbnail);
          console.log(`Generated thumbnail for video ${post.id}`);
        } catch (err) {
          console.error(`Failed to generate thumbnail for video ${post.id}:`, err);
          // Continue without a thumbnail
        }
      };
      
      generateThumbnail();
    }
  }, [post, hasValidMedia, thumbnailUrl]);
  
  // Log media URLs for debugging
  useEffect(() => {
    if (post.mediaUrl) {
      console.log(`Post ID: ${post.id}, Media URL: ${post.mediaUrl}, Type: ${post.mediaType}`);
    }
  }, [post]);

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
            console.log(`Video playing: ${post.id}`);
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
    console.log(`Video loaded: ${post.id}`);
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
          post.mediaType === 'image' ? (
            <img 
              src={post.mediaUrl} 
              alt="Post content"
              className="absolute top-0 left-0 w-full h-full object-cover"
              onError={() => {
                console.error(`Error loading image: ${post.mediaUrl}`);
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
                src={post.mediaUrl} 
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
                  console.error(`Error loading video: ${post.mediaUrl}`, e);
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
        }`}>{post.caption}</p>
        <div className="flex justify-between items-center mt-2">
          <p className={`text-xs ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>By {post.username}</p>
          <div className="flex items-center text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-4 h-4 mr-1 ${
              theme === 'dark' ? 'text-red-400' : 'text-red-500'
            }`}>
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>{post.likes}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;