// Final test for lint-staged
const badlyFormatted = () => {
  const obj = { a: 1, b: 2, c: 3 };
  if (obj.a === 1) {
    return obj.b + obj.c;
  }
  return 0;
};

export default badlyFormatted;
