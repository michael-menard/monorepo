import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@repo/ui';
import { Button } from '@repo/ui';
import type { CropModalProps } from '../types/index';

interface CroppedAreaPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Type assertion to fix TypeScript error
const CropperComponent = Cropper as any;

export const CropModal: React.FC<CropModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onCropComplete,
  aspectRatio = 1,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedAreaPixels | null>(null);

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteCallback = useCallback(
    (croppedArea: any, croppedAreaPixels: CroppedAreaPixels) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const createCroppedImage = async (): Promise<File> => {
    return new Promise((resolve, reject) => {
      if (!croppedAreaPixels) {
        reject(new Error('No cropped area available'));
        return;
      }

      const image = new Image();
      image.src = imageUrl;
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        const { width, height } = croppedAreaPixels;
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(
          image,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          width,
          height,
          0,
          0,
          width,
          height
        );

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], 'avatar.jpg', {
                type: 'image/jpeg',
              });
              resolve(file);
            } else {
              reject(new Error('Could not create blob'));
            }
          },
          'image/jpeg',
          0.9
        );
      };
      image.onerror = () => reject(new Error('Could not load image'));
    });
  };

  const handleSave = async () => {
    try {
      const croppedImage = await createCroppedImage();
      onCropComplete(croppedImage);
    } catch (error) {
      console.error('Error creating cropped image:', error);
      alert('Failed to crop image. Please try again.');
    }
  };

  const handleClose = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop Avatar</DialogTitle>
        </DialogHeader>
        
        <div className="relative h-96 w-full">
          <CropperComponent
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteCallback}
            showGrid={false}
            style={{
              containerStyle: {
                width: '100%',
                height: '100%',
                backgroundColor: '#f3f4f6',
              },
            }}
          />
        </div>

        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium">Zoom:</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm text-gray-500">{Math.round(zoom * 100)}%</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 