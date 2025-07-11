import { Request, Response } from "express";
import { User } from "../models/User";

export const signup = async (req: Request, res: Response) => {
  try {
    // ... existing code ...
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    // ... existing code ...
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    // ... existing code ...
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    // ... existing code ...
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    // ... existing code ...
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    // ... existing code ...
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const checkAuth = async (req: Request, res: Response) => {
  try {
    // ... existing code ...
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
}; 