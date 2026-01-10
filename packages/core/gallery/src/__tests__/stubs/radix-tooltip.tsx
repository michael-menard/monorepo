import * as React from 'react'

export const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>

export const Root: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>

export const Trigger: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => (
  <div {...props}>{children}</div>
)

export const Content: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => (
  <div {...props}>{children}</div>
)