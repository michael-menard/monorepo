import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  ErrorBoundary, 
  ErrorInfo, 
  useErrorHandler, 
  generateErrorReport, 
  sendErrorReport 
} from '../error-boundary';
import {
  ApiErrorBoundary,
  FormErrorBoundary,
  DataErrorBoundary,
  ComponentErrorBoundary,
  withErrorBoundary,
  useAsyncError
} from '../error-boundary-specialized';

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({ 
  shouldThrow = true, 
  errorMessage = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Component that throws an error after a delay
const AsyncThrowError: React.FC<{ delay?: number }> = ({ delay = 100 }) => {
  const throwAsyncError = useAsyncError();
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      throwAsyncError(new Error('Async error'));
    }, delay);
    
    return () => clearTimeout(timer);
  }, [throwAsyncError]);
  
  return <div>Async component</div>;
};

// Helper function to render with error boundary
const renderWithErrorBoundary = (component: React.ReactElement) => {
  return render(
    <ErrorBoundary>
      {component}
    </ErrorBoundary>
  );
};

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error fallback when child throws error', () => {
    // Use a different approach for testing error boundaries
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);
      
      if (shouldThrow) {
        throw new Error('Test error');
      }
      
      return (
        <div>
          <button onClick={() => setShouldThrow(true)}>Trigger Error</button>
          <div>No error</div>
        </div>
      );
    };
    
    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Trigger Error'));
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('We\'re sorry, but something unexpected happened. Please try again or contact support if the problem persists.')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();
    
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);
      
      if (shouldThrow) {
        throw new Error('Test error');
      }
      
      return (
        <div>
          <button onClick={() => setShouldThrow(true)}>Trigger Error</button>
          <div>No error</div>
        </div>
      );
    };
    
    render(
      <ErrorBoundary onError={onError}>
        <TestComponent />
      </ErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('Trigger Error'));
    
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        message: 'Test error',
        timestamp: expect.any(Date),
        errorId: expect.any(String),
      })
    );
  });

  it('resets error state when reset button is clicked', async () => {
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);
      
      if (shouldThrow) {
        throw new Error('Test error');
      }
      
      return (
        <div>
          <button onClick={() => setShouldThrow(true)}>Trigger Error</button>
          <div>No error</div>
        </div>
      );
    };
    
    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('Trigger Error'));
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    const resetButton = screen.getByText('Try Again');
    fireEvent.click(resetButton);
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('resets error state when resetKeys change', () => {
    const TestComponent = ({ key }: { key?: string }) => {
      const [shouldThrow, setShouldThrow] = React.useState(false);
      
      if (shouldThrow) {
        throw new Error('Test error');
      }
      
      return (
        <div>
          <button onClick={() => setShouldThrow(true)}>Trigger Error</button>
          <div>No error</div>
        </div>
      );
    };
    
    const { rerender } = render(
      <ErrorBoundary resetKeys={[1]}>
        <TestComponent key="1" />
      </ErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('Trigger Error'));
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    // Change resetKeys
    rerender(
      <ErrorBoundary resetKeys={[2]}>
        <TestComponent key="2" />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('uses custom fallback when provided', () => {
    const CustomFallback = () => <div>Custom error message</div>;
    
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);
      
      if (shouldThrow) {
        throw new Error('Test error');
      }
      
      return (
        <div>
          <button onClick={() => setShouldThrow(true)}>Trigger Error</button>
          <div>No error</div>
        </div>
      );
    };
    
    render(
      <ErrorBoundary fallback={<CustomFallback />}>
        <TestComponent />
      </ErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('Trigger Error'));
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('uses custom fallback function when provided', () => {
    const CustomFallback = ({ error }: { error: Error }) => (
      <div>Custom error: {error.message}</div>
    );
    
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);
      
      if (shouldThrow) {
        throw new Error('Custom error');
      }
      
      return (
        <div>
          <button onClick={() => setShouldThrow(true)}>Trigger Error</button>
          <div>No error</div>
        </div>
      );
    };
    
    render(
      <ErrorBoundary fallback={(error) => <CustomFallback error={error} />}>
        <TestComponent />
      </ErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('Trigger Error'));
    expect(screen.getByText('Custom error: Custom error')).toBeInTheDocument();
  });

  it('shows development error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);
      
      if (shouldThrow) {
        throw new Error('Development error');
      }
      
      return (
        <div>
          <button onClick={() => setShouldThrow(true)}>Trigger Error</button>
          <div>No error</div>
        </div>
      );
    };
    
    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('Trigger Error'));
    
    const detailsElement = screen.getByText('Error Details (Development)');
    expect(detailsElement).toBeInTheDocument();
    
    fireEvent.click(detailsElement);
    
    expect(screen.getByText('Development error')).toBeInTheDocument();
    expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
    expect(screen.getByText(/Timestamp:/)).toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
  });

  it('handles report error button click', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);
      
      if (shouldThrow) {
        throw new Error('Test error');
      }
      
      return (
        <div>
          <button onClick={() => setShouldThrow(true)}>Trigger Error</button>
          <div>No error</div>
        </div>
      );
    };
    
    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('Trigger Error'));
    const reportButton = screen.getByText('Report Error');
    fireEvent.click(reportButton);
    
    expect(alertSpy).toHaveBeenCalledWith('Error has been reported. Thank you for helping us improve!');
    
    alertSpy.mockRestore();
  });

  it('handles go home button click', () => {
    // Mock window.location.href assignment
    const mockLocation = { href: '' };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    });
    
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);
      
      if (shouldThrow) {
        throw new Error('Test error');
      }
      
      return (
        <div>
          <button onClick={() => setShouldThrow(true)}>Trigger Error</button>
          <div>No error</div>
        </div>
      );
    };
    
    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('Trigger Error'));
    const homeButton = screen.getByText('Go Home');
    fireEvent.click(homeButton);
    
    expect(mockLocation.href).toBe('/');
  });
});

