import { Request, Response, NextFunction } from "express";
import { AuthService, AuthPayload } from "../services/auth.service";

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Missing or invalid Authorization header" });
    return;
  }

  try {
    req.user = AuthService.verifyAccessToken(header.slice(7));
    next();
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message });
  }
}
