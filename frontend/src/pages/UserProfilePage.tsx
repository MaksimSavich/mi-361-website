import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/Auth/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getUserProfile, followUser, unfollowUser, getFollowers, getFollowing, getFollowStatus } from '../services/users';
import { UserWithFollowCount } from '../types/User';
import { Post } from '../types/Post';
import PostCard from '../components/Post/PostCard';
import PostDetail from '../components/Post/PostDetail';
import api from '../services/api';
import FollowButton from '../components/User/FollowButton';


const UserProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  const [user, setUser] = useState<UserWithFollowCount | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [followers, setFollowers] = useState<UserWithFollowCount[]>([]);
  const [following, setFollowing] = useState<UserWithFollowCount[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'posts' | 'followers' | 'following'>(
    initialTab === 'followers' || initialTab === 'following' ? initialTab : 'posts'
  );


  // Don't allow viewing your own profile this way
  useEffect(() => {
    if (id === currentUser?.id) {
      navigate('/profile');
    }
  }, [id, currentUser, navigate]);

  // Load user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const userData = await getUserProfile(id);
        setUser(userData);
        
        // Important: Also check the follow status explicitly
        if (isAuthenticated) {
          const followStatus = await getFollowStatus(id);
          // Update user with explicit follow status
          setUser(prevUser => prevUser ? {
            ...prevUser,
            isFollowing: followStatus.isFollowing
          } : null);
        }
        
        // Fetch user's posts
        const response = await api.get(`/users/${id}/posts`);
        setPosts(response.data || []);
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        setError('Failed to load user profile');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [id, isAuthenticated]);

  // Load followers or following when tab changes
  useEffect(() => {
    const fetchTabData = async () => {
      if (!id || activeTab === 'posts') return;
      
      setTabLoading(true);
      try {
        if (activeTab === 'followers') {
          const data = await getFollowers(id);
          setFollowers(data || []);
        } else if (activeTab === 'following') {
          const data = await getFollowing(id);
          setFollowing(data || []);
        }
      } catch (err) {
        console.error(`Failed to fetch ${activeTab}:`, err);
        if (activeTab === 'followers') {
          setFollowers([]);
        } else {
          setFollowing([]);
        }
      } finally {
        setTabLoading(false);
      }
    };
    
    fetchTabData();
  }, [id, activeTab]);

  const handleFollow = async () => {
    if (!isAuthenticated || !user) return;
    
    setFollowLoading(true);
    try {
      if (user.isFollowing) {
        await unfollowUser(user.id);
        setUser({ ...user, isFollowing: false, followerCount: user.followerCount - 1 });
      } else {
        await followUser(user.id);
        setUser({ ...user, isFollowing: true, followerCount: user.followerCount + 1 });
      }
    } catch (err) {
      console.error('Failed to update follow status:', err);
    } finally {
      setFollowLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center my-12">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
            theme === 'dark' ? 'border-accent-dark' : 'border-primary-light'
          }`}></div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className={`text-center py-8 ${
          theme === 'dark' ? 'text-red-400' : 'text-red-600'
        }`}>
          {error || 'User not found'}
        </div>
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
            <div className="flex items-center">
              <h1 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>{user.username}</h1>
              
              {isAuthenticated && currentUser?.id !== user.id && (
                <FollowButton
                    userId={user.id}
                    isFollowing={!!user.isFollowing}
                    onFollowChanged={(following) => {
                    setUser({
                        ...user,
                        isFollowing: following,
                        followerCount: following ? user.followerCount + 1 : user.followerCount - 1
                    });
                    }}
                    className="ml-4"
                />
                )}
            </div>
            
            {user.name && (
              <p className={theme === 'dark' ? 'text-gray-300 mb-4' : 'text-gray-600 mb-4'}>
                {user.name}
              </p>
            )}
            
            <div className={`flex space-x-6 mt-4 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <button 
                onClick={() => setActiveTab('posts')}
                className="focus:outline-none"
              >
                <span className="font-bold">{posts.length}</span> posts
              </button>
              <button 
                onClick={() => setActiveTab('followers')}
                className="focus:outline-none"
              >
                <span className="font-bold">{user.followerCount}</span> followers
              </button>
              <button 
                onClick={() => setActiveTab('following')}
                className="focus:outline-none"
              >
                <span className="font-bold">{user.followingCount}</span> following
              </button>
            </div>
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
        </nav>
      </div>

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <div>
          {posts.length === 0 ? (
            <div className={`text-center py-8 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" 
                className="mx-auto w-16 h-16 mb-4 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              <p className="text-lg">No posts yet</p>
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

      {/* Followers Tab */}
      {activeTab === 'followers' && (
        <div>
          {tabLoading ? (
            <div className="flex justify-center py-8">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
                theme === 'dark' ? 'border-accent-dark' : 'border-primary-light'
              }`}></div>
            </div>
          ) : (followers || []).length === 0 ? (
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
                        <button
                          onClick={() => {
                            if (follower.id === currentUser?.id) {
                              navigate('/profile');
                            } else {
                              navigate(`/users/${follower.id}`);
                            }
                          }}
                          className={`text-sm font-medium hover:underline ${
                            theme === 'dark' ? 'text-white' : 'text-gray-800'
                          }`}
                        >
                          {follower.username}
                        </button>
                        {follower.name && (
                          <p className={`text-xs ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {follower.name}
                          </p>
                        )}
                        {follower.isFollowedBy && (
                          <p className={`text-xs mt-1 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            Follows you
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {isAuthenticated && currentUser?.id !== follower.id && (
                      <button
                        className={`px-4 py-1 text-sm rounded-full ${
                          follower.isFollowing
                            ? theme === 'dark'
                              ? 'bg-gray-700 text-white border border-gray-600'
                              : 'bg-gray-200 text-gray-800 border border-gray-300'
                            : theme === 'dark'
                              ? 'bg-accent-dark text-white'
                              : 'bg-primary-light text-white'
                        }`}
                      >
                        {follower.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Following Tab */}
      {activeTab === 'following' && (
        <div>
          {tabLoading ? (
            <div className="flex justify-center py-8">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
                theme === 'dark' ? 'border-accent-dark' : 'border-primary-light'
              }`}></div>
            </div>
          ) : (following || []).length === 0 ? (
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
                        <button
                          onClick={() => {
                            if (followedUser.id === currentUser?.id) {
                              navigate('/profile');
                            } else {
                              navigate(`/users/${followedUser.id}`);
                            }
                          }}
                          className={`text-sm font-medium hover:underline ${
                            theme === 'dark' ? 'text-white' : 'text-gray-800'
                          }`}
                        >
                          {followedUser.username}
                        </button>
                        {followedUser.name && (
                          <p className={`text-xs ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {followedUser.name}
                          </p>
                        )}
                        {followedUser.isFollowedBy && (
                          <p className={`text-xs mt-1 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            Follows you
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {isAuthenticated && currentUser?.id !== followedUser.id && (
                      <button
                        className={`px-4 py-1 text-sm rounded-full ${
                          followedUser.isFollowing
                            ? theme === 'dark'
                              ? 'bg-gray-700 text-white border border-gray-600'
                              : 'bg-gray-200 text-gray-800 border border-gray-300'
                            : theme === 'dark'
                              ? 'bg-accent-dark text-white'
                              : 'bg-primary-light text-white'
                        }`}
                      >
                        {followedUser.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedPost && (
        <PostDetail
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onPostDeleted={handlePostDeleted}
          onPostUpdated={handlePostUpdated}
        />
      )}
    </div>
  );
};

export default UserProfilePage;