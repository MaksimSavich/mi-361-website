import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../Auth/AuthContext';
import api from '../../services/api';
import { Post } from '../../types/Post';
import PostCard from '../Post/PostCard';
import PostDetail from '../Post/PostDetail';
import SessionManagement from './SessionManagement';
import EditProfile from './EditProfile';
import { useTheme } from '../../context/ThemeContext';

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'followers' | 'following' | 'sessions' | 'edit'>('posts');
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const { theme } = useTheme();
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/users/${user.id}/posts`);
        setPosts(response.data || []);
      } catch (error) {
        console.error('Failed to fetch user posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPosts();
  }, [isAuthenticated, user]);

  // Fetch follower and following counts
  useEffect(() => {
    const fetchFollowCounts = async () => {
      if (!isAuthenticated || !user) {
        return;
      }

      try {
        // Get follower count
        const followersResponse = await api.get(`/follow/${user.id}/followers`);
        setFollowerCount(followersResponse.data.length);
        
        // Get following count
        const followingResponse = await api.get(`/follow/${user.id}/following`);
        setFollowingCount(followingResponse.data.length);
      } catch (error) {
        console.error('Failed to fetch follow counts:', error);
      }
    };

    fetchFollowCounts();
  }, [isAuthenticated, user]);

  // Load followers and following data when the respective tab is active
  useEffect(() => {
    const fetchTabData = async () => {
      if (!isAuthenticated || !user || (activeTab !== 'followers' && activeTab !== 'following')) return;
      
      setTabLoading(true);
      try {
        if (activeTab === 'followers') {
          const response = await api.get(`/follow/${user.id}/followers`);
          setFollowers(response.data || []);
        } else if (activeTab === 'following') {
          const response = await api.get(`/follow/${user.id}/following`);
          setFollowing(response.data || []);
        }
      } catch (err) {
        console.error(`Failed to fetch ${activeTab}:`, err);
      } finally {
        setTabLoading(false);
      }
    };
    
    fetchTabData();
  }, [isAuthenticated, user, activeTab]);

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

  if (!isAuthenticated || !user) {
    return (
      <div className={`container mx-auto px-4 py-8 text-center ${
        theme === 'dark' ? 'text-white' : 'text-gray-800'
      }`}>
        <p className="text-xl">Please log in to view your profile</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start">
          <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center mb-4 md:mr-8 md:mb-0 ${
            theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
          }`}>
            {user.profilePicture ? (
              <img 
                src={user.profilePicture} 
                alt={user.username} 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-4xl font-semibold">
                {user.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h1 className={`text-2xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>{user.username}</h1>
            <p className={theme === 'dark' ? 'text-gray-300 mb-4' : 'text-gray-600 mb-4'}>
              {user.name || ''}
            </p>
            <div className={`flex space-x-6 mb-4 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <div>
                <span className="font-bold">{posts.length}</span> posts
              </div>
              <button onClick={() => setActiveTab('followers')} className="hover:underline">
                <span className="font-bold">{followerCount}</span> followers
              </button>
              <button onClick={() => setActiveTab('following')} className="hover:underline">
                <span className="font-bold">{followingCount}</span> following
              </button>
            </div>
            
            <Link to="/feed" className={`inline-block px-4 py-2 rounded-full text-sm ${
              theme === 'dark'
                ? 'bg-accent-dark text-white'
                : 'bg-primary-light text-white'
            }`}>
              View Following Feed
            </Link>
          </div>
        </div>
      </div>

      <div className={`border-b mb-6 ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <nav className="flex space-x-8">
          <button
            className={`py-4 font-medium ${
              activeTab === 'posts' 
                ? theme === 'dark' 
                  ? 'border-b-2 border-white text-white' 
                  : 'border-b-2 border-black text-black'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </button>
          <button
            className={`py-4 font-medium ${
              activeTab === 'followers'
                ? theme === 'dark' 
                  ? 'border-b-2 border-white text-white' 
                  : 'border-b-2 border-black text-black'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('followers')}
          >
            Followers
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
          <button
            className={`py-4 font-medium ${
              activeTab === 'edit'
                ? theme === 'dark' 
                  ? 'border-b-2 border-white text-white' 
                  : 'border-b-2 border-black text-black'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('edit')}
          >
            Edit Profile
          </button>
          <button
            className={`py-4 font-medium ${
              activeTab === 'sessions'
                ? theme === 'dark' 
                  ? 'border-b-2 border-white text-white' 
                  : 'border-b-2 border-black text-black'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
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
            <div className="flex justify-center py-8">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
                theme === 'dark' ? 'border-accent-dark' : 'border-primary-light'
              }`}></div>
            </div>
          ) : posts.length === 0 ? (
            <div className={`text-center py-8 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" 
                className="mx-auto w-16 h-16 mb-4 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              <p className="text-lg">No posts yet</p>
              <p className="mt-2">Upload your first photo or video</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
        </div>
      )}

      {activeTab === 'followers' && (
        <div>
          {tabLoading ? (
            <div className="flex justify-center py-8">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
                theme === 'dark' ? 'border-accent-dark' : 'border-primary-light'
              }`}></div>
            </div>
          ) : followers.length === 0 ? (
            <div className={`text-center py-8 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <p className="text-lg">No followers yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {followers.map(follower => (
                <div key={follower.id} className={`p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${
                        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                      }`}>
                        {follower.profilePicture ? (
                          <img
                            src={follower.profilePicture}
                            alt={follower.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className={`text-lg font-medium ${
                            theme === 'dark' ? 'text-white' : 'text-gray-800'
                          }`}>
                            {follower.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="ml-3">
                        <Link
                          to={`/users/${follower.id}`}
                          className={`text-sm font-medium hover:underline ${
                            theme === 'dark' ? 'text-white' : 'text-gray-800'
                          }`}
                        >
                          {follower.username}
                        </Link>
                        {follower.name && (
                          <p className={`text-xs ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {follower.name}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {follower.id !== user.id && (
                      <div>
                        {follower.isFollowing ? (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            theme === 'dark' 
                              ? 'bg-gray-700 text-gray-300' 
                              : 'bg-gray-200 text-gray-800'
                          }`}>
                            Following
                          </span>
                        ) : (
                          <button
                            className={`px-4 py-1 text-xs rounded-full ${
                              theme === 'dark'
                                ? 'bg-accent-dark text-white'
                                : 'bg-primary-light text-white'
                            }`}
                            onClick={() => {
                              // Follow logic here
                            }}
                          >
                            Follow
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'following' && (
        <div>
          {tabLoading ? (
            <div className="flex justify-center py-8">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
                theme === 'dark' ? 'border-accent-dark' : 'border-primary-light'
              }`}></div>
            </div>
          ) : following.length === 0 ? (
            <div className={`text-center py-8 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <p className="text-lg">Not following anyone yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {following.map(followedUser => (
                <div key={followedUser.id} className={`p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${
                        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                      }`}>
                        {followedUser.profilePicture ? (
                          <img
                            src={followedUser.profilePicture}
                            alt={followedUser.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className={`text-lg font-medium ${
                            theme === 'dark' ? 'text-white' : 'text-gray-800'
                          }`}>
                            {followedUser.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="ml-3">
                        <Link
                          to={`/users/${followedUser.id}`}
                          className={`text-sm font-medium hover:underline ${
                            theme === 'dark' ? 'text-white' : 'text-gray-800'
                          }`}
                        >
                          {followedUser.username}
                        </Link>
                        {followedUser.name && (
                          <p className={`text-xs ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {followedUser.name}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <button
                      className={`px-4 py-1 text-xs rounded-full ${
                        theme === 'dark'
                          ? 'bg-gray-700 text-white border border-gray-600'
                          : 'bg-gray-200 text-gray-800 border border-gray-300'
                      }`}
                      onClick={() => {
                        // Unfollow logic here
                      }}
                    >
                      Following
                    </button>
                  </div>
                </div>
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
          onPostDeleted={() => handlePostDeleted(selectedPost.id)}
          onPostUpdated={handlePostUpdated}
        />
      )}
    </div>
  );
};

export default ProfilePage;