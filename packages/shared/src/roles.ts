// Roles are stored as the `role` custom claim on the Firebase Auth token.
export const ROLES = ['superAdmin', 'owner', 'staff', 'instructor', 'student'] as const;

export type Role = (typeof ROLES)[number];

export const ADMIN_ROLES: readonly Role[] = ['superAdmin', 'owner', 'staff'];

export function isAdminRole(role: unknown): role is Role {
  return typeof role === 'string' && (ADMIN_ROLES as readonly string[]).includes(role);
}
