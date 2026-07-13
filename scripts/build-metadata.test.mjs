import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBuildDate, resolveBuildRevision, stableContentHash } from './build-metadata.mjs';

test('content hash is stable and order-sensitive', () => {
  assert.equal(stableContentHash(['a', 'b']), stableContentHash(['a', 'b']));
  assert.notEqual(stableContentHash(['a', 'b']), stableContentHash(['b', 'a']));
});
test('GITHUB_SHA wins deterministically', () => {
  assert.equal(resolveBuildRevision({ env: { GITHUB_SHA: '1234567890abcdefEXTRA' } }), '1234567890abcdef');
});
test('content fallback is deterministic', () => {
  const o = { env: {}, fallbackContents: ['template', 'package'] };
  assert.equal(resolveBuildRevision(o), resolveBuildRevision(o));
  assert.match(resolveBuildRevision(o), /^content-[a-f0-9]{16}$/);
});
test('explicit dates normalize to ISO', () => {
  assert.equal(resolveBuildDate({ env: { SOURCE_DATE_EPOCH: '0' } }), '1970-01-01T00:00:00.000Z');
  assert.equal(resolveBuildDate({ env: { BUILD_DATE: '2026-07-12T00:00:00Z' } }), '2026-07-12T00:00:00.000Z');
});
test('invalid explicit dates fail', () => {
  assert.throws(() => resolveBuildDate({ env: { BUILD_DATE: 'bad' } }), /Invalid BUILD_DATE/);
});
