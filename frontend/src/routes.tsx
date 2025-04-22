// frontend/src/routes.tsx
import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import ProfilePage from './components/Profile/ProfilePage';
import UserProfilePage from './pages/UserProfilePage'; // Add this import
import FollowingFeedPage from './pages/FollowingFeedPage'; // Add this import
import AdminPage from './components/Admin/AdminPage';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import { AuthProvider } from './components/Auth/AuthContext';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/profile',
        element: <ProfilePage />,
      },
      {
        path: '/users/:id',
        element: <UserProfilePage />, // Add this route
      },
      {
        path: '/feed',
        element: <FollowingFeedPage />, // Add this route
      },
      {
        path: '/admin',
        element: <AdminPage />,
      },
      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '/register',
        element: <Register />,
      },
    ],
  },
]);

const Routes: React.FC = () => {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
};

export default Routes;