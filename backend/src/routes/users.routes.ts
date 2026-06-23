import { Router } from "express";
import {
  listUsers,
  getUserById,
  updateWallet,
  removeWallet,
  updateUserStatus,
} from "../controllers/users.controller";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";

const router = Router();

router.use(authenticate);

router.get("/",               requireAdmin, listUsers);
router.get("/:id",            requireAdmin, getUserById);
router.patch("/me/wallet",    updateWallet);
router.delete("/me/wallet",   removeWallet);
router.patch("/:id/status",   requireAdmin, updateUserStatus);

export default router;
