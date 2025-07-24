import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from '../dialog';
import { Button } from '../button';
import { Input } from '../input';
import { Label } from '../label';
import { FileUpload } from '../FileUpload';
const DEFAULT_ACCEPTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp'];
const ImageUploadModal = ({ open, onClose, onSubmit, isLoading = false, onUploadProgress, renderExtraFields, theme = 'light', maxFileSizeMB = 20, acceptedFormats = DEFAULT_ACCEPTED_FORMATS, showTags = true, }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [extra, setExtra] = useState({});
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const handleUpload = useCallback(async (files, metadata) => {
        const file = Array.isArray(files) ? files[0] : files;
        if (!file)
            return;
        setIsUploading(true);
        setError(null);
        setUploadProgress(0);
        try {
            // Simulate upload progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    const newProgress = prev + 10;
                    onUploadProgress?.(newProgress);
                    return newProgress;
                });
            }, 100);
            // Simulate actual upload (replace with real upload logic)
            await new Promise(resolve => setTimeout(resolve, 2000));
            clearInterval(progressInterval);
            setUploadProgress(100);
            onUploadProgress?.(100);
            // Prepare submission data
            const submissionData = {
                file,
                title: title.trim() || metadata?.title || 'Untitled',
                description: description.trim() || metadata?.description || '',
                tags: tags.length > 0 ? tags : metadata?.tags || [],
                extra: { ...extra, ...metadata?.extra },
            };
            onSubmit(submissionData);
            // Reset form
            handleClose();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
            console.error('Image upload error:', err);
        }
        finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    }, [title, description, tags, extra, onUploadProgress, onSubmit]);
    const handleError = useCallback((error) => {
        setError(error);
        console.error('Image upload error:', error);
    }, []);
    const handleClose = useCallback(() => {
        setTitle('');
        setDescription('');
        setTags([]);
        setTagInput('');
        setExtra({});
        setError(null);
        setUploadProgress(0);
        setIsUploading(false);
        onClose();
    }, [onClose]);
    const handleAddTag = useCallback(() => {
        const trimmedTag = tagInput.trim();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            setTags(prev => [...prev, trimmedTag]);
            setTagInput('');
        }
    }, [tagInput, tags]);
    const handleRemoveTag = useCallback((tagToRemove) => {
        setTags(prev => prev.filter(tag => tag !== tagToRemove));
    }, []);
    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    }, [handleAddTag]);
    const metadataFields = [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'text' },
    ];
    return (_jsx(Dialog, { open: open, onOpenChange: handleClose, children: _jsxs(DialogContent, { className: `max-w-2xl ${theme === 'dark' ? 'dark' : ''}`, children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Upload Image" }) }), _jsxs("div", { className: "space-y-6", children: [error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3", children: _jsx("p", { className: "text-sm text-red-800", children: error }) })), isUploading && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex justify-between text-sm text-gray-600", children: [_jsx("span", { children: "Uploading..." }), _jsxs("span", { children: [uploadProgress, "%"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-blue-600 h-2 rounded-full transition-all duration-300", style: { width: `${uploadProgress}%` } }) })] })), _jsx(FileUpload, { onUpload: handleUpload, onError: handleError, accept: acceptedFormats, multiple: false, maxSizeMB: maxFileSizeMB, showPreview: true, metadataFields: metadataFields, uploadButtonLabel: "Select Image", disabled: isLoading || isUploading }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "title", children: "Title *" }), _jsx(Input, { id: "title", value: title, onChange: (e) => setTitle(e.target.value), placeholder: "Enter image title", disabled: isLoading || isUploading })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "description", children: "Description" }), _jsx(Input, { id: "description", value: description, onChange: (e) => setDescription(e.target.value), placeholder: "Enter image description", disabled: isLoading || isUploading })] }), showTags && (_jsxs("div", { children: [_jsx(Label, { htmlFor: "tags", children: "Tags" }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex space-x-2", children: [_jsx(Input, { id: "tags", value: tagInput, onChange: (e) => setTagInput(e.target.value), onKeyPress: handleKeyPress, placeholder: "Add tags (press Enter)", disabled: isLoading || isUploading }), _jsx(Button, { type: "button", variant: "outline", onClick: handleAddTag, disabled: isLoading || isUploading || !tagInput.trim(), children: "Add" })] }), tags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2", children: tags.map((tag, index) => (_jsxs("span", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800", children: [tag, _jsx("button", { type: "button", onClick: () => handleRemoveTag(tag), className: "ml-1 text-blue-600 hover:text-blue-800", disabled: isLoading || isUploading, children: "\u00D7" })] }, index))) }))] })] })), renderExtraFields && (_jsxs("div", { children: [_jsx(Label, { children: "Additional Fields" }), renderExtraFields(extra, setExtra)] }))] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: handleClose, disabled: isLoading || isUploading, children: "Cancel" }), _jsx(Button, { onClick: () => handleUpload([], { title, description, tags, extra }), disabled: isLoading || isUploading || !title.trim(), children: isUploading ? 'Uploading...' : 'Upload Image' })] })] }) }));
};
export default ImageUploadModal;
