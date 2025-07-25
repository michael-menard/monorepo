import jwt from 'jsonwebtoken';

export const generateTokenAndSetCookie = (res: any, userId: any) => {
  const token = jwt.sign(
    {id: userId },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
  )

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  })
}