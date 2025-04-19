import React, { useState, useRef, useEffect } from 'react';
import { Post } from '../../types/Post';
import CommentSection from './CommentSection';
import { useTheme } from '../../context/ThemeContext';
import { generateVideoThumbnail } from '../../utils/VideoUtils';

interface PostDetailProps {
  post: Post;
  onClose: () => void;
}

const PostDetail: React.FC<PostDetailProps> = ({ post, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { theme } = useTheme();

  // Ensure post.comments exists, defaulting to empty array if undefined
  const comments = post.comments || [];

  // Generate thumbnail for videos
  useEffect(() => {
    if (post.mediaType === 'video' && post.mediaUrl && !thumbnailUrl) {
      // Try to generate a thumbnail from the video
      const generateThumbnail = async () => {
        try {
          const thumbnail = await generateVideoThumbnail(post.mediaUrl);
          setThumbnailUrl(thumbnail);
          console.log(`Generated detail thumbnail for video ${post.id}`);
        } catch (err) {
          console.error(`Failed to generate detail thumbnail for video ${post.id}:`, err);
          // Continue without a thumbnail
        }
      };
      
      generateThumbnail();
    }
  }, [post, thumbnailUrl]);

  // Log media URLs for debugging
  useEffect(() => {
    if (post.mediaUrl) {
      console.log(`PostDetail - ID: ${post.id}, Media URL: ${post.mediaUrl}, Type: ${post.mediaType}`);
    }
  }, [post]);

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
              console.log(`Detail video playing: ${post.id}`);
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
    console.log(`Detail video loaded: ${post.id}`);
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
  const hasValidMedia = post.mediaUrl && post.mediaUrl.trim() !== '';

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
            post.mediaType === 'image' ? (
              <img 
                src={post.mediaUrl} 
                alt="Post content"
                className="w-full h-full object-contain"
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
                  src={post.mediaUrl} 
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
                    console.error(`Error loading detail video: ${post.mediaUrl}`, e);
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
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <div className="text-center p-8">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" 
                  className="w-24 h-24 mx-auto mb-4 text-gray-400">
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
            <div className="flex items-center mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
              }`}>
                <span className="font-medium">
                  {post.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="font-medium ml-3">{post.username}</p>
            </div>
            <p>{post.caption}</p>
            <div className="mt-3 flex items-center text-sm">
              <span className="flex items-center mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" 
                  className={`w-5 h-5 mr-1 ${
                    theme === 'dark' ? 'text-red-400' : 'text-red-500'
                  }`}>
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
                {post.likes} likes
              </span>
              <span className={`${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <CommentSection 
            postId={post.id} 
            comments={comments}
          />
        </div>
      </div>
    </div>
  );
};

export default PostDetail;