import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import { Avatar, AvatarImage, AvatarFallback, Button } from '@repo/ui';
import { CropModal } from './CropModal.js';
import { cn } from '../lib/utils.js';
export const AvatarUploader = ({ currentAvatarUrl, onUpload, className, disabled = false, }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [showCropModal, setShowCropModal] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState('');
    const fileInputRef = useRef(null);
    const handleFileSelect = (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/heic'];
        if (!validTypes.includes(file.type)) {
            alert('Only .jpg and .heic files are supported');
            return;
        }
        // Validate file size (20MB max)
        const maxSize = 20 * 1024 * 1024; // 20MB
        if (file.size > maxSize) {
            alert('File size must be less than 20MB');
            return;
        }
        // Create URL for preview
        const imageUrl = URL.createObjectURL(file);
        setSelectedImageUrl(imageUrl);
        setShowCropModal(true);
    };
    const handleCropComplete = async (croppedImage) => {
        try {
            setIsUploading(true);
            const avatarUrl = await onUpload(croppedImage);
            // The parent component should handle updating the avatar URL
        }
        catch (error) {
            console.error('Failed to upload avatar:', error);
            alert('Failed to upload avatar. Please try again.');
        }
        finally {
            setIsUploading(false);
            setShowCropModal(false);
            setSelectedImageUrl('');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    const handleRemoveAvatar = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        // Note: This would need to be handled by the parent component
        // to actually remove the avatar from the backend
    };
    const getInitials = (name) => {
        if (!name)
            return 'U';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };
    return (_jsxs("div", { className: cn('flex flex-col items-center space-y-4', className), children: [_jsxs("div", { className: "relative", children: [_jsxs(Avatar, { className: "h-24 w-24", children: [_jsx(AvatarImage, { src: currentAvatarUrl, alt: "Profile avatar", className: "object-cover" }), _jsx(AvatarFallback, { className: "text-lg font-semibold", children: getInitials() })] }), isUploading && (_jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-black/50 rounded-full", children: _jsx("div", { className: "text-white text-sm", children: "Uploading..." }) }))] }), _jsxs("div", { className: "flex space-x-2", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: () => fileInputRef.current?.click(), disabled: disabled || isUploading, children: currentAvatarUrl ? 'Change Avatar' : 'Upload Avatar' }), currentAvatarUrl && (_jsx(Button, { variant: "outline", size: "sm", onClick: handleRemoveAvatar, disabled: disabled || isUploading, children: "Remove" }))] }), _jsx("input", { ref: fileInputRef, type: "file", accept: ".jpg,.jpeg,.heic", onChange: handleFileSelect, className: "hidden", disabled: disabled || isUploading }), _jsx(CropModal, { isOpen: showCropModal, onClose: () => {
                    setShowCropModal(false);
                    setSelectedImageUrl('');
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                }, imageUrl: selectedImageUrl, onCropComplete: handleCropComplete, aspectRatio: 1 })] }));
};
