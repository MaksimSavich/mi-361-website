import React, { useState } from 'react';
import { Post } from '../../types/Post';
import { Comment } from '../../types/Comment';
import CommentSection from './CommentSection';
import { useTheme } from '../../context/ThemeContext';

interface PostDetailProps {
  post: Post;
  onClose: () => void;
}

const PostDetail: React.FC<PostDetailProps> = ({ post, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { theme } = useTheme();

  // Ensure post.comments exists, defaulting to empty array if undefined
  const comments = post.comments || [];

  const togglePlay = (e: React.MouseEvent<HTMLVideoElement>) => {
    e.stopPropagation();
    const video = e.target as HTMLVideoElement;
    
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
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
              <video 
                src={post.mediaUrl} 
                className="w-full h-full object-contain"
                controls
                onClick={togglePlay}
                onError={() => setImageError(true)}
              />
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