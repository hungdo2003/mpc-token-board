import { Router } from "express";
import { getStats, listAuditLogs } from "../controllers/dashboard.controller";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/stats", getStats);
router.get("/audit-logs", listAuditLogs);

export default router;
