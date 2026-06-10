import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClientRateLimit } from './useClientRateLimit';
import { CONTACT_LIMITS } from '../constants/contact';

describe('useClientRateLimit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts unblocked with full remaining allowance', () => {
    const { result } = renderHook(() => useClientRateLimit());
    expect(result.current.isBlocked).toBe(false);
    expect(result.current.remaining).toBe(CONTACT_LIMITS.maxMessagesPerWindow);
  });

  it('decrements remaining and blocks after reaching the limit', () => {
    const { result } = renderHook(() => useClientRateLimit());
    for (let i = 0; i < CONTACT_LIMITS.maxMessagesPerWindow; i++) {
      act(() => result.current.recordSend());
    }
    expect(result.current.remaining).toBe(0);
    expect(result.current.isBlocked).toBe(true);
  });

  it('hydrates an existing valid log from localStorage', () => {
    const now = new Date().toISOString();
    localStorage.setItem(CONTACT_LIMITS.storageKey, JSON.stringify([now]));
    const { result } = renderHook(() => useClientRateLimit());
    expect(result.current.remaining).toBe(CONTACT_LIMITS.maxMessagesPerWindow - 1);
  });

  it('prunes expired entries outside the rolling window', () => {
    const expired = new Date(Date.now() - CONTACT_LIMITS.windowMs - 1000).toISOString();
    localStorage.setItem(CONTACT_LIMITS.storageKey, JSON.stringify([expired]));
    const { result } = renderHook(() => useClientRateLimit());
    expect(result.current.remaining).toBe(CONTACT_LIMITS.maxMessagesPerWindow);
    expect(result.current.isBlocked).toBe(false);
  });
});
