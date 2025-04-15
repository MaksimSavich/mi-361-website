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
  comments: Comment[];
}