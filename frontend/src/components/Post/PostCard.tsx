import React from 'react';
import { Post } from '../../types/Post';
import { useTheme } from '../../context/ThemeContext';

interface PostCardProps {
  post: Post;
  onClick: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onClick }) => {
  const { theme } = useTheme();
  
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
        {post.mediaType === 'image' ? (
          <img 
            src={post.mediaUrl} 
            alt={post.caption} 
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute top-0 left-0 w-full h-full">
            <video 
              src={post.mediaUrl} 
              className="w-full h-full object-cover"
              controls={false}
              muted
              onClick={(e) => e.stopPropagation()}
              onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
              onMouseOut={(e) => {
                (e.target as HTMLVideoElement).pause();
                (e.target as HTMLVideoElement).currentTime = 0;
              }}
            />
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
            </div>
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