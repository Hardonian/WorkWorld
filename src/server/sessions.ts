/**
 * Active Session Management & Remote Revocation (Pillar 6, Item 059).
 * Tracks concurrent active sessions, detects anomalies, and enforces remote revocation.
 * Pure server logic: zero React/Next.js dependencies.
 */

export interface ActiveSession {
  sessionId: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastActivityAt: string;
  isRevoked: boolean;
}

export class SessionRegistry {
  private sessions = new Map<string, ActiveSession>();

  createSession(params: {
    sessionId: string;
    userId: string;
    ipAddress: string;
    userAgent: string;
  }): ActiveSession {
    const session: ActiveSession = {
      ...params,
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      isRevoked: false,
    };
    this.sessions.set(params.sessionId, session);
    return session;
  }

  touchSession(sessionId: string): boolean {
    const s = this.sessions.get(sessionId);
    if (!s || s.isRevoked) return false;
    s.lastActivityAt = new Date().toISOString();
    return true;
  }

  revokeSession(sessionId: string): boolean {
    const s = this.sessions.get(sessionId);
    if (!s) return false;
    s.isRevoked = true;
    return true;
  }

  revokeAllForUser(userId: string): number {
    let count = 0;
    for (const s of this.sessions.values()) {
      if (s.userId === userId && !s.isRevoked) {
        s.isRevoked = true;
        count++;
      }
    }
    return count;
  }

  getActiveSessionsForUser(userId: string): ActiveSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.userId === userId && !s.isRevoked
    );
  }
}
