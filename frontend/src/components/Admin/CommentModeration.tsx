import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { Comment } from '../../types/Comment';

interface CommentWithPostDetails extends Comment {
  postTitle?: string;
  postId: string;
}

const CommentModeration: React.FC = () => {
  const [comments, setComments] = useState<CommentWithPostDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    fetchAllComments();
  }, []);

  const fetchAllComments = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/comments');
      setComments(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch comments');
      console.error('Error fetching comments:', err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return;
    }

    setError(null);
    setSuccess(null);
    
    try {
      await api.delete(`/admin/comments/${commentId}`);
      setSuccess('Comment deleted successfully');
      
      // Remove comment from list
      setComments(comments.filter(comment => comment.id !== commentId));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete comment');
      console.error('Error deleting comment:', err);
    }
  };

  // Use comments?.length to safely check length
  const hasComments = Array.isArray(comments) && comments.length > 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-xl font-semibold ${
          theme === 'dark' ? 'text-white' : 'text-gray-800'
        }`}>Comment Moderation</h2>
      </div>
      
      {error && (
        <div className={`border px-4 py-3 rounded mb-4 ${
          theme === 'dark'
            ? 'bg-red-900 border-red-800 text-red-200'
            : 'bg-red-100 border-red-400 text-red-700'
        }`}>
          {error}
        </div>
      )}
      
      {success && (
        <div className={`border px-4 py-3 rounded mb-4 ${
          theme === 'dark'
            ? 'bg-green-900 border-green-800 text-green-200'
            : 'bg-green-100 border-green-400 text-green-700'
        }`}>
          {success}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
            theme === 'dark' ? 'border-accent-dark' : 'border-primary-light'
          }`}></div>
        </div>
      ) : !hasComments ? (
        <p className={`text-center py-8 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          No comments found
        </p>
      ) : (
        <div className={`rounded-lg shadow overflow-hidden ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={`${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  User
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Content
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Post
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Date
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${
              theme === 'dark' ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'
            }`}>
              {comments.map((comment) => (
                <tr key={comment.id} className={
                  theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }>
                  <td className={`px-6 py-4 whitespace-nowrap ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {comment.username}
                  </td>
                  <td className={`px-6 py-4 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="max-w-md truncate">
                      {comment.content}
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <a 
                      href={`#/post/${comment.postId}`}
                      className={`hover:underline ${
                        theme === 'dark' ? 'text-accent-dark' : 'text-primary-dark'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        // TODO: Implement post view navigation
                      }}
                    >
                      {comment.postTitle || `Post ${comment.postId.substring(0, 8)}...`}
                    </a>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {new Date(comment.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className={`${
                        theme === 'dark' 
                          ? 'text-red-400 hover:text-red-300' 
                          : 'text-red-600 hover:text-red-800'
                      }`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CommentModeration;