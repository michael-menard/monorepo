declare module 'react' {
  export * from 'react';
}

declare module 'react/jsx-runtime' {
  export * from 'react/jsx-runtime';
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
} 