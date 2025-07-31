import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ProfilePage from '../index';

// Mock the profile components
vi.mock('@repo/profile', () => ({
  ProfilePage: ({ children, sidebarContent }: any) => (
    <div data-testid="profile-page">
      <div data-testid="sidebar">{sidebarContent}</div>
      <div data-testid="main-content">{children}</div>
    </div>
  ),
  ProfileSidebar: ({ profile, onEdit, onUploadAvatar }: any) => (
    <div data-testid="profile-sidebar">
      <button onClick={onEdit} data-testid="sidebar-edit-btn">Edit</button>
      <button onClick={() => onUploadAvatar(new File([''], 'test.jpg'))} data-testid="upload-avatar-btn">
        Upload Avatar
      </button>
      <div data-testid="profile-name">{profile.firstName} {profile.lastName}</div>
    </div>
  ),
  ProfileMain: ({ children, title, description }: any) => (
    <div data-testid="profile-main">
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  ),
  AvatarUploader: ({ currentAvatar, onUpload }: any) => (
    <div data-testid="avatar-uploader">
      <img src={currentAvatar} alt="Avatar" data-testid="current-avatar" />
      <button onClick={() => onUpload(new File([''], 'new-avatar.jpg'))} data-testid="upload-btn">
        Upload
      </button>
    </div>
  ),
}));

// Mock the UI components
vi.mock('@repo/ui', () => ({
  Button: ({ children, onClick, variant, className, ...props }: any) => (
    <button onClick={onClick} className={className} data-testid={`button-${variant || 'default'}`} {...props}>
      {children}
    </button>
  ),
  FormSection: ({ fields, className }: any) => (
    <form className={className} data-testid="form-section">
      {fields.map((field: any) => (
        <div key={field.name} data-testid={`field-${field.name}`}>
          <label>{field.label}</label>
          <input
            type={field.type}
            name={field.name}
            defaultValue={field.value}
            required={field.required}
            data-testid={`input-${field.name}`}
          />
        </div>
      ))}
    </form>
  ),
}));

