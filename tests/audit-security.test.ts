import { describe, it, expect } from "vitest";
import { ROLE_PERMISSIONS, hasPermission, authorizeRole } from "../src/server/rbac.ts";
import { AuditLogService } from "../src/server/audit.ts";

describe("Enterprise Security, RBAC & Audit Trail", () => {
  describe("Role-Based Access Control", () => {
    it("enforces least-privilege matrix across roles", () => {
      expect(ROLE_PERMISSIONS).toBeDefined();
      // Learner cannot grade or administer
      expect(hasPermission("learner", "episode:play")).toBe(true);
      expect(hasPermission("learner", "assessment:grade")).toBe(false);
      expect(hasPermission("learner", "system:admin")).toBe(false);

      // Assessor can grade and export
      expect(hasPermission("assessor", "assessment:grade")).toBe(true);
      expect(hasPermission("assessor", "assessment:export")).toBe(true);
      expect(hasPermission("assessor", "system:admin")).toBe(false);

      // Super admin has full permissions
      expect(hasPermission("super_admin", "system:admin")).toBe(true);
      expect(hasPermission("super_admin", "tenant:configure")).toBe(true);
    });

    it("throws clear permission error on unauthorized action", () => {
      expect(() => authorizeRole("learner", "system:admin")).toThrow(
        /Permission denied: role 'learner' lacks required permission 'system:admin'/
      );
      expect(() => authorizeRole("super_admin", "system:admin")).not.toThrow();
    });
  });

  describe("Security Audit Log Service", () => {
    it("creates hash-chained audit records for compliance tracking", () => {
      const entry1 = AuditLogService.log({
        actorId: "usr_101",
        actorRole: "instructor",
        action: "USER_LOGIN",
        targetResource: "session:web",
        ipAddress: "192.168.1.100",
        status: "SUCCESS",
      });

      const entry2 = AuditLogService.log({
        actorId: "usr_101",
        actorRole: "instructor",
        action: "GRADE_SIGNED_OFF",
        targetResource: "run_8819",
        ipAddress: "192.168.1.100",
        status: "SUCCESS",
      });

      expect(entry1.recordHash).toBeDefined();
      expect(entry2.previousHash).toBe(entry1.recordHash);

      // Verification of entire hash chain
      expect(AuditLogService.verifyChain()).toBe(true);
    });
  });
});
