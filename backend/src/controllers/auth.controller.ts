import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { query, queryOne } from "../db";
import { config } from "../config";
import { auditLog } from "../utils/audit";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: Request, res: Response): Promise<void> {
  const parse = RegisterSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { email, password } = parse.data;

  const existing = await queryOne("SELECT id FROM users WHERE email = $1", [email]);
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await query(
    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'user') RETURNING id, email, role, status, created_at`,
    [email, passwordHash]
  );

  await auditLog(user.id, "REGISTER", `New user registered: ${email}`, req);

  res.status(201).json({ message: "Registration successful", user });
}

export async function login(req: Request, res: Response): Promise<void> {
  const parse = LoginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { email, password } = parse.data;

  const user = await queryOne<any>("SELECT * FROM users WHERE email = $1", [email]);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.status !== "active") {
    res.status(403).json({ error: "Account is disabled" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as any
  );

  await auditLog(user.id, "LOGIN", `User logged in`, req);

  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role, walletAddress: user.wallet_address },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  if (req.user) {
    await auditLog(req.user.userId, "LOGOUT", "User logged out", req);
  }
  res.json({ message: "Logged out successfully" });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await queryOne<any>("SELECT id, email, role, wallet_address, status, created_at FROM users WHERE id = $1", [req.user!.userId]);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user });
}
