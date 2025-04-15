import React, { useState } from 'react';
import { Comment } from '../../types/Comment';
import { useAuth } from '../Auth/AuthContext';
import api from '../../services/api';

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId, comments: initialComments }) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const { user, isAuthenticated } = useAuth();

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
      <div className="flex-1 overflow-y-auto p-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center my-4">No comments yet</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="mb-3">
              <div className="flex">
                <span className="font-medium mr-2">{comment.username}</span>
                <p>{comment.content}</p>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                {new Date(comment.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
      
      {isAuthenticated ? (
        <form onSubmit={handleSubmitComment} className="border-t p-3">
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Add a comment..."
              className="flex-1 border rounded-full px-4 py-2 mr-2"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="bg-blue-500 text-white px-4 py-2 rounded-full disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </form>
      ) : (
        <div className="border-t p-3 text-center">
          <p className="text-gray-500">Log in to comment</p>
        </div>
      )}
    </div>
  );
};

export default CommentSection;