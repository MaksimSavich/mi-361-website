export interface User {
  id: string;
  username: string;
  email: string;
  phoneNumber?: string;
  name?: string;
  profilePicture?: string;
  isAdmin?: boolean;
}

// Add new interfaces for follow functionality
export interface UserWithFollowCount extends User {
  followerCount: number;
  followingCount: number;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
}

export interface FollowStatus {
  isFollowing: boolean;
}