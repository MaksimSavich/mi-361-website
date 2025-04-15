import React, { useState } from 'react';
import { User } from '../../types/User';
import api from '../../services/api';

interface EditProfileProps {
  user: User;
}

const EditProfile: React.FC<EditProfileProps> = ({ user }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email,
    phoneNumber: user.phoneNumber || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setUpdating(true);

    try {
      // Update basic profile information
      await api.put('/users/me', {
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
      });

      setSuccess('Profile updated successfully');
    } catch (err) {
      setError('Failed to update profile');
      console.error('Profile update error:', err);
    } finally {
      setUpdating(false);
    }
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setUpdating(true);

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      setUpdating(false);
      return;
    }

    try {
      await api.put('/users/me/password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      setSuccess('Password updated successfully');
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (err) {
      setError('Failed to update password. Check your current password.');
      console.error('Password update error:', err);
    } finally {
      setUpdating(false);
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      await api.delete('/users/me');
      // Redirect to home page or login after account deletion
      window.location.href = '/';
    } catch (err) {
      setError('Failed to delete account');
      console.error('Account deletion error:', err);
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={updateProfile} className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Edit Profile Information</h2>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Phone Number</label>
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        
        <button
          type="submit"
          disabled={updating}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {updating ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
      
      <form onSubmit={updatePassword}>
        <h2 className="text-xl font-semibold mb-4">Change Password</h2>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Current Password</label>
          <input
            type="password"
            name="currentPassword"
            value={formData.currentPassword}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">New Password</label>
          <input
            type="password"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Confirm New Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        
        <button
          type="submit"
          disabled={updating}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {updating ? 'Updating...' : 'Change Password'}
        </button>
      </form>
      
      <div className="mt-12 pt-6 border-t">
        <h2 className="text-xl font-semibold mb-4 text-red-600">Danger Zone</h2>
        <button
          type="button"
          onClick={deleteAccount}
          disabled={updating}
          className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Delete My Account
        </button>
        <p className="mt-2 text-sm text-gray-600">
          This will permanently delete your account and all your content.
        </p>
      </div>
    </div>
  );
};

export default EditProfile;
