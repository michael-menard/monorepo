import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, } from '@repo/ui';
import { Button } from '@repo/ui';
// Type assertion to fix TypeScript error
const CropperComponent = Cropper;
export const CropModal = ({ isOpen, onClose, imageUrl, onCropComplete, aspectRatio = 1, }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const onCropChange = useCallback((crop) => {
        setCrop(crop);
    }, []);
    const onZoomChange = useCallback((zoom) => {
        setZoom(zoom);
    }, []);
    const onCropCompleteCallback = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);
    const createCroppedImage = async () => {
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
                ctx.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, width, height, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], 'avatar.jpg', {
                            type: 'image/jpeg',
                        });
                        resolve(file);
                    }
                    else {
                        reject(new Error('Could not create blob'));
                    }
                }, 'image/jpeg', 0.9);
            };
            image.onerror = () => reject(new Error('Could not load image'));
        });
    };
    const handleSave = async () => {
        try {
            const croppedImage = await createCroppedImage();
            onCropComplete(croppedImage);
        }
        catch (error) {
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
    return (_jsx(Dialog, { open: isOpen, onOpenChange: handleClose, children: _jsxs(DialogContent, { className: "max-w-2xl", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Crop Avatar" }) }), _jsx("div", { className: "relative h-96 w-full", children: _jsx(CropperComponent, { image: imageUrl, crop: crop, zoom: zoom, aspect: aspectRatio, onCropChange: onCropChange, onZoomChange: onZoomChange, onCropComplete: onCropCompleteCallback, showGrid: false, style: {
                            containerStyle: {
                                width: '100%',
                                height: '100%',
                                backgroundColor: '#f3f4f6',
                            },
                        } }) }), _jsxs("div", { className: "flex items-center space-x-4", children: [_jsx("label", { className: "text-sm font-medium", children: "Zoom:" }), _jsx("input", { type: "range", min: 1, max: 3, step: 0.1, value: zoom, onChange: (e) => setZoom(Number(e.target.value)), className: "flex-1" }), _jsxs("span", { className: "text-sm text-gray-500", children: [Math.round(zoom * 100), "%"] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: handleClose, children: "Cancel" }), _jsx(Button, { onClick: handleSave, children: "Save" })] })] }) }));
};
