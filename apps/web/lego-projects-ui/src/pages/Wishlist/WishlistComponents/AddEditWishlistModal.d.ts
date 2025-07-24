import React from 'react';
import { z } from 'zod';
declare const FormSchema: any;
export type AddEditWishlistFormValues = z.infer<typeof FormSchema>;
export interface AddEditWishlistModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (values: AddEditWishlistFormValues) => void | Promise<void>;
    initialValues?: Partial<AddEditWishlistFormValues>;
    isEdit?: boolean;
}
export declare const AddEditWishlistModal: React.FC<AddEditWishlistModalProps>;
export default AddEditWishlistModal;
