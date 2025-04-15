import React, { useState, useRef } from 'react';
import { useAuth } from '../Auth/AuthContext';
import api from '../../services/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose }) => {
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated } = useAuth();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // Check file type
    const fileType = selectedFile.type.split('/')[0];
    if (fileType !== 'image' && fileType !== 'video') {
      setError('Please select an image or video file');
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (e.dataTransfer.files?.length) {
      const droppedFile = e.dataTransfer.files[0];
      const fileType = droppedFile.type.split('/')[0];
      
      if (fileType !== 'image' && fileType !== 'video') {
        setError('Please select an image or video file');
        return;
      }
      
      setFile(droppedFile);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !file || !caption.trim()) {
      return;
    }
    
    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caption', caption);
    
    try {
      await api.post('/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setCaption('');
      setFile(null);
      setPreview(null);
      onClose();
      
      // Refresh the feed or update state in parent component if needed
    } catch (err) {
      setError('Failed to upload. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg overflow-hidden max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b py-3 px-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Create new post</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-4">
            {!file ? (
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className="mb-2 text-gray-700">Drag photos and videos here</p>
                <p className="text-sm text-gray-500">Or click to select from your device</p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,video/*" 
                  className="hidden" 
                />
              </div>
            ) : (
              <div className="mb-4">
                {preview && (
                  <div className="relative pb-[56.25%] bg-black mb-4">
                    {file.type.startsWith('image/') ? (
                      <img 
                        src={preview} 
                        alt="Preview" 
                        className="absolute top-0 left-0 w-full h-full object-contain"
                      />
                    ) : (
                      <video 
                        src={preview} 
                        className="absolute top-0 left-0 w-full h-full object-contain"
                        controls
                      />
                    )}
                  </div>
                )}
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption..."
                  className="w-full border rounded p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
                <div className="flex justify-between mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                    }}
                    className="text-red-500"
                  >
                    Remove
                  </button>
                  <span className="text-xs text-gray-500">
                    {file.type.startsWith('image/') ? 'Image' : 'Video'}: {file.name}
                  </span>
                </div>
              </div>
            )}
            
            {error && (
              <div className="text-red-500 text-sm mb-4">
                {error}
              </div>
            )}
          </div>
          
          <div className="border-t py-3 px-4 flex justify-end">
            <button
              type="submit"
              disabled={!file || !caption.trim() || uploading}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Share'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;