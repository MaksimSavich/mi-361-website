/**
 * Utility functions for video handling
 */

/**
 * Checks if a file is a web-compatible video format
 * @param file The file to check
 * @returns True if the file is a web-compatible video
 */
export const isWebCompatibleVideo = (file: File): boolean => {
    // Check MIME type
    const validMimeTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (!validMimeTypes.includes(file.type)) {
      return false;
    }
    
    return true;
  };
  
  /**
   * Generates a frame from a video to use as a thumbnail
   * @param videoUrl URL of the video
   * @returns Promise resolving to a data URL containing the thumbnail
   */
  export const generateVideoThumbnail = (videoUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Create a video element
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous'; // Required for S3 URLs
      
      // Set up event listeners
      let loadAttempts = 0;
      const maxAttempts = 3;
      
      video.onloadedmetadata = () => {
        // Seek to 1 second or 25% of the video, whichever is less
        video.currentTime = Math.min(1, video.duration * 0.25);
      };
      
      video.onloadeddata = () => {
        generateThumbnail();
      };
      
      video.onerror = () => {
        loadAttempts++;
        if (loadAttempts < maxAttempts) {
          console.log(`Video load attempt ${loadAttempts} failed, retrying...`);
          // Try again with a different currentTime
          video.src = videoUrl;
        } else {
          reject(new Error(`Failed to load video: ${video.error?.message || 'Unknown error'}`));
        }
      };
      
      // Function to actually generate the thumbnail once the video is ready
      const generateThumbnail = () => {
        try {
          // Create a canvas element
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Draw the video frame to the canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert canvas to data URL
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
          
          // Clean up
          video.pause();
          video.src = '';
          video.load();
        } catch (err) {
          reject(err);
        }
      };
      
      // Start loading the video
      video.src = videoUrl;
      video.load();
      
      // Set a timeout in case the video never loads
      setTimeout(() => {
        if (!video.videoWidth) {
          reject(new Error('Video load timeout'));
        }
      }, 10000); // 10 second timeout
    });
  };
  
  /**
   * Tests if a video URL is accessible
   * @param videoUrl URL to test
   * @returns Promise resolving to true if URL is accessible
   */
  export const testVideoUrl = async (videoUrl: string): Promise<boolean> => {
    try {
      const response = await fetch(videoUrl, { 
        method: 'HEAD',
        mode: 'cors',
        credentials: 'omit'
      });
      return response.ok;
    } catch (error) {
      console.error('Error testing video URL:', error);
      return false;
    }
  };
  
  export default {
    isWebCompatibleVideo,
    generateVideoThumbnail,
    testVideoUrl
  };