describe('useErrorHandler', () => {
  it('throws error when called', () => {
    const TestComponent = () => {
      const handleError = useErrorHandler();
      
      React.useEffect(() => {
        handleError(new Error('Hook error'));
      }, [handleError]);
      
      return <div>Test</div>;
    };
    
    expect(() => {
      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );
    }).not.toThrow();
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});

describe('generateErrorReport', () => {
  it('generates error report with correct structure', () => {
    const error = new Error('Test error');
    const report = generateErrorReport(error);
    
    expect(report).toMatchObject({
      message: 'Test error',
      timestamp: expect.any(Date),
      errorId: expect.any(String),
      userAgent: expect.any(String),
      url: expect.any(String),
    });
  });

  it('includes additional info in error report', () => {
    const error = new Error('Test error');
    const additionalInfo = { userId: '123', action: 'test' };
    const report = generateErrorReport(error, additionalInfo);
    
    expect(report).toMatchObject({
      message: 'Test error',
      userId: '123',
      action: 'test',
    });
  });
});

describe('sendErrorReport', () => {
  it('logs error report', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorInfo: ErrorInfo = {
      message: 'Test error',
      timestamp: new Date(),
      errorId: 'test-id',
    };
    
    await sendErrorReport(errorInfo);
    
    expect(consoleSpy).toHaveBeenCalledWith('Sending error report:', errorInfo);
    
    consoleSpy.mockRestore();
  });
});

describe('ApiErrorBoundary', () => {
  it('renders API-specific error fallback', () => {
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);
      
      if (shouldThrow) {
        throw new Error('API request failed');
      }
      
      return (
        <div>
          <button onClick={() => setShouldThrow(true)}>Trigger API Error</button>
          <div>API working</div>
        </div>
      );
    };
    
    render(
      <ApiErrorBoundary>
        <TestComponent />
      </ApiErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('Trigger API Error'));
    
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText('Unable to connect to the server. Please check your internet connection and try again.')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);
      
      if (shouldThrow) {
        throw new Error('API request failed');
      }
      
      return (
        <div>
          <button onClick={() => setShouldThrow(true)}>Trigger API Error</button>
          <div>API working</div>
        </div>
      );
    };
    
    render(
      <ApiErrorBoundary onRetry={onRetry}>
        <TestComponent />
      </ApiErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('Trigger API Error'));
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('FormErrorBoundary', () => {
  it('renders form-specific error fallback', () => {
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);
      
      if (shouldThrow) {
        throw new Error('Form validation failed');
      }
      
      return (
        <div>
          <button onClick={() => setShouldThrow(true)}>Trigger Form Error</button>
          <div>Form working</div>
        </div>
      );
    };
    
    render(
      <FormErrorBoundary>
        <TestComponent />
      </FormErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('Trigger Form Error'));
    
    expect(screen.getByText('Form Error')).toBeInTheDocument();
    expect(screen.getByText('There was an error processing your form. Please try again.')).toBeInTheDocument();
  });

  it('calls onReset when reset button is clicked', () => {
    const onReset = vi.fn();
    
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);
      
      if (shouldThrow) {
        throw new Error('Form validation failed');
      }
      
      return (
        <div>
          <button onClick={() => setShouldThrow(true)}>Trigger Form Error</button>
          <div>Form working</div>
        </div>
      );
    };
    
    render(
      <FormErrorBoundary onReset={onReset}>
        <TestComponent />
      </FormErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('Trigger Form Error'));
    const resetButton = screen.getByText('Reset Form');
    fireEvent.click(resetButton);
    
    expect(onReset).toHaveBeenCalled();
  });
});

