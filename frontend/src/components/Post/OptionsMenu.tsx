import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTheme } from '../../context/ThemeContext';

interface OptionsMenuProps {
  isOwner: boolean;
  onDelete: () => void;
  onEdit?: () => void;
  position?: 'left' | 'right';
  size?: 'sm' | 'md';
  usePortal?: boolean; // Whether to render dropdown outside of scroll container
}

const OptionsMenu: React.FC<OptionsMenuProps> = ({ 
  isOwner, 
  onDelete, 
  onEdit, 
  position = 'right',
  size = 'md',
  usePortal = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, right: 0 });
  const { theme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Function to calculate dropdown position
  const calculateDropdownPosition = () => {
    if (buttonRef.current && usePortal) {
      const rect = buttonRef.current.getBoundingClientRect();
      
      // Calculate positioning
      if (position === 'left') {
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: 0, // Not used for 'left' position
          right: window.innerWidth - rect.left - window.scrollX
        });
      } else {
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          right: 0 // Not used for 'right' position
        });
      }
    }
  };

  // Handle toggle dropdown
  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop event from propagating
    if (!isOpen) {
      calculateDropdownPosition();
    }
    setIsOpen(!isOpen);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Skip if menu isn't open
      if (!isOpen) return;
      
      // Check if click is outside menu and button
      const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(event.target as Node);
      const clickedOutsideButton = buttonRef.current && !buttonRef.current.contains(event.target as Node);
      
      if (clickedOutsideMenu && clickedOutsideButton) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (isOpen && usePortal) {
        calculateDropdownPosition();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, usePortal]);

  // Don't render anything if user is not the owner
  if (!isOwner) {
    return null;
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop event from propagating
    // Ask for confirmation
    if (window.confirm('Are you sure you want to delete this?')) {
      onDelete();
    }
    setIsOpen(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop event from propagating
    if (onEdit) {
      onEdit();
    }
    setIsOpen(false);
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const buttonSize = size === 'sm' ? 'p-1' : 'p-2';

  // Render dropdown menu
  const renderDropdown = () => {
    if (!isOpen) return null;

    const dropdownContent = (
      <div 
        ref={usePortal ? undefined : menuRef}
        className={`${usePortal ? 'fixed z-50' : 'absolute z-50'} w-32 rounded-md shadow-lg py-1 ${
          position === 'left' ? 'right-0' : 'left-0'
        } ${
          theme === 'dark'
            ? 'bg-gray-800 border border-gray-700'
            : 'bg-white border border-gray-200'
        }`}
        style={usePortal ? {
          top: `${dropdownPosition.top}px`,
          ...(position === 'left' 
            ? { right: `${dropdownPosition.right}px` } 
            : { left: `${dropdownPosition.left}px` })
        } : undefined}
        onClick={(e) => e.stopPropagation()} // Stop clicks on dropdown from closing the detail view
      >
        {onEdit && (
          <button
            type="button"
            onClick={handleEdit}
            className={`flex items-center w-full px-4 py-2 text-sm ${
              theme === 'dark'
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={1.5} 
              stroke="currentColor" 
              className="w-4 h-4 mr-2"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" 
              />
            </svg>
            Edit
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          className={`flex items-center w-full px-4 py-2 text-sm ${
            theme === 'dark'
              ? 'text-red-400 hover:bg-gray-700'
              : 'text-red-600 hover:bg-gray-100'
          }`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={1.5} 
            stroke="currentColor" 
            className="w-4 h-4 mr-2"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" 
            />
          </svg>
          Delete
        </button>
      </div>
    );

    // Use React Portal for fixed positioning, otherwise render in-place
    if (usePortal && typeof document !== 'undefined') {
      return ReactDOM.createPortal(
        dropdownContent,
        document.body
      );
    }

    return dropdownContent;
  };

  return (
    <div 
      className={usePortal ? undefined : "relative"} 
      ref={usePortal ? menuRef : undefined}
      onClick={(e) => e.stopPropagation()} // Prevent clicks from propagating
    >
      <button
        type="button"
        ref={buttonRef}
        onClick={toggleDropdown}
        className={`rounded-full ${buttonSize} ${
          theme === 'dark' 
            ? 'hover:bg-gray-700' 
            : 'hover:bg-gray-100'
        }`}
        aria-label="Options"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={1.5} 
          stroke="currentColor" 
          className={iconSize}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" 
          />
        </svg>
      </button>

      {renderDropdown()}
    </div>
  );
};

export default OptionsMenu;