import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { Post } from '../../types/Post';
import PostCard from '../Post/PostCard';
import PostDetail from '../Post/PostDetail';

const ContentModeration: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    fetchAllPosts();
  }, []);

  const fetchAllPosts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/posts');
      setPosts(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch posts');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    setError(null);
    setSuccess(null);
    
    try {
      await api.delete(`/admin/posts/${postId}`);
      setSuccess('Post deleted successfully');
      
      // Remove post from list
      setPosts(posts.filter(post => post.id !== postId));
      
      // Close detail view if open
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete post');
      console.error('Error deleting post:', err);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-xl font-semibold ${
          theme === 'dark' ? 'text-white' : 'text-gray-800'
        }`}>Content Moderation</h2>
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
      ) : posts.length === 0 ? (
        <p className={`text-center py-8 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          No posts found
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {posts.map((post) => (
            <div key={post.id} className="relative">
              <PostCard
                post={post}
                onClick={() => setSelectedPost(post)}
              />
              <button
                onClick={() => handleDeletePost(post.id)}
                className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 z-10"
                title="Delete post"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedPost && (
        <PostDetail
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onPostDeleted={() => {
            // Fix: Pass the post ID here
            setPosts(posts.filter(p => p.id !== selectedPost.id));
            setSelectedPost(null);
          }}
          isAdmin={true}
        />
      )}
    </div>
  );
};

export default ContentModeration;