describe('DataErrorBoundary', () => {
  it('renders data-specific error fallback', () => {
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);
      
      if (shouldThrow) {
        throw new Error('Data loading failed');
      }
      
      return (
        <div>
          <button onClick={() => setShouldThrow(true)}>Trigger Data Error</button>
          <div>Data working</div>
        </div>
      );
    };
    
    render(
      <DataErrorBoundary>
        <TestComponent />
      </DataErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('Trigger Data Error'));
    
    expect(screen.getByText('Data Error')).toBeInTheDocument();
    expect(screen.getByText('Unable to load or process data. Please try again.')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);
      
      if (shouldThrow) {
        throw new Error('Data loading failed');
      }
      
      return (
        <div>
          <button onClick={() => setShouldThrow(true)}>Trigger Data Error</button>
          <div>Data working</div>
        </div>
      );
    };
    
    render(
      <DataErrorBoundary onRetry={onRetry}>
        <TestComponent />
      </DataErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('Trigger Data Error'));
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('ComponentErrorBoundary', () => {
  it('renders component-specific error fallback', () => {
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);
      
      if (shouldThrow) {
        throw new Error('Component error');
      }
      
      return (
        <div>
          <button onClick={() => setShouldThrow(true)}>Trigger Component Error</button>
          <div>Component working</div>
        </div>
      );
    };
    
    render(
      <ComponentErrorBoundary componentName="TestComponent">
        <TestComponent />
      </ComponentErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('Trigger Component Error'));
    
    expect(screen.getByText('Component Error')).toBeInTheDocument();
    expect(screen.getByText('There was an error in the TestComponent component.')).toBeInTheDocument();
  });

  it('shows component name in error details', () => {
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);
      
      if (shouldThrow) {
        throw new Error('Component error');
      }
      
      return (
        <div>
          <button onClick={() => setShouldThrow(true)}>Trigger Component Error</button>
          <div>Component working</div>
        </div>
      );
    };
    
    render(
      <ComponentErrorBoundary componentName="TestComponent">
        <TestComponent />
      </ComponentErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('Trigger Component Error'));
    
    // Check that the component name is displayed in the error details
    expect(screen.getByText('TestComponent')).toBeInTheDocument();
  });
});

describe('withErrorBoundary HOC', () => {
  it('wraps component with error boundary', () => {
    const TestComponent = () => <div>Test component</div>;
    const WrappedComponent = withErrorBoundary(TestComponent);
    
    render(<WrappedComponent />);
    
    expect(screen.getByText('Test component')).toBeInTheDocument();
  });

  it('catches errors in wrapped component', () => {
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);
      
      if (shouldThrow) {
        throw new Error('HOC error');
      }
      
      return (
        <div>
          <button onClick={() => setShouldThrow(true)}>Trigger HOC Error</button>
          <div>HOC working</div>
        </div>
      );
    };
    
    const WrappedComponent = withErrorBoundary(TestComponent);
    
    render(<WrappedComponent />);
    
    fireEvent.click(screen.getByText('Trigger HOC Error'));
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});

describe('useAsyncError', () => {
  it('throws async error', async () => {
    render(
      <ErrorBoundary>
        <AsyncThrowError />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Async component')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    }, { timeout: 200 });
  });
}); 