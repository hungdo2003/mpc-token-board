import { query } from "../db";
import { Request } from "express";

export async function auditLog(
  userId: string | null,
  action: string,
  description: string,
  req?: Request
): Promise<void> {
  const ip = req
    ? (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || req.socket.remoteAddress || null
    : null;

  await query(
    `INSERT INTO audit_logs (user_id, action, description, ip_address) VALUES ($1, $2, $3, $4)`,
    [userId, action, description, ip]
  );
}
