import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui';
import { FileUpload } from '../../../../FileUpload';
import {
  createWishlistItemSchema,
  updateWishlistItemSchema,
  type CreateWishlistItem,
  type UpdateWishlistItem,
  type WishlistItem,
} from '../../schemas';
import {
  useCreateWishlistItemMutation,
  useUpdateWishlistItemMutation,
} from '../../store/wishlistApi';

export interface AddEditWishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  wishlistId: string;
  item?: WishlistItem; // If provided, we're editing; if not, we're creating
  onSuccess?: (item: WishlistItem) => void;
}

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const categoryOptions = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'books', label: 'Books' },
  { value: 'home', label: 'Home & Garden' },
  { value: 'sports', label: 'Sports & Outdoors' },
  { value: 'toys', label: 'Toys & Games' },
  { value: 'beauty', label: 'Beauty & Health' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'other', label: 'Other' },
];

export const AddEditWishlistModal: React.FC<AddEditWishlistModalProps> = ({
  isOpen,
  onClose,
  wishlistId,
  item,
  onSuccess,
}) => {
  const isEditing = !!item;
  const schema = isEditing ? updateWishlistItemSchema : createWishlistItemSchema;

  const form = useForm<CreateWishlistItem | UpdateWishlistItem>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item?.name || '',
      description: item?.description || '',
      price: item?.price || undefined,
      url: item?.url || '',
      imageUrl: item?.imageUrl || '',
      priority: item?.priority || 'medium',
      category: item?.category || '',
      isPurchased: item?.isPurchased || false,
    },
  });

  const [createItem, { isLoading: isCreating }] = useCreateWishlistItemMutation();
  const [updateItem, { isLoading: isUpdating }] = useUpdateWishlistItemMutation();

  const isLoading = isCreating || isUpdating;

  const onSubmit = async (data: CreateWishlistItem | UpdateWishlistItem) => {
    try {
      if (isEditing && item) {
        const result = await updateItem({
          wishlistId,
          itemId: item.id,
          data: data as UpdateWishlistItem,
        }).unwrap();
        onSuccess?.(result);
      } else {
        const result = await createItem({
          wishlistId,
          data: data as CreateWishlistItem,
        }).unwrap();
        onSuccess?.(result);
      }
      onClose();
      form.reset();
    } catch (error) {
      console.error('Failed to save wishlist item:', error);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      form.reset();
    }
  };

  const handleImageUpload = (files: File[]) => {
    if (files.length > 0) {
      // In a real implementation, you would upload the file to your server
      // and get back a URL. For now, we'll create a temporary URL
      const file = files[0];
      const imageUrl = window.URL.createObjectURL(file);
      form.setValue('imageUrl', imageUrl);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Wishlist Item' : 'Add Wishlist Item'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details of your wishlist item.' : 'Add a new item to your wishlist.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter item name" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter item description"
                      className="resize-none"
                      rows={3}
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Link</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://example.com/product" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <FileUpload
                        accept="image/*"
                        maxSizeMB={5}
                        multiple={false}
                        showPreview={true}
                        onUpload={handleImageUpload}
                        uploadButtonLabel="Upload Image"
                        disabled={isLoading}
                      />
                      {field.value && (
                        <div className="mt-2">
                          <img
                            src={field.value}
                            alt="Item preview"
                            className="w-20 h-20 object-cover rounded-md border"
                          />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? isEditing
                    ? 'Updating...'
                    : 'Creating...'
                  : isEditing
                    ? 'Update Item'
                    : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditWishlistModal; 