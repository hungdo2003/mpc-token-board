import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AuthService } from "../services/auth.service";
import { UserRepository } from "../repositories/user.repository";
import { success, fail } from "../utils/response";

const RegisterSchema = z.object({
  email:    z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8, "New password must be at least 8 characters"),
});

function getIp(req: Request): string | undefined {
  const fwd = req.headers["x-forwarded-for"] as string | undefined;
  return fwd?.split(",")[0].trim() ?? req.socket.remoteAddress ?? undefined;
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  const parse = RegisterSchema.safeParse(req.body);
  if (!parse.success) { fail(res, parse.error.errors[0].message); return; }

  try {
    const user = await AuthService.register(parse.data.email, parse.data.password);
    success(res, { user }, 201);
  } catch (err) { next(err); }
}

// ─── POST /api/auth/login ────────────────────────────────────────────────────
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  const parse = LoginSchema.safeParse(req.body);
  if (!parse.success) { fail(res, parse.error.errors[0].message); return; }

  try {
    const { user, tokens } = await AuthService.login(
      parse.data.email,
      parse.data.password,
      getIp(req)
    );

    // Set refresh token as HttpOnly cookie for security
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
    });

    success(res, {
      user,
      accessToken: tokens.accessToken,
      expiresIn:   tokens.expiresIn,
    });
  } catch (err) { next(err); }
}

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Accept from cookie or request body
  const rawToken = req.cookies?.refreshToken ?? req.body?.refreshToken;
  const parse = RefreshSchema.safeParse({ refreshToken: rawToken });
  if (!parse.success) { fail(res, "Refresh token required", 401); return; }

  try {
    const tokens = await AuthService.refresh(parse.data.refreshToken);

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge:   7 * 24 * 60 * 60 * 1000,
    });

    success(res, { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn });
  } catch (err) { next(err); }
}

// ─── POST /api/auth/logout ───────────────────────────────────────────────────
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  const rawToken = req.cookies?.refreshToken ?? req.body?.refreshToken;
  try {
    await AuthService.logout(rawToken, req.user!.userId, getIp(req));
    res.clearCookie("refreshToken");
    success(res, { message: "Logged out successfully" });
  } catch (err) { next(err); }
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await UserRepository.findById(req.user!.userId);
    if (!user) { fail(res, "User not found", 404); return; }
    const { password_hash: _, ...publicUser } = user as any;
    success(res, { user: publicUser });
  } catch (err) { next(err); }
}

// ─── PATCH /api/auth/change-password ─────────────────────────────────────────
export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  const parse = ChangePasswordSchema.safeParse(req.body);
  if (!parse.success) { fail(res, parse.error.errors[0].message); return; }

  try {
    await AuthService.changePassword(
      req.user!.userId,
      parse.data.currentPassword,
      parse.data.newPassword
    );
    res.clearCookie("refreshToken");
    success(res, { message: "Password changed. Please log in again." });
  } catch (err) { next(err); }
}
