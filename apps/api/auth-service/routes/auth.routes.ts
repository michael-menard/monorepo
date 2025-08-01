import express, { Request, Response, Router } from "express";
import { login, logout, signup, verifyEmail, forgotPassword, resetPassword, checkAuth, resendVerification } from "../controllers/auth.controller";
import {verifyToken} from "../middleware/authMiddleware";

const router: Router = express.Router();

router.get("/check-auth", verifyToken, checkAuth, )

router.post("/sign-up", signup);
router.post("/login", login);
router.post("/log-out", logout);

router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/resend-verification", resendVerification);

// Health check route
router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

export default router;