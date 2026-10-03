/**
 * Unified Enterprise Authentication System (Pillar 6, Item 051).
 * Supports password hashing (scrypt/PBKDF2), magic link tokens, and session identity.
 * Pure server logic: zero React/Next.js dependencies.
 */

import { randomBytes, pbkdf2Sync } from "node:crypto";
import type { UserRole } from "./rbac.ts";

export interface UserAccount {
  id: string;
  email: string;
  passwordHash?: string;
  salt?: string;
  role: UserRole;
  organizationId: string;
  cohortId?: string;
  isActive: boolean;
  createdAt: string;
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const check = pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return check === hash;
}

export function generateMagicLinkToken(email: string, expiresInMinutes = 15): { token: string; expiresAt: Date } {
  const randomStr = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  return { token: `ml_${randomStr}`, expiresAt };
}
