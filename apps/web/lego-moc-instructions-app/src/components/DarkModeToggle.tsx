import React from 'react';
import { useTheme } from '@repo/ui';

const DarkModeToggle: React.FC = () => {
  const { resolvedTheme, setTheme } = useTheme();

  const toggleDarkMode = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleDarkMode}
      className="fixed top-4 right-4 z-50 p-3 bg-card border border-border rounded-lg shadow-lg hover:bg-accent transition-colors"
      title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-5 w-5 text-foreground" />
      ) : (
        <Moon className="h-5 w-5 text-foreground" />
      )}
    </button>
  );
};

export default DarkModeToggle; 