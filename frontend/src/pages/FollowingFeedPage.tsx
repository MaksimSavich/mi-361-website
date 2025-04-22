// frontend/src/pages/FollowingFeedPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/Auth/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getFollowingFeed } from '../services/users';
import { Post } from '../types/Post';
import PostCard from '../components/Post/PostCard';
import PostDetail from '../components/Post/PostDetail';

const FollowingFeedPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Load following feed
  useEffect(() => {
    const fetchFollowingFeed = async () => {
      if (!isAuthenticated) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const feedPosts = await getFollowingFeed();
        setPosts(feedPosts);
      } catch (err) {
        console.error('Failed to fetch following feed:', err);
        setError('Failed to load feed');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFollowingFeed();
  }, [isAuthenticated]);

  // Handle post deletion
  const handlePostDeleted = (postId: string) => {
    setPosts(posts.filter(post => post.id !== postId));
    setSelectedPost(null);
  };
  
  // Handle post updates (including likes)
  const handlePostUpdated = (updatedPost: Post) => {
    // Update the post in our state
    setPosts(posts.map(post => 
      post.id === updatedPost.id ? updatedPost : post
    ));
    
    // If this is the currently selected post, update it too
    if (selectedPost && selectedPost.id === updatedPost.id) {
      setSelectedPost(updatedPost);
    }
  };

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className={`text-2xl font-bold mb-6 ${
        theme === 'dark' ? 'text-white' : 'text-gray-800'
      }`}>Following Feed</h1>

      {error && (
        <div className={`border px-4 py-3 rounded mb-6 ${
          theme === 'dark'
            ? 'bg-red-900 border-red-800 text-red-200'
            : 'bg-red-100 border-red-400 text-red-700'
        }`}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center my-12">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
            theme === 'dark' ? 'border-accent-dark' : 'border-primary-light'
          }`}></div>
        </div>
      ) : posts.length === 0 ? (
        <div className={`text-center py-12 ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" 
            className="mx-auto w-16 h-16 mb-4 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          <h2 className={`text-2xl font-bold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>Your feed is empty</h2>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Follow people to see their posts in your feed
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onClick={() => setSelectedPost(post)}
              onPostUpdated={handlePostUpdated}
            />
          ))}
        </div>
      )}

      {selectedPost && (
        <PostDetail
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onPostDeleted={() => handlePostDeleted(selectedPost.id)}
          onPostUpdated={handlePostUpdated}
        />
      )}
    </div>
  );
};

export default FollowingFeedPage;