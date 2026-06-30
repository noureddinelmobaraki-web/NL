import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSelect   = vi.fn().mockReturnThis();
const mockLimit    = vi.fn().mockReturnThis();
const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select:      mockSelect,
      limit:       mockLimit,
      maybeSingle: mockMaybeSingle,
    })),
  },
}));

import { startKeepAlive, stopKeepAlive } from '../supabaseKeepAlive';

describe('supabaseKeepAlive', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Ensure clean state
    stopKeepAlive();
  });

  afterEach(() => {
    stopKeepAlive();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('does not ping immediately on start', () => {
    startKeepAlive();
    expect(mockMaybeSingle).not.toHaveBeenCalled();
  });

  it('pings after 4 minutes', async () => {
    startKeepAlive();
    await vi.advanceTimersByTimeAsync(4 * 60 * 1000);
    expect(mockMaybeSingle).toHaveBeenCalledOnce();
  });

  it('pings multiple times over time', async () => {
    startKeepAlive();
    await vi.advanceTimersByTimeAsync(12 * 60 * 1000); // 3 intervals
    expect(mockMaybeSingle).toHaveBeenCalledTimes(3);
  });

  it('stop() cancels further pings', async () => {
    startKeepAlive();
    await vi.advanceTimersByTimeAsync(4 * 60 * 1000);
    stopKeepAlive();
    await vi.advanceTimersByTimeAsync(8 * 60 * 1000);
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1); // only the first ping
  });

  it('calling startKeepAlive twice does not create duplicate intervals', async () => {
    startKeepAlive();
    startKeepAlive(); // second call — should be a no-op
    await vi.advanceTimersByTimeAsync(4 * 60 * 1000);
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
  });
});
