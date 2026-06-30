import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act }                       from '@testing-library/react';

const { mockRpc, mockSignOut } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock('../../../config/supabase', () => ({
  supabase: {
    rpc:  mockRpc,
    auth: { signOut: mockSignOut },
  },
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-uuid-test', email: 'test@example.com' } }),
}));

import { useDeleteAccount } from '../useDeleteAccount';

describe('useDeleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({});
  });

  it('starts with idle status', () => {
    const { result } = renderHook(() => useDeleteAccount());
    expect(result.current.status).toBe('idle');
    expect(result.current.errorMsg).toBeNull();
  });

  it('returns true and signs out on success', async () => {
    mockRpc.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useDeleteAccount());
    let success: boolean | undefined;
    await act(async () => { success = await result.current.deleteAccount(); });
    expect(success!).toBe(true);
    expect(result.current.status).toBe('success');
    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it('returns false and sets error on rpc failure', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'DB error' } });
    const { result } = renderHook(() => useDeleteAccount());
    let success: boolean | undefined;
    await act(async () => { success = await result.current.deleteAccount(); });
    expect(success!).toBe(false);
    expect(result.current.status).toBe('error');
    expect(result.current.errorMsg).toBe('DB error');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('reset() returns to idle', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'fail' } });
    const { result } = renderHook(() => useDeleteAccount());
    await act(async () => { await result.current.deleteAccount(); });
    expect(result.current.status).toBe('error');
    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.errorMsg).toBeNull();
  });
});
