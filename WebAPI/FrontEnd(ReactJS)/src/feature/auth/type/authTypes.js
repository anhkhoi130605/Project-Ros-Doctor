/**
 * Auth Domain Models & Contracts
 */

export const AuthRoles = {
  ADMIN: 'Admin',
  ENGINEERING: 'Engineering',
  USER: 'User',
};

export function parseUserRole(data, user) {
  const rawRole = user?.role ?? user?.Role ?? data?.role ?? data?.Role ?? '';
  return rawRole.toString().trim();
}
