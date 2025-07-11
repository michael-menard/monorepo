import {NextFunction, Request, Response} from 'express';
import bcrypt from 'bcryptjs';
import crypto from "crypto";
import {User} from "../models/User";
import dotenv from "dotenv";
import {generateVerificationCode} from "../utils/generateVerificationCode";
import {generateTokenAndSetCookie} from "../utils/generateTokenAndSetCookie";
import {sendPasswordResetEmail, sendVarificationEmail, sendWelcomeEmail, sendResetSuccessEmail} from "../mailtrap/emails"

dotenv.config();

const CLIENT_URL = process.env.CLIENT_URL || '';

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, name } = req.body;

  try {
    if (!email || !password || !name) {
      res.status(400).json({ success: false, message: 'All fields are required' });
      return;
    }

    const userAlreadyExists = await User.findOne({email});
    if (userAlreadyExists) {
      res.status(400).json({ success: false, message: 'User already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = generateVerificationCode()

    const user = new User({
      email,
      password: hashedPassword,
      name,
      verificationToken,
      verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24hrs
    })

    await user.save();

    generateTokenAndSetCookie(res, user._id)

    const { password: any, ...userWithoutPassword } = user;

    await sendVarificationEmail(user.email, verificationToken)

    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully',
      data: userWithoutPassword
    });

  } catch (error: any) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({email})
    if (!user) {
      res.status(400).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      res.status(400).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    generateTokenAndSetCookie(res, user._id)
    user.lastLogin = new Date()
    user.save()

    const { password: any, ...userWithoutPassword } = user;
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        ...userWithoutPassword
      }
    });

  } catch (e) {
    console.log(e)
    res.status(500).json({ success: false, message: e });
  }
};

export const logout = (req: Request, res: Response, next: NextFunction) => {
  try {
    res.clearCookie('token');
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    next(error);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { code } = req.body

  try {
    const user = await User.findOne({
      verificationToken: code,
      verificationTokenExpiresAt: { $gt: Date.now() }
    })

    if (!user) {
      res.status(400).json({ success: false, message: 'Invalid verification code' });
      return;
    }

    user.isVerified = true
    user.verificationToken = undefined
    user.verificationTokenExpiresAt = undefined

    await user.save()

    await sendWelcomeEmail(user.email, user.name)

    const { password: any, ...userWithoutPassword } = user;

    res.status(200)
      .json({ success: true, message: 'Welcome email sent successfully', user: userWithoutPassword })
  } catch (e) {
    console.log(e)
    next(e);
  }
}

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = resetTokenExpiresAt;

    // Save the user first to ensure token is stored
    await user.save();

    console.log('CLIENT_URL is:', CLIENT_URL);
    const resetUrl = `${CLIENT_URL}/reset-password/${resetToken}`;
    console.log('Generated reset URL:', resetUrl);

    await sendPasswordResetEmail(user.email, resetUrl);
    res.status(200).json({ success: true, message: 'Reset password email sent successfully' });
    return; // Ensure no further code executes
  } catch (e) {
    console.error('Error during forgotPassword:', e);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to send reset email' });
    }
    next(e);
    return; // Ensure we terminate the function properly
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.params
    const { password } = req.body

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: Date.now() }
    })

    if (!user) {
      res.status(400).json({ success: false, message: 'Invalid reset token' });
      return;
    }

    user.password = await bcrypt.hash(password, 10)
    user.resetPasswordToken = undefined
    user.resetPasswordExpiresAt = undefined
    await user.save()

    await sendResetSuccessEmail(user.email)

    res.status(200).json({ success: true, message: 'Password reset successful' });

  } catch (e) {
    console.log(e)
    res.status(500).json({ success: false, message: e });
  }
}

export const checkAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = User.findById(req.userId).select('-password')
    if (!user) {
      res.status(401).json({ success: false, message: 'Not authorized' });
      return;
    }
    res.status(200).json({ success: true, message: 'Authorized', user });
  } catch (e) {
    console.log(e)
    res.status(400).json({ success: false, message: e });
  }
}