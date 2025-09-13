import React from 'react';

// Test component with poor formatting
const TestComponent = ({ name, age, city }: { name: string; age: number; city: string }) => {
  const greeting = `Hello ${name}, you are ${age} years old and live in ${city}`;
  return <div style={{ color: 'red' }}>{greeting}</div>;
};

export default TestComponent;
