import React from 'react';

// CodeRabbit should suggest improvements to this component
export const TestCodeRabbitComponent = () => {
  const [count, setCount] = React.useState(0);
  
  // Issue 1: Missing useCallback - CodeRabbit should suggest this
  const handleIncrement = () => {
    setCount(count + 1);
  };
  
  // Issue 2: Missing useCallback - CodeRabbit should suggest this  
  const handleDecrement = () => {
    setCount(prev => prev - 1);
  };
  
  // Issue 3: Expensive calculation in render - CodeRabbit should flag this
  const expensiveValue = Array.from({length: 1000}, (_, i) => i).reduce((a, b) => a + b, 0);
  
  return (
    <div>
      {/* Issue 4: Missing accessibility - CodeRabbit should suggest aria-label */}
      <button onClick={handleIncrement}>+</button>
      <span>Count: {count}</span>
      <button onClick={handleDecrement}>-</button>
      <p>Expensive calculation result: {expensiveValue}</p>
    </div>
  );
};

// Issue 5: Hardcoded API key - CodeRabbit should flag this security issue
const API_KEY = "sk-1234567890abcdef";

// Issue 6: Unused variable - CodeRabbit should suggest removal
const unusedVariable = "this is not used anywhere";

export default TestCodeRabbitComponent;
