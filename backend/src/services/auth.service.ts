import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { UserRepository, UserPublic } from "../repositories/user.repository";
import { RefreshTokenRepository } from "../repositories/refreshToken.repository";
import { AuditLogRepository } from "../repositories/auditLog.repository";

const ACCESS_TOKEN_TTL  = "15m";
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

function generateAccessToken(user: UserPublic): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: ACCESS_TOKEN_TTL } as any
  );
}

function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

export const AuthService = {
  async register(email: string, password: string): Promise<UserPublic> {
    const existing = await UserRepository.findByEmail(email);
    if (existing) throw Object.assign(new Error("Email already registered"), { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserRepository.create(email, passwordHash);

    await AuditLogRepository.create({
      userId: user.id,
      action: "REGISTER",
      description: `New user registered: ${email}`,
    });

    return user;
  },

  async login(email: string, password: string, ipAddress?: string): Promise<{ user: UserPublic; tokens: AuthTokens }> {
    const user = await UserRepository.findByEmail(email);
    if (!user) throw Object.assign(new Error("Invalid credentials"), { status: 401 });
    if (user.status !== "active") throw Object.assign(new Error("Account is disabled"), { status: 403 });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw Object.assign(new Error("Invalid credentials"), { status: 401 });

    const tokens = await AuthService.issueTokens(user);

    await AuditLogRepository.create({
      userId: user.id,
      action: "LOGIN",
      description: "User logged in",
      ipAddress,
    });

    const { password_hash: _, ...publicUser } = user as any;
    return { user: publicUser, tokens };
  },

  async issueTokens(user: UserPublic): Promise<AuthTokens> {
    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const expiresAt    = new Date(Date.now() + REFRESH_TOKEN_TTL);

    await RefreshTokenRepository.create(user.id, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  },

  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    const stored = await RefreshTokenRepository.findValid(rawRefreshToken);
    if (!stored) throw Object.assign(new Error("Invalid or expired refresh token"), { status: 401 });

    const user = await UserRepository.findById(stored.user_id);
    if (!user || user.status !== "active") {
      await RefreshTokenRepository.revoke(rawRefreshToken);
      throw Object.assign(new Error("User not found or disabled"), { status: 401 });
    }

    // Rotate: revoke old, issue new
    await RefreshTokenRepository.revoke(rawRefreshToken);
    return AuthService.issueTokens(user);
  },

  async logout(rawRefreshToken: string | undefined, userId: string, ipAddress?: string): Promise<void> {
    if (rawRefreshToken) {
      await RefreshTokenRepository.revoke(rawRefreshToken);
    }
    await AuditLogRepository.create({
      userId,
      action: "LOGOUT",
      description: "User logged out",
      ipAddress,
    });
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await UserRepository.findById(userId);
    if (!user) throw Object.assign(new Error("User not found"), { status: 404 });

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw Object.assign(new Error("Current password is incorrect"), { status: 400 });

    const newHash = await bcrypt.hash(newPassword, 12);
    await UserRepository.updatePassword(userId, newHash);

    // Revoke all sessions on password change
    await RefreshTokenRepository.revokeAllForUser(userId);

    await AuditLogRepository.create({
      userId,
      action: "CHANGE_PASSWORD",
      description: "User changed their password",
    });
  },

  verifyAccessToken(token: string): AuthPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as AuthPayload;
    } catch {
      throw Object.assign(new Error("Invalid or expired access token"), { status: 401 });
    }
  },
};
