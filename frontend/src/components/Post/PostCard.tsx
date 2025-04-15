import React from 'react';
import { Post } from '../../types/Post';

interface PostCardProps {
  post: Post;
  onClick: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onClick }) => {
  return (
    <div 
      className="border rounded-lg overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition-shadow"
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
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-gray-700 text-sm truncate">{post.caption}</p>
        <p className="text-gray-500 text-xs mt-1">By {post.username}</p>
      </div>
    </div>
  );
};

export default PostCard;