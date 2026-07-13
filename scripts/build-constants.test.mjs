import test from 'node:test';
import assert from 'node:assert/strict';
import { ORIGIN, BASE, DOMAIN, ARTIST, CDN, PLAYLIST_COVER } from './build-constants.mjs';

test('canonical origin and base compose the expected DOMAIN', () => {
  assert.equal(ORIGIN, 'https://noureddinelmobaraki-web.github.io');
  assert.equal(BASE, '/NL');
  assert.equal(DOMAIN, 'https://noureddinelmobaraki-web.github.io/NL');
});

test('artist identity string is stable', () => {
  assert.equal(ARTIST, 'Noureddin El Mobaraki');
});

test('CDN and playlist cover resolve to the historical literals', () => {
  assert.equal(CDN, 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/');
  assert.equal(PLAYLIST_COVER, 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/playlist_cover.webp');
});
