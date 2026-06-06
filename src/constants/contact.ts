export const CONTACT_LIMITS = {
  /** localStorage key holding the daily send log */
  storageKey: 'nl-send-log-v1',
  /** Maximum messages a single user can send within `windowMs` */
  maxMessagesPerWindow: 3,
  /** Rolling time window for rate limit (24 hours) */
  windowMs: 24 * 60 * 60 * 1000,
} as const;
