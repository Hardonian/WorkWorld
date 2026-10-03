/**
 * Developer API Key Management & Token Scoping (Pillar 7, Item 066).
 * Handles API key generation with prefixes, cryptographically secure hashing, and permission scopes.
 * Pure server logic: zero React/Next.js dependencies.
 */

import { randomBytes, createHash } from "node:crypto";

export type ApiKeyScope = "episodes:read" | "actions:write" | "evaluations:read" | "admin";

export interface ApiKeyRecord {
  id: string;
  keyPrefix: string; // e.g. "ww_live_ab12"
  hashedSecret: string;
  name: string;
  organizationId: string;
  scopes: ApiKeyScope[];
  createdAt: string;
  expiresAt?: string;
  isRevoked: boolean;
}

export function generateApiKey(params: {
  name: string;
  organizationId: string;
  scopes: ApiKeyScope[];
  expiresInDays?: number;
}): { plaintextKey: string; record: ApiKeyRecord } {
  const secretPart = randomBytes(24).toString("hex");
  const prefixPart = randomBytes(4).toString("hex");
  const plaintextKey = `ww_live_${prefixPart}_${secretPart}`;

  const hashedSecret = createHash("sha256").update(plaintextKey).digest("hex");
  const id = `KEY-${Date.now().toString(36)}-${prefixPart}`;
  const expiresAt = params.expiresInDays
    ? new Date(Date.now() + params.expiresInDays * 86400 * 1000).toISOString()
    : undefined;

  const record: ApiKeyRecord = {
    id,
    keyPrefix: `ww_live_${prefixPart}`,
    hashedSecret,
    name: params.name,
    organizationId: params.organizationId,
    scopes: params.scopes,
    createdAt: new Date().toISOString(),
    expiresAt,
    isRevoked: false,
  };

  return { plaintextKey, record };
}

export function verifyApiKey(
  plaintextKey: string,
  record: ApiKeyRecord,
  requiredScope?: ApiKeyScope
): { valid: boolean; reason?: string } {
  if (record.isRevoked) {
    return { valid: false, reason: "API key has been revoked" };
  }

  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
    return { valid: false, reason: "API key has expired" };
  }

  const checkHash = createHash("sha256").update(plaintextKey).digest("hex");
  if (checkHash !== record.hashedSecret) {
    return { valid: false, reason: "Invalid API key secret" };
  }

  if (requiredScope && !record.scopes.includes(requiredScope) && !record.scopes.includes("admin")) {
    return { valid: false, reason: `Missing required scope: ${requiredScope}` };
  }

  return { valid: true };
}
