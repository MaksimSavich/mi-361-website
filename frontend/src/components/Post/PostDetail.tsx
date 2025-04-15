import React, { useState } from 'react';
import { Post } from '../../types/Post';
import { Comment } from '../../types/Comment'; // Add this import
import CommentSection from './CommentSection';

interface PostDetailProps {
  post: Post;
  onClose: () => void;
}

const PostDetail: React.FC<PostDetailProps> = ({ post, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);

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
        className="bg-white rounded-lg overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col md:flex-row"
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
          <div className="p-4 border-b">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 mr-3"></div>
              <p className="font-medium">{post.username}</p>
            </div>
            <p>{post.caption}</p>
          </div>
          
          <CommentSection 
            postId={post.id} 
            comments={post.comments as Comment[]} // Add type assertion here
          />
        </div>
      </div>
    </div>
  );
};

export default PostDetail;