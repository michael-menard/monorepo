// Test file for lint-staged configuration
const testFunction = () => {
  // Intentionally poorly formatted code to test linting
  const obj = { name: 'test', value: 123 };

  if (obj.name === 'test') {
    return obj.value;
  }

  return null;
};

export default testFunction;
