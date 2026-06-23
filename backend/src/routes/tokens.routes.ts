import { Router } from "express";
import { listTokens, getToken, addToken, updateToken, disableToken } from "../controllers/tokens.controller";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";

const router = Router();

router.use(authenticate);

router.get("/", listTokens);
router.get("/:id", getToken);
router.post("/", requireAdmin, addToken);
router.patch("/:id", requireAdmin, updateToken);
router.delete("/:id", requireAdmin, disableToken);

export default router;
