import { test, expect } from '@playwright/test';

test.describe('Profile Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the profile page
    await page.goto('/profile');
  });

  test.describe('New User Profile Creation', () => {
    test('should display empty profile form for new users', async ({ page }) => {
      // Mock empty profile data
      await page.route('**/api/profile', async route => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Profile not found' })
        });
      });

      await page.reload();

      // Should show profile creation form
      await expect(page.getByRole('heading', { name: 'Create Profile' })).toBeVisible();
      await expect(page.getByLabel('First Name')).toBeVisible();
      await expect(page.getByLabel('Last Name')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
    });

    test('should allow new user to create profile with valid data', async ({ page }) => {
      // Mock profile creation endpoint
      await page.route('**/api/profile', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: 'new-profile-id',
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@example.com',
                username: 'janesmith',
                bio: 'New LEGO enthusiast',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            })
          });
        } else {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Profile not found' })
          });
        }
      });

      await page.reload();

      // Fill out the profile form
      await page.getByLabel('First Name').fill('Jane');
      await page.getByLabel('Last Name').fill('Smith');
      await page.getByLabel('Email').fill('jane.smith@example.com');
      await page.getByLabel('Username').fill('janesmith');
      await page.getByLabel('Bio').fill('New LEGO enthusiast');
      await page.getByLabel('Phone').fill('+1 (555) 987-6543');
      await page.getByLabel('Location').fill('New York, NY');
      await page.getByLabel('Website').fill('https://janesmith.dev');

      // Submit the form
      await page.getByRole('button', { name: 'Create Profile' }).click();

      // Should show success message and redirect to profile view
      await expect(page.getByText('Profile created successfully')).toBeVisible();
      await expect(page.getByText('Jane Smith')).toBeVisible();
      await expect(page.getByText('jane.smith@example.com')).toBeVisible();
    });

    test('should validate required fields when creating profile', async ({ page }) => {
      // Mock empty profile
      await page.route('**/api/profile', async route => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Profile not found' })
        });
      });

      await page.reload();

      // Try to submit without required fields
      await page.getByRole('button', { name: 'Create Profile' }).click();

      // Should show validation errors
      await expect(page.getByText('First name is required')).toBeVisible();
      await expect(page.getByText('Last name is required')).toBeVisible();
      await expect(page.getByText('Email is required')).toBeVisible();
    });

    test('should validate email format when creating profile', async ({ page }) => {
      // Mock empty profile
      await page.route('**/api/profile', async route => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Profile not found' })
        });
      });

      await page.reload();

      // Fill form with invalid email
      await page.getByLabel('First Name').fill('Jane');
      await page.getByLabel('Last Name').fill('Smith');
      await page.getByLabel('Email').fill('invalid-email');
      await page.getByLabel('Username').fill('janesmith');

      await page.getByRole('button', { name: 'Create Profile' }).click();

      // Should show email validation error
      await expect(page.getByText('Invalid email address')).toBeVisible();
    });

    test('should validate URL format in website field', async ({ page }) => {
      // Mock empty profile
      await page.route('**/api/profile', async route => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Profile not found' })
        });
      });

      await page.reload();

      // Fill form with invalid website URL
      await page.getByLabel('First Name').fill('Jane');
      await page.getByLabel('Last Name').fill('Smith');
      await page.getByLabel('Email').fill('jane.smith@example.com');
      await page.getByLabel('Website').fill('not-a-url');

      await page.getByRole('button', { name: 'Create Profile' }).click();

      // Should show URL validation error
      await expect(page.getByText('Invalid website URL')).toBeVisible();
    });
  });

  test.describe('Existing Profile Data Loading', () => {
    test('should load and display existing profile data', async ({ page }) => {
      // Mock existing profile data
      await page.route('**/api/profile', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'existing-profile-id',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              username: 'johndoe',
              bio: 'LEGO enthusiast and MOC creator. I love building custom models and sharing instructions with the community.',
              avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
              phone: '+1 (555) 123-4567',
              dateOfBirth: '1990-05-15',
              location: 'San Francisco, CA',
              website: 'https://johndoe.dev',
              socialLinks: {
                twitter: 'https://twitter.com/johndoe',
                linkedin: 'https://linkedin.com/in/johndoe',
                github: 'https://github.com/johndoe',
                instagram: 'https://instagram.com/johndoe'
              },
              preferences: {
                emailNotifications: true,
                pushNotifications: false,
                publicProfile: true,
                theme: 'system'
              },
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2024-01-15T00:00:00Z'
            }
          })
        });
      });

      await page.reload();

      // Should display existing profile data
      await expect(page.getByText('John Doe')).toBeVisible();
      await expect(page.getByText('john.doe@example.com')).toBeVisible();
      await expect(page.getByText('LEGO enthusiast and MOC creator')).toBeVisible();
      await expect(page.getByText('San Francisco, CA')).toBeVisible();
      await expect(page.getByText('https://johndoe.dev')).toBeVisible();
    });

    test('should populate edit form with existing data', async ({ page }) => {
      // Mock existing profile data
      await page.route('**/api/profile', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'existing-profile-id',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              username: 'johndoe',
              bio: 'LEGO enthusiast and MOC creator',
              phone: '+1 (555) 123-4567',
              location: 'San Francisco, CA',
              website: 'https://johndoe.dev'
            }
          })
        });
      });

      await page.reload();

      // Click edit button
      await page.getByRole('button', { name: 'Edit Profile' }).click();

      // Should show edit modal with populated data
      await expect(page.getByText('Edit Profile')).toBeVisible();
      await expect(page.getByDisplayValue('John')).toBeVisible();
      await expect(page.getByDisplayValue('Doe')).toBeVisible();
      await expect(page.getByDisplayValue('john.doe@example.com')).toBeVisible();
      await expect(page.getByDisplayValue('johndoe')).toBeVisible();
      await expect(page.getByDisplayValue('LEGO enthusiast and MOC creator')).toBeVisible();
      await expect(page.getByDisplayValue('+1 (555) 123-4567')).toBeVisible();
      await expect(page.getByDisplayValue('San Francisco, CA')).toBeVisible();
      await expect(page.getByDisplayValue('https://johndoe.dev')).toBeVisible();
    });

    test('should handle profile data loading errors gracefully', async ({ page }) => {
      // Mock server error
      await page.route('**/api/profile', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal server error' })
        });
      });

      await page.reload();

      // Should show error message
      await expect(page.getByText('Failed to load profile')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    });

    test('should handle network timeout gracefully', async ({ page }) => {
      // Mock slow response
      await page.route('**/api/profile', async route => {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: {} })
        });
      });

      await page.reload();

      // Should show loading state
      await expect(page.getByText('Loading profile...')).toBeVisible();
    });
  });

  test.describe('Profile Editing', () => {
    test.beforeEach(async ({ page }) => {
      // Mock existing profile data for editing tests
      await page.route('**/api/profile', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'existing-profile-id',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              username: 'johndoe',
              bio: 'LEGO enthusiast and MOC creator',
              phone: '+1 (555) 123-4567',
              location: 'San Francisco, CA',
              website: 'https://johndoe.dev'
            }
          })
        });
      });

      await page.reload();
    });

    test('should allow editing profile information', async ({ page }) => {
      // Mock profile update endpoint
      await page.route('**/api/profile', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: 'existing-profile-id',
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@example.com',
                username: 'janesmith',
                bio: 'Updated bio',
                phone: '+1 (555) 987-6543',
                location: 'New York, NY',
                website: 'https://janesmith.dev'
              }
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: 'existing-profile-id',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                username: 'johndoe',
                bio: 'LEGO enthusiast and MOC creator',
                phone: '+1 (555) 123-4567',
                location: 'San Francisco, CA',
                website: 'https://johndoe.dev'
              }
            })
          });
        }
      });

      // Click edit button
      await page.getByRole('button', { name: 'Edit Profile' }).click();

      // Update form fields
      await page.getByLabel('First Name').fill('Jane');
      await page.getByLabel('Last Name').fill('Smith');
      await page.getByLabel('Email').fill('jane.smith@example.com');
      await page.getByLabel('Username').fill('janesmith');
      await page.getByLabel('Bio').fill('Updated bio');
      await page.getByLabel('Phone').fill('+1 (555) 987-6543');
      await page.getByLabel('Location').fill('New York, NY');
      await page.getByLabel('Website').fill('https://janesmith.dev');

      // Save changes
      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Should show success message and updated data
      await expect(page.getByText('Profile updated successfully')).toBeVisible();
      await expect(page.getByText('Jane Smith')).toBeVisible();
      await expect(page.getByText('jane.smith@example.com')).toBeVisible();
      await expect(page.getByText('Updated bio')).toBeVisible();
    });

    test('should cancel editing without saving changes', async ({ page }) => {
      // Click edit button
      await page.getByRole('button', { name: 'Edit Profile' }).click();

      // Make some changes
      await page.getByLabel('First Name').fill('Jane');
      await page.getByLabel('Bio').fill('This should not be saved');

      // Cancel editing
      await page.getByRole('button', { name: 'Cancel' }).click();

      // Should close modal and show original data
      await expect(page.getByText('Edit Profile')).not.toBeVisible();
      await expect(page.getByText('John Doe')).toBeVisible();
      await expect(page.getByText('LEGO enthusiast and MOC creator')).toBeVisible();
    });

    test('should validate form fields when editing', async ({ page }) => {
      // Click edit button
      await page.getByRole('button', { name: 'Edit Profile' }).click();

      // Clear required fields
      await page.getByLabel('First Name').clear();
      await page.getByLabel('Last Name').clear();
      await page.getByLabel('Email').clear();

      // Try to save
      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Should show validation errors
      await expect(page.getByText('First name is required')).toBeVisible();
      await expect(page.getByText('Last name is required')).toBeVisible();
      await expect(page.getByText('Email is required')).toBeVisible();
    });

    test('should handle edit form submission errors', async ({ page }) => {
      // Mock server error on update
      await page.route('**/api/profile', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Failed to update profile' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: 'existing-profile-id',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com'
              }
            })
          });
        }
      });

      // Click edit button
      await page.getByRole('button', { name: 'Edit Profile' }).click();

      // Make a change
      await page.getByLabel('First Name').fill('Jane');

      // Try to save
      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Should show error message
      await expect(page.getByText('Failed to update profile')).toBeVisible();
    });
  });

  test.describe('Avatar Upload', () => {
    test.beforeEach(async ({ page }) => {
      // Mock existing profile data
      await page.route('**/api/profile', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'existing-profile-id',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
            }
          })
        });
      });

      await page.reload();
    });

    test('should allow uploading new avatar image', async ({ page }) => {
      // Mock avatar upload endpoint
      await page.route('**/api/profile/avatar', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              avatarUrl: 'https://example.com/new-avatar.jpg'
            }
          })
        });
      });

      // Click edit button to open modal
      await page.getByRole('button', { name: 'Edit Profile' }).click();

      // Upload new avatar
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Choose New Avatar' }).click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles('tests/fixtures/test-avatar.jpg');

      // Should show upload progress
      await expect(page.getByText('Uploading...')).toBeVisible();

      // Should show success message
      await expect(page.getByText('Avatar uploaded successfully')).toBeVisible();
    });

    test('should validate avatar file type', async ({ page }) => {
      // Click edit button to open modal
      await page.getByRole('button', { name: 'Edit Profile' }).click();

      // Try to upload invalid file type
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Choose New Avatar' }).click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles('tests/fixtures/invalid-file.txt');

      // Should show validation error
      await expect(page.getByText('Please select a valid image file')).toBeVisible();
    });

    test('should validate avatar file size', async ({ page }) => {
      // Click edit button to open modal
      await page.getByRole('button', { name: 'Edit Profile' }).click();

      // Try to upload large file
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Choose New Avatar' }).click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles('tests/fixtures/large-image.jpg');

      // Should show file size error
      await expect(page.getByText('File size must be less than 5MB')).toBeVisible();
    });

    test('should handle avatar upload errors', async ({ page }) => {
      // Mock upload error
      await page.route('**/api/profile/avatar', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Upload failed' })
        });
      });

      // Click edit button to open modal
      await page.getByRole('button', { name: 'Edit Profile' }).click();

      // Upload file
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Choose New Avatar' }).click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles('tests/fixtures/test-avatar.jpg');

      // Should show error message
      await expect(page.getByText('Failed to upload avatar')).toBeVisible();
    });
  });

  test.describe('Social Links', () => {
    test.beforeEach(async ({ page }) => {
      // Mock profile with social links
      await page.route('**/api/profile', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'existing-profile-id',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              socialLinks: {
                twitter: 'https://twitter.com/johndoe',
                linkedin: 'https://linkedin.com/in/johndoe',
                github: 'https://github.com/johndoe',
                instagram: 'https://instagram.com/johndoe'
              }
            }
          })
        });
      });

      await page.reload();
    });

    test('should display existing social links', async ({ page }) => {
      // Should show social links
      await expect(page.getByRole('link', { name: /Twitter/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /LinkedIn/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /GitHub/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Instagram/i })).toBeVisible();
    });

    test('should allow editing social links', async ({ page }) => {
      // Mock profile update
      await page.route('**/api/profile', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: 'existing-profile-id',
                socialLinks: {
                  twitter: 'https://twitter.com/johndoe_updated',
                  linkedin: 'https://linkedin.com/in/johndoe_updated',
                  github: 'https://github.com/johndoe_updated',
                  instagram: 'https://instagram.com/johndoe_updated'
                }
              }
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: 'existing-profile-id',
                socialLinks: {
                  twitter: 'https://twitter.com/johndoe',
                  linkedin: 'https://linkedin.com/in/johndoe',
                  github: 'https://github.com/johndoe',
                  instagram: 'https://instagram.com/johndoe'
                }
              }
            })
          });
        }
      });

      // Click edit button
      await page.getByRole('button', { name: 'Edit Profile' }).click();

      // Update social links
      await page.getByLabel('Twitter URL').fill('https://twitter.com/johndoe_updated');
      await page.getByLabel('LinkedIn URL').fill('https://linkedin.com/in/johndoe_updated');
      await page.getByLabel('GitHub URL').fill('https://github.com/johndoe_updated');
      await page.getByLabel('Instagram URL').fill('https://instagram.com/johndoe_updated');

      // Save changes
      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Should show updated social links
      await expect(page.getByRole('link', { name: /johndoe_updated/i })).toBeVisible();
    });

    test('should validate social link URLs', async ({ page }) => {
      // Click edit button
      await page.getByRole('button', { name: 'Edit Profile' }).click();

      // Enter invalid URLs
      await page.getByLabel('Twitter URL').fill('not-a-url');
      await page.getByLabel('LinkedIn URL').fill('ftp://example.com');

      // Try to save
      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Should show validation errors
      await expect(page.getByText('Invalid Twitter URL')).toBeVisible();
      await expect(page.getByText('Invalid LinkedIn URL')).toBeVisible();
    });
  });

  test.describe('Profile Preferences', () => {
    test.beforeEach(async ({ page }) => {
      // Mock profile with preferences
      await page.route('**/api/profile', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'existing-profile-id',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              preferences: {
                emailNotifications: true,
                pushNotifications: false,
                publicProfile: true,
                theme: 'system'
              }
            }
          })
        });
      });

      await page.reload();
    });

    test('should display current preferences', async ({ page }) => {
      // Should show preference settings
      await expect(page.getByText('Email Notifications')).toBeVisible();
      await expect(page.getByText('Push Notifications')).toBeVisible();
      await expect(page.getByText('Public Profile')).toBeVisible();
      await expect(page.getByText('Theme')).toBeVisible();

      // Should show current values
      await expect(page.getByText('Enabled')).toBeVisible();
      await expect(page.getByText('Disabled')).toBeVisible();
      await expect(page.getByText('Public')).toBeVisible();
      await expect(page.getByText('system')).toBeVisible();
    });

    test('should allow updating preferences', async ({ page }) => {
      // Mock preference update
      await page.route('**/api/profile/preferences', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              preferences: {
                emailNotifications: false,
                pushNotifications: true,
                publicProfile: false,
                theme: 'dark'
              }
            }
          })
        });
      });

      // Navigate to preferences tab
      await page.getByRole('tab', { name: 'Preferences' }).click();

      // Update preferences
      await page.getByLabel('Email Notifications').uncheck();
      await page.getByLabel('Push Notifications').check();
      await page.getByLabel('Public Profile').uncheck();
      await page.getByLabel('Theme').selectOption('dark');

      // Save preferences
      await page.getByRole('button', { name: 'Save Preferences' }).click();

      // Should show success message
      await expect(page.getByText('Preferences updated successfully')).toBeVisible();
    });
  });

  test.describe('Profile Security', () => {
    test.beforeEach(async ({ page }) => {
      // Mock profile data
      await page.route('**/api/profile', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'existing-profile-id',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com'
            }
          })
        });
      });

      await page.reload();
    });

    test('should allow changing password', async ({ page }) => {
      // Mock password change endpoint
      await page.route('**/api/profile/password', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Password changed successfully'
          })
        });
      });

      // Navigate to security tab
      await page.getByRole('tab', { name: 'Security' }).click();

      // Click change password button
      await page.getByRole('button', { name: 'Change Password' }).click();

      // Fill password change form
      await page.getByLabel('Current Password').fill('oldpassword');
      await page.getByLabel('New Password').fill('newpassword123');
      await page.getByLabel('Confirm New Password').fill('newpassword123');

      // Submit form
      await page.getByRole('button', { name: 'Change Password' }).click();

      // Should show success message
      await expect(page.getByText('Password changed successfully')).toBeVisible();
    });

    test('should validate password change form', async ({ page }) => {
      // Navigate to security tab
      await page.getByRole('tab', { name: 'Security' }).click();

      // Click change password button
      await page.getByRole('button', { name: 'Change Password' }).click();

      // Try to submit without filling form
      await page.getByRole('button', { name: 'Change Password' }).click();

      // Should show validation errors
      await expect(page.getByText('Current password is required')).toBeVisible();
      await expect(page.getByText('New password is required')).toBeVisible();
    });

    test('should validate password confirmation', async ({ page }) => {
      // Navigate to security tab
      await page.getByRole('tab', { name: 'Security' }).click();

      // Click change password button
      await page.getByRole('button', { name: 'Change Password' }).click();

      // Fill form with mismatched passwords
      await page.getByLabel('Current Password').fill('oldpassword');
      await page.getByLabel('New Password').fill('newpassword123');
      await page.getByLabel('Confirm New Password').fill('differentpassword');

      // Submit form
      await page.getByRole('button', { name: 'Change Password' }).click();

      // Should show validation error
      await expect(page.getByText('Passwords do not match')).toBeVisible();
    });
  });

  test.describe('Profile Deletion', () => {
    test.beforeEach(async ({ page }) => {
      // Mock profile data
      await page.route('**/api/profile', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'existing-profile-id',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com'
            }
          })
        });
      });

      await page.reload();
    });

    test('should allow deleting profile with confirmation', async ({ page }) => {
      // Mock profile deletion endpoint
      await page.route('**/api/profile', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'Profile deleted successfully'
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: 'existing-profile-id',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com'
              }
            })
          });
        }
      });

      // Navigate to security tab
      await page.getByRole('tab', { name: 'Security' }).click();

      // Click delete account button
      await page.getByRole('button', { name: 'Delete Account' }).click();

      // Should show confirmation dialog
      await expect(page.getByText('Are you sure you want to delete your account?')).toBeVisible();

      // Fill confirmation form
      await page.getByLabel('Password').fill('userpassword');
      await page.getByLabel('Type "DELETE" to confirm').fill('DELETE');

      // Confirm deletion
      await page.getByRole('button', { name: 'Delete Account' }).click();

      // Should show success message and redirect
      await expect(page.getByText('Profile deleted successfully')).toBeVisible();
    });

    test('should require proper confirmation for deletion', async ({ page }) => {
      // Navigate to security tab
      await page.getByRole('tab', { name: 'Security' }).click();

      // Click delete account button
      await page.getByRole('button', { name: 'Delete Account' }).click();

      // Fill confirmation form incorrectly
      await page.getByLabel('Password').fill('userpassword');
      await page.getByLabel('Type "DELETE" to confirm').fill('CANCEL');

      // Try to confirm deletion
      await page.getByRole('button', { name: 'Delete Account' }).click();

      // Should show validation error
      await expect(page.getByText('Please type "DELETE" to confirm account deletion')).toBeVisible();
    });
  });

  test.describe('Navigation and Layout', () => {
    test('should navigate back to home page', async ({ page }) => {
      // Click back button
      await page.getByRole('button', { name: '← Back to Home' }).click();

      // Should navigate to home page
      await expect(page).toHaveURL('/');
    });

    test('should maintain responsive layout on different screen sizes', async ({ page }) => {
      // Test mobile layout
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.getByTestId('profile-page')).toBeVisible();

      // Test tablet layout
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.getByTestId('profile-page')).toBeVisible();

      // Test desktop layout
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(page.getByTestId('profile-page')).toBeVisible();
    });

    test('should handle keyboard navigation properly', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: '← Back to Home' })).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Edit Profile' })).toBeFocused();

      // Use Enter to activate button
      await page.keyboard.press('Enter');
      await expect(page.getByText('Edit Profile')).toBeVisible();

      // Use Escape to close modal
      await page.keyboard.press('Escape');
      await expect(page.getByText('Edit Profile')).not.toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network disconnection gracefully', async ({ page }) => {
      // Simulate network disconnection
      await page.route('**/*', route => route.abort());

      await page.reload();

      // Should show offline message
      await expect(page.getByText('No internet connection')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    });

    test('should handle malformed API responses', async ({ page }) => {
      // Mock malformed response
      await page.route('**/api/profile', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json'
        });
      });

      await page.reload();

      // Should show error message
      await expect(page.getByText('Failed to load profile')).toBeVisible();
    });

    test('should handle concurrent profile updates', async ({ page }) => {
      // Mock conflict response
      await page.route('**/api/profile', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Profile was modified by another user' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: 'existing-profile-id',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com'
              }
            })
          });
        }
      });

      await page.reload();

      // Click edit button
      await page.getByRole('button', { name: 'Edit Profile' }).click();

      // Make changes
      await page.getByLabel('First Name').fill('Jane');

      // Try to save
      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Should show conflict message
      await expect(page.getByText('Profile was modified by another user')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible();
    });

    test('should handle session expiration during profile operations', async ({ page }) => {
      // Mock session expiration
      await page.route('**/api/profile', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Session expired' })
        });
      });

      await page.reload();

      // Should redirect to login page
      await expect(page).toHaveURL(/.*login.*/);
    });
  });
}); 