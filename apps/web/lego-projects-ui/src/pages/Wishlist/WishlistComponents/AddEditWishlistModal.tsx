import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../../../ui/src/dialog.js';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '../../../ui/src/form.js';
import { Input } from '../../../ui/src/input.js';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../ui/src/select.js';
import { Button } from '../../../ui/src/button.js';
import { FileUpload } from '../../../ui/src/index.js';
// @ts-expect-error: TypeScript cannot resolve .js import for WishlistSchemas, but it exists and is correct for NodeNext/ESM
import type { WishlistItemSchema } from '../../WishlistSchemas/index.js';

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

export type AddEditWishlistFormValues = z.infer<typeof FormSchema>;

export interface AddEditWishlistModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: AddEditWishlistFormValues) => void | Promise<void>;
  initialValues?: Partial<AddEditWishlistFormValues>;
  isEdit?: boolean;
}

export const AddEditWishlistModal: React.FC<AddEditWishlistModalProps> = ({
  open,
  onClose,
  onSubmit,
  initialValues = {},
  isEdit = false,
}) => {
  const [imagePreview, setImagePreview] = useState<string | undefined>(initialValues.imageUrl);
  const form = useForm<AddEditWishlistFormValues>({
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

  const handleFileUpload = async (files: File[] | File) => {
    const file = Array.isArray(files) ? files[0] : files;
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      form.setValue('imageFile', file);
    }
  };

  const handleSubmit = async (values: AddEditWishlistFormValues) => {
    await onSubmit(values);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Wishlist Item' : 'Add Wishlist Item'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the details for this wishlist item.' : 'Fill out the form to add a new wishlist item.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField name="title" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Set name" required />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField name="description" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Description" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField name="productLink" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Product Link</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField name="category" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div>
              <FormLabel>Image</FormLabel>
              <FileUpload
                accept="image/*"
                maxSizeMB={5}
                multiple={false}
                showPreview={false}
                onUpload={handleFileUpload}
                uploadButtonLabel={imagePreview ? 'Change Image' : 'Upload Image'}
              />
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded border" />
              )}
              <FormMessage />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isValid}>
                {isEdit ? 'Save Changes' : 'Add Item'}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditWishlistModal; 