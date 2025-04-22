export interface User {
  id: string;
  username: string;
  email: string;
  phoneNumber?: string;
  name?: string;
  profilePicture?: string;
  isAdmin?: boolean;
}