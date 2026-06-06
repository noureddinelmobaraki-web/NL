import { useEffect, useState, useCallback } from 'react';
import { CONTACT_LIMITS } from '../constants/contact';

interface ClientRateLimit {
  isBlocked: boolean;
  remaining: number;
  log: string[];
  recordSend: () => void;
}

export function useClientRateLimit(): ClientRateLimit {
  const [log, setLog] = useState<string[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);

  // Hydrate + prune on mount
  useEffect(() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const raw = localStorage.getItem(CONTACT_LIMITS.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const now = Date.now();
      const valid = parsed.filter(
        (ts): ts is string =>
          typeof ts === 'string' && now - new Date(ts).getTime() < CONTACT_LIMITS.windowMs
      );
      setLog(valid);
      if (valid.length >= CONTACT_LIMITS.maxMessagesPerWindow) setIsBlocked(true);
      localStorage.setItem(CONTACT_LIMITS.storageKey, JSON.stringify(valid));
    } catch (err) {
      console.warn('[useClientRateLimit] failed to parse send log:', err);
    }
  }, []);

  const recordSend = useCallback(() => {
    const next = [...log, new Date().toISOString()];
    setLog(next);
    try {
      localStorage.setItem(CONTACT_LIMITS.storageKey, JSON.stringify(next));
    } catch (err) {
      console.warn('[useClientRateLimit] failed to persist send log:', err);
    }
    if (next.length >= CONTACT_LIMITS.maxMessagesPerWindow) setIsBlocked(true);
  }, [log]);

  return {
    isBlocked,
    remaining: Math.max(0, CONTACT_LIMITS.maxMessagesPerWindow - log.length),
    log,
    recordSend,
  };
}
