import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertArray,
  assertNonEmptyArray,
  assertObject,
  requireFields,
  assertItemsHaveFields,
} from './build-data-validation.mjs';

test('assertArray passes arrays and rejects non-arrays', () => {
  assert.deepEqual(assertArray([1, 2], 'x'), [1, 2]);
  assert.throws(() => assertArray({}, 'x'), /Expected x to be an array, received object/);
  assert.throws(() => assertArray(null, 'x'), /received null/);
});

test('assertNonEmptyArray rejects empty arrays', () => {
  assert.throws(() => assertNonEmptyArray([], 'songs'), /non-empty array/);
  assert.deepEqual(assertNonEmptyArray([1], 'songs'), [1]);
});

test('assertObject rejects arrays and null', () => {
  assert.throws(() => assertObject([], 'm'), /Expected m to be an object, received array/);
  assert.throws(() => assertObject(null, 'm'), /received null/);
  const o = { a: 1 };
  assert.equal(assertObject(o, 'm'), o);
});

test('requireFields flags missing or empty fields', () => {
  assert.throws(() => requireFields({ id: 1 }, ['id', 'title'], 'song'), /missing required field "title"/);
  assert.throws(() => requireFields({ id: 1, title: '' }, ['id', 'title'], 'song'), /missing required field "title"/);
  const ok = { id: 1, title: 'x' };
  assert.equal(requireFields(ok, ['id', 'title'], 'song'), ok);
});

test('assertItemsHaveFields validates each element and reports its index', () => {
  assert.throws(
    () => assertItemsHaveFields([{ id: 1, title: 'a' }, { id: 2 }], ['id', 'title'], 'songs'),
    /songs\[1\] is missing required field "title"/,
  );
  const items = [{ id: 1, title: 'a' }];
  assert.equal(assertItemsHaveFields(items, ['id', 'title'], 'songs'), items);
});
