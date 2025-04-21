import { Comment } from './Comment';

export interface Post {
  id: string;
  userId: string;
  username: string;
  caption: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: string;
  likes: number;
  liked?: boolean; // new field to track if the current user liked the post
  comments: Comment[];
  thumbnailUrl?: string;
}