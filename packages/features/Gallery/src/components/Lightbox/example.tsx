import React, { useState } from 'react';
import { Lightbox } from './index';

const LightboxExample: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const sampleImages = [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
  ];

  const handleImageClick = (index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Lightbox Example</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {sampleImages.map((image, index) => (
          <div
            key={index}
            className="cursor-pointer rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
            onClick={() => handleImageClick(index)}
          >
            <img
              src={image}
              alt={`Sample image ${index + 1}`}
              className="w-full h-32 object-cover"
            />
            <div className="p-2 bg-white">
              <p className="text-sm text-gray-600">Click to open lightbox</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Keyboard Shortcuts:</h3>
        <ul className="text-sm space-y-1">
          <li>
            • <kbd className="bg-white px-1 rounded">←</kbd>{' '}
            <kbd className="bg-white px-1 rounded">→</kbd> Navigate images
          </li>
          <li>
            • <kbd className="bg-white px-1 rounded">+</kbd>{' '}
            <kbd className="bg-white px-1 rounded">-</kbd> Zoom in/out
          </li>
          <li>
            • <kbd className="bg-white px-1 rounded">Home</kbd>{' '}
            <kbd className="bg-white px-1 rounded">End</kbd> First/last image
          </li>
          <li>
            • <kbd className="bg-white px-1 rounded">Escape</kbd> Close lightbox
          </li>
        </ul>
      </div>

      {isOpen && (
        <Lightbox
          images={sampleImages}
          currentIndex={currentIndex}
          onClose={handleClose}
        />
      )}
    </div>
  );
};

export default LightboxExample; 