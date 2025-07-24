import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose, } from '@repo/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@repo/ui/form';
import { Input } from '@repo/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@repo/ui/select';
import { Button } from '@repo/ui/button';
import { FileUpload } from '@repo/ui';
const CATEGORIES = [
    'Star Wars',
    'Castle',
    'City',
    'Technic',
    'Friends',
    'Harry Potter',
    'Super Heroes',
    'Creator',
    'Ninjago',
    'Other',
];
const FormSchema = WishlistItemSchema.omit({ sortOrder: true }).extend({
    imageFile: z.any().optional(), // File or undefined
});
export const AddEditWishlistModal = ({ open, onClose, onSubmit, initialValues = {}, isEdit = false, }) => {
    const [imagePreview, setImagePreview] = useState(initialValues.imageUrl);
    const form = useForm({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            title: initialValues.title || '',
            description: initialValues.description || '',
            productLink: initialValues.productLink || '',
            category: initialValues.category || '',
            imageUrl: initialValues.imageUrl || '',
            imageFile: undefined,
        },
        mode: 'onChange',
    });
    // TEMP DEBUG LOG
    // eslint-disable-next-line no-console
    console.log('formState', {
        isValid: form.formState.isValid,
        errors: form.formState.errors,
        dirtyFields: form.formState.dirtyFields,
        touchedFields: form.formState.touchedFields,
    });
    const handleFileUpload = async (files) => {
        const file = Array.isArray(files) ? files[0] : files;
        if (file) {
            setImagePreview(URL.createObjectURL(file));
            form.setValue('imageFile', file);
        }
    };
    const handleSubmit = async (values) => {
        await onSubmit(values);
        onClose();
    };
    return (_jsx(Dialog, { open: open, onOpenChange: v => { if (!v)
            onClose(); }, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: isEdit ? 'Edit Wishlist Item' : 'Add Wishlist Item' }), _jsx(DialogDescription, { children: isEdit ? 'Update the details for this wishlist item.' : 'Fill out the form to add a new wishlist item.' })] }), _jsx(Form, { ...form, children: _jsxs("form", { onSubmit: form.handleSubmit(handleSubmit), className: "space-y-4", children: [_jsx(FormField, { name: "title", control: form.control, render: ({ field }) => (_jsxs(FormItem, { children: [_jsx(FormLabel, { children: "Title" }), _jsx(FormControl, { children: _jsx(Input, { ...field, placeholder: "Set name", required: true }) }), _jsx(FormMessage, {})] })) }), _jsx(FormField, { name: "description", control: form.control, render: ({ field }) => (_jsxs(FormItem, { children: [_jsx(FormLabel, { children: "Description" }), _jsx(FormControl, { children: _jsx(Input, { ...field, placeholder: "Description" }) }), _jsx(FormMessage, {})] })) }), _jsx(FormField, { name: "productLink", control: form.control, render: ({ field }) => (_jsxs(FormItem, { children: [_jsx(FormLabel, { children: "Product Link" }), _jsx(FormControl, { children: _jsx(Input, { ...field, placeholder: "https://..." }) }), _jsx(FormMessage, {})] })) }), _jsx(FormField, { name: "category", control: form.control, render: ({ field }) => (_jsxs(FormItem, { children: [_jsx(FormLabel, { children: "Category" }), _jsx(FormControl, { children: _jsxs(Select, { value: field.value, onValueChange: field.onChange, required: true, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select category" }) }), _jsx(SelectContent, { children: CATEGORIES.map(cat => (_jsx(SelectItem, { value: cat, children: cat }, cat))) })] }) }), _jsx(FormMessage, {})] })) }), _jsxs("div", { children: [_jsx(FormLabel, { children: "Image" }), _jsx(FileUpload, { accept: "image/*", maxSizeMB: 5, multiple: false, showPreview: false, onUpload: handleFileUpload, uploadButtonLabel: imagePreview ? 'Change Image' : 'Upload Image' }), imagePreview && (_jsx("img", { src: imagePreview, alt: "Preview", className: "mt-2 w-32 h-32 object-cover rounded border" })), _jsx(FormMessage, {})] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "submit", disabled: form.formState.isSubmitting || !form.formState.isValid, children: isEdit ? 'Save Changes' : 'Add Item' }), _jsx(DialogClose, { asChild: true, children: _jsx(Button, { type: "button", variant: "outline", children: "Cancel" }) })] })] }) })] }) }));
};
export default AddEditWishlistModal;
