import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock React Redux
vi.mock('react-redux', () => ({
  useDispatch: vi.fn(),
  useSelector: vi.fn(),
  Provider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock UI components
vi.mock('@monorepo/ui', () => ({
  Button: ({ children, ...props }: any) => ({ type: 'button', props, children }),
  Dialog: ({ children, ...props }: any) => ({ type: 'dialog', props, children }),
  DialogContent: ({ children, ...props }: any) => ({ type: 'dialog-content', props, children }),
  DialogTitle: ({ children, ...props }: any) => ({ type: 'dialog-title', props, children }),
  DialogHeader: ({ children, ...props }: any) => ({ type: 'dialog-header', props, children }),
  DialogFooter: ({ children, ...props }: any) => ({ type: 'dialog-footer', props, children }),
  Input: (props: any) => ({ type: 'input', props }),
  Label: ({ children, ...props }: any) => ({ type: 'label', props, children }),
})); 