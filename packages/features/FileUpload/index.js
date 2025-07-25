import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useRef, useCallback } from 'react';
import { Button } from '../button';
import { Input } from '../input';
import { Label } from '../label';
import { cn } from '../lib/utils';
import { useFileUpload, useMetadataFields, useDragAndDrop, MetadataField } from './hooks';
export const FileUpload = ({ accept = 'image/*', maxSizeMB = 20, multiple = false, showPreview = true, showCropper = false, cropAspectRatio = 1, onUpload, onRemove, onError, metadataFields = [], mode = 'inline', initialFiles = [], uploadButtonLabel = 'Upload Files', disabled = false, className, dragAreaClassName, previewClassName, }) => {
    const fileInputRef = useRef(null);
    // Custom hooks
    const { state: fileState, actions: fileActions } = useFileUpload({ accept, maxSizeMB, multiple, onError: onError || undefined }, onUpload);
    const { state: metadataState, actions: metadataActions } = useMetadataFields(metadataFields);
    const { state: dragState, actions: dragActions } = useDragAndDrop();
    // Initialize with initial files if provided
    React.useEffect(() => {
        if (initialFiles.length > 0) {
            fileActions.addFiles(initialFiles);
        }
    }, [initialFiles, fileActions]);
    const handleFileInputChange = useCallback((e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            fileActions.addFiles(files);
        }
        // Reset input value to allow selecting the same file again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [fileActions]);
    const handleRemoveFile = useCallback((file) => {
        fileActions.removeFile(file);
        onRemove?.(file);
    }, [fileActions, onRemove]);
    const handleUpload = useCallback(async () => {
        if (!metadataState.isValid) {
            metadataActions.validateAll();
            return;
        }
        const metadata = metadataFields.length > 0 ? metadataState.values : undefined;
        await fileActions.upload(metadata);
    }, [fileActions, metadataState, metadataActions, metadataFields]);
    const handleDrop = useCallback((e) => {
        dragActions.handleDrop(e, fileActions.addFiles);
    }, [dragActions, fileActions]);
    const openFileDialog = useCallback(() => {
        fileInputRef.current?.click();
    }, []);
    const getDragAreaClassNames = () => {
        const baseClasses = 'border-2 border-dashed rounded-lg p-6 text-center transition-colors';
        const dragClasses = dragState.isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400';
        const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
        return cn(baseClasses, dragClasses, disabledClasses, dragAreaClassName);
    };
    const getPreviewClassNames = () => {
        return cn('mt-4 space-y-2', previewClassName);
    };
    return (_jsxs("div", { className: cn('space-y-4', className), children: [_jsx("input", { ref: fileInputRef, type: "file", accept: Array.isArray(accept) ? accept.join(',') : accept, multiple: multiple, onChange: handleFileInputChange, className: "hidden", disabled: disabled }), _jsx("div", { className: getDragAreaClassNames(), onClick: !disabled ? openFileDialog : undefined, ...dragActions.dragAreaProps, onDrop: handleDrop, children: _jsxs("div", { className: "space-y-2", children: [_jsxs("p", { className: "text-sm text-gray-600", children: ["Drop files here or ", _jsx("span", { className: "text-blue-600 hover:text-blue-800", children: "browse" })] }), _jsxs("p", { className: "text-xs text-gray-500", children: [Array.isArray(accept) ? accept.join(', ') : accept, " \u2022 Max ", maxSizeMB, "MB", multiple ? ' • Multiple files allowed' : ''] })] }) }), fileState.errors.length > 0 && (_jsx("div", { className: "space-y-1", children: fileState.errors.map((error, index) => (_jsx("p", { className: "text-sm text-red-600", children: error }, index))) })), showPreview && fileState.files.length > 0 && (_jsxs("div", { className: getPreviewClassNames(), children: [_jsxs("h4", { className: "font-medium text-sm text-gray-700", children: ["Selected Files (", fileState.files.length, ")"] }), _jsx("div", { className: "space-y-2", children: fileState.files.map((file, index) => (_jsxs("div", { className: "flex items-center justify-between p-2 bg-gray-50 rounded", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "text-sm text-gray-700", children: file.name }), _jsxs("span", { className: "text-xs text-gray-500", children: ["(", (file.size / 1024 / 1024).toFixed(2), " MB)"] })] }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => handleRemoveFile(file), disabled: disabled, children: "Remove" })] }, index))) })] })), metadataFields.length > 0 && fileState.files.length > 0 && (_jsxs("div", { className: "space-y-4", children: [_jsx("h4", { className: "font-medium text-sm text-gray-700", children: "Additional Information" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: metadataFields.map((field) => (_jsxs("div", { className: "space-y-1", children: [_jsxs(Label, { htmlFor: field.name, className: "text-sm", children: [field.label, " ", field.required && '*'] }), field.type === 'select' ? (_jsxs("select", { id: field.name, value: metadataState.values[field.name] || '', onChange: (e) => metadataActions.updateField(field.name, e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", disabled: disabled, children: [_jsxs("option", { value: "", children: ["Select ", field.label] }), field.options?.map((option) => (_jsx("option", { value: option, children: option }, option)))] })) : (_jsx(Input, { id: field.name, type: field.type, value: metadataState.values[field.name] || '', onChange: (e) => metadataActions.updateField(field.name, e.target.value), disabled: disabled })), metadataState.errors[field.name] && (_jsx("p", { className: "text-xs text-red-600", children: metadataState.errors[field.name] }))] }, field.name))) })] })), fileState.files.length > 0 && (_jsx("div", { className: "flex justify-end", children: _jsx(Button, { onClick: handleUpload, disabled: disabled || fileState.isUploading || !metadataState.isValid, className: "min-w-[120px]", children: fileState.isUploading ? 'Uploading...' : uploadButtonLabel }) }))] }));
};
