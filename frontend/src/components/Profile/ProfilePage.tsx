import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthContext';
import api from '../../services/api';
import { Post } from '../../types/Post';
import PostCard from '../Post/PostCard';
import PostDetail from '../Post/PostDetail';
import SessionManagement from './SessionManagement';
import EditProfile from './EditProfile';

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'sessions' | 'edit'>('posts');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/users/${user.id}/posts`);
        setPosts(response.data);
      } catch (error) {
        console.error('Failed to fetch user posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPosts();
  }, [isAuthenticated, user]);

  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-xl">Please log in to view your profile</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-200 mb-4 md:mr-8 md:mb-0"></div>
          <div>
            <h1 className="text-2xl font-bold mb-2">{user.username}</h1>
            <p className="text-gray-600 mb-4">{user.name || ''}</p>
            <div className="flex space-x-4 mb-4">
              <div>
                <span className="font-bold">{posts.length}</span> posts
              </div>
              <div>
                <span className="font-bold">0</span> followers
              </div>
              <div>
                <span className="font-bold">0</span> following
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b mb-6">
        <nav className="flex space-x-8">
          <button
            className={`py-4 font-medium ${
              activeTab === 'posts' ? 'border-b-2 border-black' : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </button>
          <button
            className={`py-4 font-medium ${
              activeTab === 'edit' ? 'border-b-2 border-black' : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('edit')}
          >
            Edit Profile
          </button>
          <button
            className={`py-4 font-medium ${
              activeTab === 'sessions' ? 'border-b-2 border-black' : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('sessions')}
          >
            Sessions
          </button>
        </nav>
      </div>

      {activeTab === 'posts' && (
        <div>
          {loading ? (
            <p className="text-center py-8">Loading...</p>
          ) : posts.length === 0 ? (
            <p className="text-center py-8">No posts yet</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => setSelectedPost(post)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'edit' && <EditProfile user={user} />}
      {activeTab === 'sessions' && <SessionManagement />}

      {selectedPost && (
        <PostDetail
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
};

export default ProfilePage;