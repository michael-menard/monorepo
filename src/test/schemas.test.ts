import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Import all schemas from packages
import {
  UserSchema,
  AuthResponseSchema,
  LoginSchema,
  SignupSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
} from '../../packages/auth/src/schemas';

import {
  GalleryImageFormSchema,
  AlbumFormSchema,
} from '../../packages/features/gallery/src/schemas';

import {
  wishlistItemSchema,
  wishlistSchema,
  createWishlistItemSchema,
  updateWishlistItemSchema,
  createWishlistSchema,
  updateWishlistSchema,
  dragDropSchema,
  wishlistFilterSchema,
} from '../../packages/wishlist/src/schemas';

import {
  profileSchema,
  createProfileSchema,
  updateProfileSchema,
  avatarUploadSchema,
  profileFormSchema,
  passwordChangeSchema,
  emailChangeSchema,
  deleteAccountSchema,
} from '../../packages/features/profile/src/schemas';

import {
  mocStepSchema,
  mocInstructionSchema,
  createMocInstructionSchema,
  updateMocInstructionSchema,
  createMocStepSchema,
  updateMocStepSchema,
  mocImageUploadSchema,
  mocFilterSchema,
  mocReviewSchema,
  createMocReviewSchema,
  updateMocReviewSchema,
  mocPartsListSchema,
  createMocPartsListSchema,
  updateMocPartsListSchema,
} from '../../packages/features/moc-instructions/src/schemas';

