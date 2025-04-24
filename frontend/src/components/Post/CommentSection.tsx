import React, { useState } from 'react';
import { Comment } from '../../types/Comment';
import { useAuth } from '../Auth/AuthContext';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import OptionsMenu from './OptionsMenu';

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  onPostUpdate?: () => void;
  isAdmin?: boolean; // Add this prop
}

const CommentSection: React.FC<CommentSectionProps> = ({ 
  postId, 
  comments: initialComments = [],
  onPostUpdate,
  isAdmin = false // Default to false
}) => {
  // Initialize with empty array if initialComments is undefined
  const [comments, setComments] = useState<Comment[]>(initialComments || []);
  const [newComment, setNewComment] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
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
      
      // Update local comments state
      const updatedComments = [...comments, response.data];
      setComments(updatedComments);
      setNewComment('');
      
      // After adding a comment, fetch the complete post to ensure we have the latest data
      try {
        const postResponse = await api.get(`/posts/${postId}`);
        
        // Notify parent component with the updated post data
        if (onPostUpdate) {
          onPostUpdate();
        }
      } catch (err) {
        console.error('Failed to fetch updated post after comment:', err);
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  };
  
  const handleDeleteComment = async (commentId: string) => {
    if (!isAuthenticated) return;
    
    setIsDeleting(true);
    try {
      // Use admin endpoint if isAdmin is true
      const endpoint = isAdmin 
        ? `/admin/comments/${commentId}` 
        : `/posts/comments/${commentId}`;
        
      await api.delete(endpoint);
      
      // Update comments list
      setComments(comments.filter(comment => comment.id !== commentId));
      
      // Notify parent component if needed
      if (onPostUpdate) {
        onPostUpdate();
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Failed to delete comment. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditedContent(comment.content);
  };
  
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditedContent('');
  };
  
  const handleSaveComment = async (commentId: string) => {
    if (!isAuthenticated || !editedContent.trim()) return;
    
    setIsUpdating(true);
    try {
      const response = await api.put(`/posts/comments/${commentId}`, {
        content: editedContent
      });
      
      // Update the comment in the comments list
      setComments(comments.map(comment => 
        comment.id === commentId ? { ...response.data } : comment
      ));
      
      // Reset editing state
      setEditingCommentId(null);
      setEditedContent('');
      
      // Notify parent component if needed
      if (onPostUpdate) {
        onPostUpdate();
      }
    } catch (error) {
      console.error('Failed to update comment:', error);
      alert('Failed to update comment. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Check if user is owner of a comment
  const isCommentOwner = (comment: Comment) => {
    return isAdmin || (isAuthenticated && user?.id === comment.userId);
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
              <div className="flex justify-between items-start group">
                <div className="flex-1">
                  {editingCommentId === comment.id ? (
                    <div>
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className={`w-full border rounded p-2 text-sm resize-none focus:outline-none ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-800'
                        }`}
                        rows={2}
                      />
                      <div className="flex justify-end mt-1 space-x-2">
                        <button
                          onClick={handleCancelEdit}
                          className={`px-2 py-1 rounded text-xs ${
                            theme === 'dark'
                              ? 'bg-gray-600 text-white'
                              : 'bg-gray-200 text-gray-800'
                          }`}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveComment(comment.id)}
                          disabled={isUpdating || !editedContent.trim()}
                          className={`px-2 py-1 rounded text-xs disabled:opacity-50 ${
                            theme === 'dark'
                              ? 'bg-accent-dark text-white'
                              : 'bg-primary-light text-white'
                          }`}
                        >
                          {isUpdating ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
                
                {/* Comment Options Menu */}
                {editingCommentId !== comment.id && (
                  <div className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                    isDeleting || isUpdating ? 'pointer-events-none' : ''
                  }`}>
                    <OptionsMenu 
                      isOwner={isCommentOwner(comment)}
                      onDelete={() => handleDeleteComment(comment.id)}
                      onEdit={() => handleEditComment(comment)}
                      size="sm"
                    />
                  </div>
                )}
              </div>
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