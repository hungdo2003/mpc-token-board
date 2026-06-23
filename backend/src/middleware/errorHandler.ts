import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export interface AppError extends Error {
  status?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status || 500;
  const message = status < 500 ? err.message : "Internal server error";

  logger.error(err.message, {
    status,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
  });

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== "production" && status >= 500 && { detail: err.message }),
  });
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
}
