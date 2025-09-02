import jwt from 'jsonwebtoken';

const getJwtSecret = (): string => {
  const s = process.env.JWT_SECRET;
  if (!s) {
    throw new Error('JWT_SECRET is required');
  }
  return s;
};

export const generateTokenAndSetCookie = (res: any, userId: string | { toString(): string }) => {
  const uid = typeof userId === 'string' ? userId : userId.toString();
  const token = jwt.sign({ sub: uid, userId: uid }, getJwtSecret(), {
    expiresIn: '7d',
    issuer: 'auth-service',
  });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};