describe('Zod Validation Schemas', () => {
  describe('Auth Package Schemas', () => {
    describe('UserSchema', () => {
      it('should validate valid user data', () => {
        const validUser = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          passwordHash: 'hashedpassword123',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          isVerified: true,
        };

        const result = UserSchema.safeParse(validUser);
        expect(result.success).toBe(true);
      });

      it('should reject invalid email', () => {
        const invalidUser = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'invalid-email',
          firstName: 'John',
          lastName: 'Doe',
          passwordHash: 'hashedpassword123',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          isVerified: true,
        };

        const result = UserSchema.safeParse(invalidUser);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('email');
        }
      });
    });

    describe('AuthResponseSchema', () => {
      it('should validate valid auth response', () => {
        const validResponse = {
          user: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            passwordHash: 'hashedpassword123',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            isVerified: true,
          },
          token: 'jwt-token-here',
          refreshToken: 'refresh-token-here',
          expiresIn: 3600,
        };

        const result = AuthResponseSchema.safeParse(validResponse);
        expect(result.success).toBe(true);
      });
    });

    describe('LoginSchema', () => {
      it('should validate valid login data', () => {
        const validLogin = {
          email: 'test@example.com',
          password: 'password123',
        };

        const result = LoginSchema.safeParse(validLogin);
        expect(result.success).toBe(true);
      });

      it('should reject short password', () => {
        const invalidLogin = {
          email: 'test@example.com',
          password: '123',
        };

        const result = LoginSchema.safeParse(invalidLogin);
        expect(result.success).toBe(false);
      });
    });

    describe('SignupSchema', () => {
      it('should validate valid signup data', () => {
        const validSignup = {
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          password: 'password123',
          confirmPassword: 'password123',
        };

        const result = SignupSchema.safeParse(validSignup);
        expect(result.success).toBe(true);
      });

      it('should reject mismatched passwords', () => {
        const invalidSignup = {
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          password: 'password123',
          confirmPassword: 'differentpassword',
        };

        const result = SignupSchema.safeParse(invalidSignup);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Gallery Package Schemas', () => {
    describe('GalleryImageFormSchema', () => {
      it('should validate valid image form data', () => {
        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const validImageForm = {
          title: 'Test Image',
          description: 'A test image',
          tags: ['test', 'image'],
          file: mockFile,
          fileType: 'image/jpeg' as const,
          fileSize: 1024 * 1024, // 1MB
        };

        const result = GalleryImageFormSchema.safeParse(validImageForm);
        expect(result.success).toBe(true);
      });

      it('should reject empty title', () => {
        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const invalidImageForm = {
          title: '',
          description: 'A test image',
          tags: ['test', 'image'],
          file: mockFile,
          fileType: 'image/jpeg' as const,
          fileSize: 1024 * 1024,
        };

        const result = GalleryImageFormSchema.safeParse(invalidImageForm);
        expect(result.success).toBe(false);
      });
    });

    describe('AlbumFormSchema', () => {
      it('should validate valid album form data', () => {
        const validAlbumForm = {
          title: 'Test Album',
          description: 'A test album',
          tags: ['test', 'album'],
        };

        const result = AlbumFormSchema.safeParse(validAlbumForm);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Wishlist Package Schemas', () => {
    describe('wishlistItemSchema', () => {
      it('should validate valid wishlist item', () => {
        const validItem = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Item',
          description: 'A test item',
          price: 29.99,
          url: 'https://example.com/item',
          imageUrl: 'https://example.com/image.jpg',
          priority: 'medium' as const,
          category: 'electronics',
          isPurchased: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = wishlistItemSchema.safeParse(validItem);
        expect(result.success).toBe(true);
      });

      it('should reject item without name', () => {
        const invalidItem = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: '',
          description: 'A test item',
          price: 29.99,
          priority: 'medium' as const,
          isPurchased: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = wishlistItemSchema.safeParse(invalidItem);
        expect(result.success).toBe(false);
      });
    });

    describe('wishlistSchema', () => {
      it('should validate valid wishlist', () => {
        const validWishlist = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Wishlist',
          description: 'A test wishlist',
          items: [],
          isPublic: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = wishlistSchema.safeParse(validWishlist);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Profile Package Schemas', () => {
    describe('profileSchema', () => {
      it('should validate valid profile data', () => {
        const validProfile = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          username: 'johndoe',
          bio: 'A test bio',
          avatar: 'https://example.com/avatar.jpg',
          phone: '+1234567890',
          dateOfBirth: new Date('1990-01-01'),
          location: 'New York, NY',
          website: 'https://johndoe.com',
          socialLinks: {
            twitter: 'https://twitter.com/johndoe',
            linkedin: 'https://linkedin.com/in/johndoe',
            github: 'https://github.com/johndoe',
            instagram: 'https://instagram.com/johndoe',
          },
          preferences: {
            emailNotifications: true,
            pushNotifications: false,
            publicProfile: true,
            theme: 'dark' as const,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = profileSchema.safeParse(validProfile);
        expect(result.success).toBe(true);
      });

      it('should reject invalid email', () => {
        const invalidProfile = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          firstName: 'John',
          lastName: 'Doe',
          email: 'invalid-email',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = profileSchema.safeParse(invalidProfile);
        expect(result.success).toBe(false);
      });
    });

    describe('avatarUploadSchema', () => {
      it('should validate valid avatar upload', () => {
        const mockFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
        const validUpload = {
          file: mockFile,
        };

        const result = avatarUploadSchema.safeParse(validUpload);
        expect(result.success).toBe(true);
      });
    });

    describe('passwordChangeSchema', () => {
      it('should validate valid password change', () => {
        const validPasswordChange = {
          currentPassword: 'oldpassword123',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123',
        };

        const result = passwordChangeSchema.safeParse(validPasswordChange);
        expect(result.success).toBe(true);
      });

      it('should reject mismatched passwords', () => {
        const invalidPasswordChange = {
          currentPassword: 'oldpassword123',
          newPassword: 'newpassword123',
          confirmPassword: 'differentpassword',
        };

        const result = passwordChangeSchema.safeParse(invalidPasswordChange);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('MOC Package Schemas', () => {
    describe('mocInstructionSchema', () => {
      it('should validate valid MOC instruction', () => {
        const validInstruction = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'LEGO Spaceship',
          description: 'A detailed spaceship model',
          author: 'John Builder',
          category: 'vehicles',
          difficulty: 'intermediate' as const,
          estimatedTime: 4,
          totalParts: 500,
          tags: ['spaceship', 'sci-fi'],
          coverImage: 'https://example.com/cover.jpg',
          steps: [
            {
              id: '123e4567-e89b-12d3-a456-426614174001',
              stepNumber: 1,
              title: 'Build the base',
              description: 'Start with the main body',
              estimatedTime: 30,
              difficulty: 'easy' as const,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          partsList: [
            {
              partNumber: '3001',
              quantity: 10,
              color: 'white',
              description: '2x4 brick',
              category: 'bricks',
            },
          ],
          isPublic: true,
          isPublished: true,
          rating: 4.5,
          reviewCount: 12,
          downloadCount: 150,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = mocInstructionSchema.safeParse(validInstruction);
        if (!result.success) {
          console.log('MOC Instruction validation errors:', result.error.issues);
        }
        expect(result.success).toBe(true);
      });

      it('should reject instruction without title', () => {
        const invalidInstruction = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: '',
          description: 'A detailed spaceship model',
          author: 'John Builder',
          category: 'vehicles',
          difficulty: 'intermediate' as const,
          steps: [
            {
              id: 'step-1',
              stepNumber: 1,
              title: 'Build the base',
              description: 'Start with the main body',
              estimatedTime: 30,
              difficulty: 'easy' as const,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          partsList: [],
          isPublic: true,
          isPublished: true,
          reviewCount: 0,
          downloadCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = mocInstructionSchema.safeParse(invalidInstruction);
        expect(result.success).toBe(false);
      });
    });

    describe('mocImageUploadSchema', () => {
      it('should validate valid MOC image upload', () => {
        const mockFile = new File(['test'], 'step.jpg', { type: 'image/jpeg' });
        const validUpload = {
          file: mockFile,
          type: 'step' as const,
          stepNumber: 1,
        };

        const result = mocImageUploadSchema.safeParse(validUpload);
        expect(result.success).toBe(true);
      });
    });

    describe('mocReviewSchema', () => {
      it('should validate valid MOC review', () => {
        const validReview = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          mocId: '123e4567-e89b-12d3-a456-426614174001',
          userId: '123e4567-e89b-12d3-a456-426614174002',
          rating: 5,
          title: 'Great MOC!',
          comment: 'This is an excellent build',
          pros: ['Detailed instructions', 'Good parts list'],
          cons: ['Some parts hard to find'],
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = mocReviewSchema.safeParse(validReview);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Schema Type Exports', () => {
    it('should export all required schemas', () => {
      // This test ensures that all schemas are properly exported
      expect(typeof UserSchema).toBe('object');
      expect(typeof AuthResponseSchema).toBe('object');
      expect(typeof GalleryImageFormSchema).toBe('object');
      expect(typeof AlbumFormSchema).toBe('object');
      expect(typeof wishlistItemSchema).toBe('object');
      expect(typeof profileSchema).toBe('object');
      expect(typeof avatarUploadSchema).toBe('object');
      expect(typeof mocInstructionSchema).toBe('object');
      expect(typeof mocImageUploadSchema).toBe('object');
    });
  });
}); 