import React, { useState, useEffect } from 'react';
import { Post } from '../types/Post';
import PostCard from '../components/Post/PostCard';
import PostDetail from '../components/Post/PostDetail';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { getFollowingFeed } from '../services/users';
import { useAuth } from '../components/Auth/AuthContext';

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'following'>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [followingLoading, setFollowingLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followingError, setFollowingError] = useState<string | null>(null);
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await api.get('/posts');
        setPosts(response.data || []);  // Provide empty array fallback
      } catch (err) {
        setError('Failed to fetch posts. Please try again later.');
        console.error('Error fetching posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Fetch following posts when authenticated user selects the following tab
  useEffect(() => {
    if (isAuthenticated && activeTab === 'following') {
      const fetchFollowingPosts = async () => {
        setFollowingLoading(true);
        setFollowingError(null);
        
        try {
          const data = await getFollowingFeed();
          setFollowingPosts(data);
        } catch (err) {
          setFollowingError('Failed to fetch following feed.');
          console.error('Error fetching following feed:', err);
        } finally {
          setFollowingLoading(false);
        }
      };
      
      fetchFollowingPosts();
    }
  }, [isAuthenticated, activeTab]);

  // Find the full post details when a post card is clicked
  const findPostById = (postId: string) => {
    const allPosts = [...posts, ...followingPosts];
    return allPosts.find(post => post.id === postId) || null;
  };

  // Handle post deletion
  const handlePostDeleted = (postId: string) => {
    setPosts(posts.filter(post => post.id !== postId));
    setFollowingPosts(followingPosts.filter(post => post.id !== postId));
    setSelectedPost(null);
  };
  
  // Handle post updates (including likes)
  const handlePostUpdated = (updatedPost: Post) => {
    // Update the post in both arrays (if it exists there)
    setPosts(prevPosts => prevPosts.map(post => 
      post.id === updatedPost.id ? {
        ...post,
        likes: updatedPost.likes,
        liked: updatedPost.liked
      } : post
    ));
    
    // Also update following posts
    setFollowingPosts(prevPosts => prevPosts.map(post => 
      post.id === updatedPost.id ? {
        ...post,
        likes: updatedPost.likes,
        liked: updatedPost.liked
      } : post
    ));
    
    // Update selected post if it's currently being viewed
    if (selectedPost && selectedPost.id === updatedPost.id) {
      setSelectedPost(updatedPost);
    }
  };

  // Current posts based on active tab
  const currentPosts = activeTab === 'all' ? (posts || []) : (followingPosts || []);
  const currentLoading = activeTab === 'all' ? loading : followingLoading;
  const currentError = activeTab === 'all' ? error : followingError;

  return (
    <div className="container mx-auto px-4 py-8">
      {isAuthenticated && (
        <div className={`border-b mb-6 ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <nav className="flex space-x-8">
            <button
              className={`py-4 font-medium ${
                activeTab === 'all' 
                  ? theme === 'dark' 
                    ? 'border-b-2 border-white text-white' 
                    : 'border-b-2 border-black text-black'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-500 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('all')}
            >
              All Posts
            </button>
            <button
              className={`py-4 font-medium ${
                activeTab === 'following'
                  ? theme === 'dark' 
                    ? 'border-b-2 border-white text-white' 
                    : 'border-b-2 border-black text-black'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-500 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('following')}
            >
              Following
            </button>
          </nav>
        </div>
      )}

      {currentError && (
        <div className={`border px-4 py-3 rounded mb-6 ${
          theme === 'dark'
            ? 'bg-red-900 border-red-800 text-red-200'
            : 'bg-red-100 border-red-400 text-red-700'
        }`}>
          {currentError}
        </div>
      )}

      {currentLoading ? (
        <div className="flex justify-center my-12">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
            theme === 'dark' ? 'border-accent-dark' : 'border-primary-light'
          }`}></div>
        </div>
      ) : currentPosts.length === 0 ? (
        <div className={`text-center py-12 ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          {activeTab === 'following' ? (
            <>
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
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" 
                className="mx-auto w-16 h-16 mb-4 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <h2 className={`text-2xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>No posts yet</h2>
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                Be the first to share your photos and videos!
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentPosts.map((post) => (
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

export default HomePage;