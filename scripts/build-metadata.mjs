import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

function normalizeIso(value, label) {
  if (!value) return null;
  const date = /^\d+$/.test(value) ? new Date(Number(value) * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid ${label}: ${value}`);
  return date.toISOString();
}

export function stableContentHash(parts) {
  const hash = createHash('sha256');
  for (const part of parts) {
    const text = String(part);
    hash.update(String(Buffer.byteLength(text)));
    hash.update(':');
    hash.update(text);
    hash.update('\n');
  }
  return hash.digest('hex').slice(0, 16);
}

export function resolveBuildRevision({ env = process.env, fallbackContents = [] } = {}) {
  const githubSha = env.GITHUB_SHA?.trim();
  if (githubSha) return githubSha.slice(0, 16);
  try {
    const gitSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (gitSha) return gitSha.slice(0, 16);
  } catch { /* deterministic content fallback below */ }
  return `content-${stableContentHash(fallbackContents)}`;
}

export function resolveBuildDate({ env = process.env } = {}) {
  if (env.SOURCE_DATE_EPOCH) return normalizeIso(env.SOURCE_DATE_EPOCH, 'SOURCE_DATE_EPOCH');
  if (env.BUILD_DATE) return normalizeIso(env.BUILD_DATE, 'BUILD_DATE');
  try {
    const commitDate = execFileSync('git', ['log', '-1', '--format=%cI'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return normalizeIso(commitDate, 'git commit date');
  } catch { return null; }
}
