import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  changePassword,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimiter";

const router = Router();

// Public
router.post("/register",       authLimiter, register);
router.post("/login",          authLimiter, login);
router.post("/refresh",        authLimiter, refresh);

// Protected
router.post("/logout",         authenticate, logout);
router.get("/me",              authenticate, getMe);
router.patch("/change-password", authenticate, changePassword);

export default router;
