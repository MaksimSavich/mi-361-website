import api from './api';
import { Post } from '../types/Post';

// Get all posts
export const getPosts = async (): Promise<Post[]> => {
  const response = await api.get<Post[]>('/posts');
  return response.data;
};

// Get a specific post
export const getPost = async (postId: string): Promise<Post> => {
  const response = await api.get<Post>(`/posts/${postId}`);
  return response.data;
};

// Like a post
export const likePost = async (postId: string): Promise<{ likes: number; liked: boolean }> => {
  const response = await api.post<{ likes: number; liked: boolean }>(`/posts/${postId}/like`);
  return response.data;
};

// Unlike a post
export const unlikePost = async (postId: string): Promise<{ likes: number; liked: boolean }> => {
  const response = await api.delete<{ likes: number; liked: boolean }>(`/posts/${postId}/like`);
  return response.data;
};

// Get like status for a post
export const getLikeStatus = async (postId: string): Promise<{ likes: number; liked: boolean }> => {
  const response = await api.get<{ likes: number; liked: boolean }>(`/posts/${postId}/like`);
  return response.data;
};

// Export default for easier importing
export default {
  getPosts,
  getPost,
  likePost,
  unlikePost,
  getLikeStatus
};