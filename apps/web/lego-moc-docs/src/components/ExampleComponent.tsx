import React from 'react';

interface ExampleComponentProps {
  title: string;
  children: React.ReactNode;
  variant?: 'info' | 'warning' | 'success' | 'error';
}

export default function ExampleComponent({ 
  title, 
  children, 
  variant = 'info' 
}: ExampleComponentProps) {
  const variantStyles = {
    info: {
      backgroundColor: 'var(--lego-blue)',
      color: 'var(--lego-white)',
      borderColor: 'var(--lego-blue)',
    },
    warning: {
      backgroundColor: 'var(--lego-orange)',
      color: 'var(--lego-white)',
      borderColor: 'var(--lego-orange)',
    },
    success: {
      backgroundColor: 'var(--lego-green)',
      color: 'var(--lego-white)',
      borderColor: 'var(--lego-green)',
    },
    error: {
      backgroundColor: 'var(--lego-red)',
      color: 'var(--lego-white)',
      borderColor: 'var(--lego-red)',
    },
  };

  return (
    <div 
      className="lego-card"
      style={{
        ...variantStyles[variant],
        margin: '1rem 0',
        padding: '1rem',
        borderRadius: '8px',
        border: '2px solid',
      }}
    >
      <h3 style={{ margin: '0 0 0.5rem 0' }}>{title}</h3>
      <div>{children}</div>
    </div>
  );
} 