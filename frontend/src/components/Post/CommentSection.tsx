import React, { useState } from 'react';
import { Comment } from '../../types/Comment';
import { useAuth } from '../Auth/AuthContext';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId, comments: initialComments }) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !newComment.trim()) {
      return;
    }
    
    try {
      const response = await api.post(`/posts/${postId}/comments`, {
        content: newComment,
      });
      
      setComments([...comments, response.data]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className={`flex-1 overflow-y-auto p-4 ${
        theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
      }`}>
        {comments.length === 0 ? (
          <p className={`text-center my-4 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>No comments yet</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="mb-4">
              <div className="flex">
                <span className={`font-medium mr-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>{comment.username}</span>
                <p>{comment.content}</p>
              </div>
              <p className={`text-xs mt-1 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {new Date(comment.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
      
      {isAuthenticated ? (
        <form onSubmit={handleSubmitComment} className={`border-t p-3 ${
          theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Add a comment..."
              className={`flex-1 rounded-full px-4 py-2 mr-2 ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                  : 'bg-gray-100 border-gray-200 text-gray-800 placeholder-gray-500'
              }`}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className={`px-4 py-2 rounded-full disabled:opacity-50 ${
                theme === 'dark'
                  ? 'bg-accent-dark text-white'
                  : 'bg-primary-light text-white'
              }`}
            >
              Post
            </button>
          </div>
        </form>
      ) : (
        <div className={`border-t p-3 text-center ${
          theme === 'dark' 
            ? 'border-gray-800 text-gray-400' 
            : 'border-gray-200 text-gray-500'
        }`}>
          <p>Log in to comment</p>
        </div>
      )}
    </div>
  );
};

export default CommentSection;