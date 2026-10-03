/**
 * WorkWorld Role-Based Access Control (RBAC) Matrix.
 * Pure TypeScript — no React imports.
 */

export type Role = "learner" | "assessor" | "instructor" | "org_admin" | "super_admin";
export type UserRole = Role;

export type Permission =
  | "episode:play"
  | "episode:observe"
  | "episode:act"
  | "assessment:read"
  | "assessment:grade"
  | "assessment:export"
  | "cohort:manage"
  | "analytics:read"
  | "tenant:configure"
  | "tenant:audit_log"
  | "system:admin";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  learner: ["episode:play", "episode:observe", "episode:act", "assessment:read"],
  assessor: [
    "episode:observe",
    "assessment:read",
    "assessment:grade",
    "assessment:export",
    "analytics:read",
  ],
  instructor: [
    "episode:observe",
    "assessment:read",
    "assessment:export",
    "cohort:manage",
    "analytics:read",
  ],
  org_admin: [
    "episode:observe",
    "assessment:read",
    "assessment:export",
    "cohort:manage",
    "analytics:read",
    "tenant:configure",
    "tenant:audit_log",
  ],
  super_admin: [
    "episode:play",
    "episode:observe",
    "episode:act",
    "assessment:read",
    "assessment:grade",
    "assessment:export",
    "cohort:manage",
    "analytics:read",
    "tenant:configure",
    "tenant:audit_log",
    "system:admin",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function authorizeRole(userRole: Role, requiredPermission: Permission): void {
  if (!hasPermission(userRole, requiredPermission)) {
    throw new Error(
      `Permission denied: role '${userRole}' lacks required permission '${requiredPermission}'`
    );
  }
}
