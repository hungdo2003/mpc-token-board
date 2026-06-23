import { Router } from "express";
import multer from "multer";
import {
  sendByAddress,
  sendByUserId,
  sendBulk,
  listTransactions,
  getTransaction,
} from "../controllers/transfers.controller";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.post("/send-by-address", sendByAddress);
router.post("/send-by-user", sendByUserId);
router.post("/bulk", upload.single("file"), sendBulk);
router.get("/", listTransactions);
router.get("/:id", getTransaction);

export default router;
