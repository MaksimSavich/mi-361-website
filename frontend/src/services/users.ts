import api from './api';
import { User, UserWithFollowCount } from '../types/User';

// Search for users
export const searchUsers = async (query: string): Promise<UserWithFollowCount[]> => {
  if (!query.trim()) return [];
  
  const response = await api.get<UserWithFollowCount[]>(`/users/search?q=${encodeURIComponent(query)}`);
  return response.data;
};

// Get user profile
export const getUserProfile = async (userId: string): Promise<UserWithFollowCount> => {
  const response = await api.get<UserWithFollowCount>(`/users/${userId}/profile`);
  return response.data;
};

// Follow a user
export const followUser = async (userId: string): Promise<{ isFollowing: boolean }> => {
  const response = await api.post<{ isFollowing: boolean }>(`/follow/${userId}`);
  return response.data;
};

// Unfollow a user
export const unfollowUser = async (userId: string): Promise<{ isFollowing: boolean }> => {
  const response = await api.delete<{ isFollowing: boolean }>(`/follow/${userId}`);
  return response.data;
};

// Get follow status
export const getFollowStatus = async (userId: string): Promise<{ isFollowing: boolean }> => {
  const response = await api.get<{ isFollowing: boolean }>(`/follow/${userId}/status`);
  return response.data;
};

// Get followers
export const getFollowers = async (userId: string): Promise<UserWithFollowCount[]> => {
  const response = await api.get<UserWithFollowCount[]>(`/follow/${userId}/followers`);
  return response.data;
};

// Get following
export const getFollowing = async (userId: string): Promise<UserWithFollowCount[]> => {
  const response = await api.get<UserWithFollowCount[]>(`/follow/${userId}/following`);
  return response.data;
};

// Get following feed
export const getFollowingFeed = async (): Promise<any[]> => {
  const response = await api.get('/follow/feed');
  return response.data;
};

export default {
  searchUsers,
  getUserProfile,
  followUser,
  unfollowUser,
  getFollowStatus,
  getFollowers,
  getFollowing,
  getFollowingFeed
};