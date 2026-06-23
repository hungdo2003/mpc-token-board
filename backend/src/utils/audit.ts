import { Request } from "express";
import { AuditLogRepository } from "../repositories/auditLog.repository";

function getIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"] as string | undefined;
  return forwarded?.split(",")[0].trim() ?? req.socket.remoteAddress ?? null;
}

export async function auditLog(
  userId: string | null,
  action: string,
  description: string,
  req?: Request
): Promise<void> {
  await AuditLogRepository.create({
    userId,
    action,
    description,
    ipAddress: req ? getIp(req) : null,
  });
}
