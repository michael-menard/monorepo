export const generateVerificationCode = () => {
  return Math.floor(1000000 + Math.random() * 9000).toString();
};
