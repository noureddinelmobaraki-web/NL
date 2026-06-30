import { describe, it, expect } from 'vitest';
import { isAdmin } from '../admin';

describe('isAdmin', () => {
  it('returns true for noureddinelmobaraki@gmail.com',
    () => expect(isAdmin('noureddinelmobaraki@gmail.com')).toBe(true));
  it('returns false for any other email',
    () => expect(isAdmin('someone@example.com')).toBe(false));
  it('returns false for null',
    () => expect(isAdmin(null)).toBe(false));
  it('returns false for undefined',
    () => expect(isAdmin(undefined)).toBe(false));
  it('returns false for empty string',
    () => expect(isAdmin('')).toBe(false));
  it('is case-sensitive — uppercase email is not admin',
    () => expect(isAdmin('Noureddinelmobaraki@Gmail.com')).toBe(false));
});
