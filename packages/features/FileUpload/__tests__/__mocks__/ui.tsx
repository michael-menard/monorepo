import React from 'react';

export const Button = ({ children, onClick, disabled, ...props }: any) => (
  <button onClick={onClick} disabled={disabled} {...props}>
    {children}
  </button>
);

export const Input = ({ onChange, value, ...props }: any) => (
  <input onChange={onChange} value={value} {...props} />
);

export const Label = ({ children, ...props }: any) => <label {...props}>{children}</label>;

export const cn = (...classes: string[]) => classes.filter(Boolean).join(' '); 