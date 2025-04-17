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
  const { theme } = useTheme();

  const togglePlay = (e: React.MouseEvent<HTMLVideoElement>) => {
    e.stopPropagation();
    const video = e.target as HTMLVideoElement;
    
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

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
          {post.mediaType === 'image' ? (
            <img 
              src={post.mediaUrl} 
              alt={post.caption} 
              className="w-full h-full object-contain"
            />
          ) : (
            <video 
              src={post.mediaUrl} 
              className="w-full h-full object-contain"
              controls
              onClick={togglePlay}
            />
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
            comments={post.comments as Comment[]}
          />
        </div>
      </div>
    </div>
  );
};

export default PostDetail;