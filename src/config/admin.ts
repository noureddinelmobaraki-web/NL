/**
 * The verified email of the site owner.
 * The system grants admin access only when the authenticated user's
 * email exactly matches this value. Never expose this in public logs.
 */
export const ADMIN_EMAIL = 'noureddinelmobaraki@gmail.com' as const;

export function isAdmin(email: string | undefined | null): boolean {
  return !!email && email === ADMIN_EMAIL;
}