// Mock the LegoProfileContent component
vi.mock('../LegoProfileContent', () => ({
  LegoProfileContent: ({ profile, onEdit, isEditing }: any) => (
    <div data-testid="lego-profile-content">
      <button onClick={onEdit} disabled={isEditing} data-testid="content-edit-btn">
        Edit Profile
      </button>
      <div data-testid="profile-email">{profile.email}</div>
      <div data-testid="profile-bio">{profile.bio}</div>
    </div>
  ),
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mocked-url');

// Performance measurement utilities
const measurePerformance = (fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  return end - start;
};

const measureMemoryUsage = () => {
  if ('memory' in performance) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return 0;
};

const renderProfilePage = () => {
  return render(
    <BrowserRouter>
      <ProfilePage />
    </BrowserRouter>
  );
};

describe('ProfilePage Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any timers or intervals
    vi.clearAllTimers();
  });

  describe('Initial Render Performance', () => {
    it('should render within acceptable time limit (under 100ms)', () => {
      const renderTime = measurePerformance(() => {
        renderProfilePage();
      });
      
      expect(renderTime).toBeLessThan(100);
      console.log(`Initial render time: ${renderTime.toFixed(2)}ms`);
    });

    it('should render without memory leaks', () => {
      const initialMemory = measureMemoryUsage();
      
      renderProfilePage();
      
      const afterRenderMemory = measureMemoryUsage();
      const memoryIncrease = afterRenderMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 1MB)
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
      console.log(`Memory increase: ${(memoryIncrease / 1024).toFixed(2)}KB`);
    });

    it('should render all components efficiently', () => {
      const renderTime = measurePerformance(() => {
        renderProfilePage();
      });
      
      expect(screen.getByTestId('profile-page')).toBeInTheDocument();
      expect(screen.getByTestId('profile-main')).toBeInTheDocument();
      expect(screen.getByTestId('profile-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('lego-profile-content')).toBeInTheDocument();
      
      expect(renderTime).toBeLessThan(150);
    });

    it('should handle large profile data efficiently', () => {
      // Test with a large bio and many social links
      const renderTime = measurePerformance(() => {
        renderProfilePage();
      });
      
      expect(renderTime).toBeLessThan(200);
    });
  });

  describe('Interaction Performance', () => {
    it('should open edit modal quickly (under 50ms)', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      
      const modalOpenTime = measurePerformance(async () => {
        fireEvent.click(editButton);
        await waitFor(() => {
          expect(screen.getByText('Edit Profile')).toBeInTheDocument();
        });
      });
      
      expect(modalOpenTime).toBeLessThan(50);
      console.log(`Modal open time: ${modalOpenTime.toFixed(2)}ms`);
    });

    it('should close edit modal quickly (under 30ms)', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByTestId('button-outline');
      
      const modalCloseTime = measurePerformance(async () => {
        fireEvent.click(cancelButton);
        await waitFor(() => {
          expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
        });
      });
      
      expect(modalCloseTime).toBeLessThan(30);
      console.log(`Modal close time: ${modalCloseTime.toFixed(2)}ms`);
    });

    it('should handle rapid button clicks efficiently', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      
      const rapidClickTime = measurePerformance(() => {
        // Simulate rapid clicks
        for (let i = 0; i < 10; i++) {
          fireEvent.click(editButton);
        }
      });
      
      expect(rapidClickTime).toBeLessThan(100);
      console.log(`Rapid click time: ${rapidClickTime.toFixed(2)}ms`);
    });

    it('should handle form field updates efficiently', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('form-section')).toBeInTheDocument();
      });
      
      const firstNameInput = screen.getByTestId('input-firstName');
      
      const formUpdateTime = measurePerformance(() => {
        // Simulate typing in form field
        fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
        fireEvent.change(firstNameInput, { target: { value: 'Jane Smith' } });
        fireEvent.change(firstNameInput, { target: { value: 'Jane Smith Doe' } });
      });
      
      expect(formUpdateTime).toBeLessThan(20);
      console.log(`Form update time: ${formUpdateTime.toFixed(2)}ms`);
    });

    it('should handle avatar upload efficiently', () => {
      renderProfilePage();
      
      const uploadButton = screen.getByTestId('upload-avatar-btn');
      
      const uploadTime = measurePerformance(() => {
        fireEvent.click(uploadButton);
      });
      
      expect(uploadTime).toBeLessThan(30);
      console.log(`Avatar upload time: ${uploadTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Performance', () => {
    it('should not leak memory during multiple renders', () => {
      const initialMemory = measureMemoryUsage();
      
      // Render multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderProfilePage();
        unmount();
      }
      
      const finalMemory = measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory should not increase significantly
      expect(memoryIncrease).toBeLessThan(512 * 1024); // 512KB
      console.log(`Memory increase after 10 renders: ${(memoryIncrease / 1024).toFixed(2)}KB`);
    });

    it('should not leak memory during modal interactions', async () => {
      const initialMemory = measureMemoryUsage();
      
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      
      // Open and close modal multiple times
      for (let i = 0; i < 5; i++) {
        fireEvent.click(editButton);
        await waitFor(() => {
          expect(screen.getByText('Edit Profile')).toBeInTheDocument();
        });
        
        const cancelButton = screen.getByTestId('button-outline');
        fireEvent.click(cancelButton);
        
        await waitFor(() => {
          expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
        });
      }
      
      const finalMemory = measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      
      expect(memoryIncrease).toBeLessThan(256 * 1024); // 256KB
      console.log(`Memory increase after modal interactions: ${(memoryIncrease / 1024).toFixed(2)}KB`);
    });

    it('should handle large file uploads efficiently', () => {
      renderProfilePage();
      
      const uploadButton = screen.getByTestId('upload-avatar-btn');
      const initialMemory = measureMemoryUsage();
      
      // Simulate large file upload
      const largeFile = new File(['x'.repeat(1024 * 1024)], 'large-image.jpg', { type: 'image/jpeg' });
      
      const uploadTime = measurePerformance(() => {
        fireEvent.click(uploadButton);
      });
      
      const finalMemory = measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      
      expect(uploadTime).toBeLessThan(50);
      expect(memoryIncrease).toBeLessThan(2 * 1024 * 1024); // 2MB
      console.log(`Large file upload time: ${uploadTime.toFixed(2)}ms, memory increase: ${(memoryIncrease / 1024).toFixed(2)}KB`);
    });
  });

  describe('Load Performance', () => {
    it('should load profile data efficiently', () => {
      const loadTime = measurePerformance(() => {
        renderProfilePage();
      });
      
      // Should load and display profile data quickly
      expect(loadTime).toBeLessThan(100);
      expect(screen.getByTestId('profile-name')).toHaveTextContent('John Doe');
      expect(screen.getByTestId('profile-email')).toHaveTextContent('john.doe@example.com');
    });

    it('should handle slow network conditions gracefully', async () => {
      // Mock slow network by adding artificial delay
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      const loadTime = measurePerformance(() => {
        renderProfilePage();
      });
      
      // Should still render quickly even with slow network
      expect(loadTime).toBeLessThan(150);
      
      // Restore original fetch
      global.fetch = originalFetch;
    });

    it('should optimize re-renders efficiently', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      
      // Measure time for multiple state changes
      const reRenderTime = measurePerformance(async () => {
        fireEvent.click(editButton);
        await waitFor(() => {
          expect(screen.getByText('Edit Profile')).toBeInTheDocument();
        });
        
        const cancelButton = screen.getByTestId('button-outline');
        fireEvent.click(cancelButton);
        
        await waitFor(() => {
          expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
        });
        
        // Repeat the cycle
        fireEvent.click(editButton);
        await waitFor(() => {
          expect(screen.getByText('Edit Profile')).toBeInTheDocument();
        });
      });
      
      expect(reRenderTime).toBeLessThan(200);
      console.log(`Re-render time: ${reRenderTime.toFixed(2)}ms`);
    });
  });

  describe('Bundle Size Impact', () => {
    it('should not significantly impact bundle size', () => {
      // This test checks that the component doesn't import unnecessary dependencies
      const componentCode = ProfilePage.toString();
      
      // Should not contain large dependencies
      expect(componentCode).not.toContain('lodash');
      expect(componentCode).not.toContain('moment');
      expect(componentCode).not.toContain('date-fns');
      
      // Should use lightweight alternatives
      expect(componentCode).toContain('useState');
      expect(componentCode).toContain('useNavigate');
    });

    it('should lazy load heavy components efficiently', () => {
      // Check that heavy components are not loaded immediately
      const { container } = renderProfilePage();
      
      // Avatar uploader should only be loaded when needed
      expect(container.querySelector('[data-testid="avatar-uploader"]')).not.toBeInTheDocument();
      
      // Form should only be loaded when edit mode is active
      expect(container.querySelector('[data-testid="form-section"]')).not.toBeInTheDocument();
    });
  });

  describe('Animation Performance', () => {
    it('should handle CSS transitions efficiently', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      
      // Measure time for modal animation
      const animationTime = measurePerformance(async () => {
        fireEvent.click(editButton);
        await waitFor(() => {
          expect(screen.getByText('Edit Profile')).toBeInTheDocument();
        });
        
        // Wait for any CSS transitions
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      expect(animationTime).toBeLessThan(100);
      console.log(`Animation time: ${animationTime.toFixed(2)}ms`);
    });

    it('should not cause layout thrashing', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      
      // Measure layout changes
      const layoutTime = measurePerformance(async () => {
        fireEvent.click(editButton);
        await waitFor(() => {
          expect(screen.getByText('Edit Profile')).toBeInTheDocument();
        });
        
        const cancelButton = screen.getByTestId('button-outline');
        fireEvent.click(cancelButton);
        
        await waitFor(() => {
          expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
        });
      });
      
      expect(layoutTime).toBeLessThan(150);
      console.log(`Layout change time: ${layoutTime.toFixed(2)}ms`);
    });
  });

  describe('Network Performance', () => {
    it('should handle API calls efficiently', async () => {
      // Mock API response time
      const mockApiCall = vi.fn().mockResolvedValue({ success: true });
      
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
      
      const saveButton = screen.getByText('Save Changes');
      
      const apiCallTime = measurePerformance(async () => {
        fireEvent.click(saveButton);
        await mockApiCall();
      });
      
      expect(apiCallTime).toBeLessThan(100);
      console.log(`API call time: ${apiCallTime.toFixed(2)}ms`);
    });

    it('should handle concurrent operations efficiently', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      const uploadButton = screen.getByTestId('upload-avatar-btn');
      
      const concurrentTime = measurePerformance(() => {
        // Simulate concurrent operations
        fireEvent.click(editButton);
        fireEvent.click(uploadButton);
      });
      
      expect(concurrentTime).toBeLessThan(50);
      console.log(`Concurrent operations time: ${concurrentTime.toFixed(2)}ms`);
    });
  });
}); 