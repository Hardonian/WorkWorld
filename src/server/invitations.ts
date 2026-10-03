/**
 * Member Invitations & Onboarding (Pillar 6, Item 055).
 * Tokenized team invites with expiration, role assignment, and cohort enrollment.
 * Pure server logic: zero React/Next.js dependencies.
 */

import { randomBytes } from "node:crypto";
import type { UserRole } from "./rbac.ts";

export interface TeamInvitation {
  id: string;
  token: string;
  email: string;
  organizationId: string;
  cohortId?: string;
  assignedRole: UserRole;
  expiresAt: string;
  status: "pending" | "accepted" | "expired" | "revoked";
}

export class InvitationService {
  private invites = new Map<string, TeamInvitation>();

  createInvitation(params: {
    email: string;
    organizationId: string;
    cohortId?: string;
    assignedRole: UserRole;
    expiresInDays?: number;
  }): TeamInvitation {
    const token = `inv_${randomBytes(24).toString("hex")}`;
    const id = `INV-${randomBytes(8).toString("hex")}`;
    const expiresAt = new Date(Date.now() + (params.expiresInDays ?? 7) * 86400 * 1000).toISOString();

    const invite: TeamInvitation = {
      id,
      token,
      email: params.email.toLowerCase(),
      organizationId: params.organizationId,
      cohortId: params.cohortId,
      assignedRole: params.assignedRole,
      expiresAt,
      status: "pending",
    };

    this.invites.set(token, invite);
    return invite;
  }

  acceptInvitation(token: string): { ok: boolean; invite?: TeamInvitation; error?: string } {
    const invite = this.invites.get(token);
    if (!invite) return { ok: false, error: "Invitation not found" };
    if (invite.status !== "pending") return { ok: false, error: `Invitation is already ${invite.status}` };
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      invite.status = "expired";
      return { ok: false, error: "Invitation has expired" };
    }

    invite.status = "accepted";
    return { ok: true, invite };
  }
}
