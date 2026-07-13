// scripts/build-data-validation.mjs
// Shared fail-fast validators for build-time data generators.
// Pure Node, no dependencies. On VALID data these are no-ops that return the
// input unchanged; on malformed data they throw a clear, actionable error that
// names the offending file/field so a broken build fails early with a useful
// message instead of a cryptic crash deep inside a generator.

function describe(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

export function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`[build-data] Expected ${label} to be an array, received ${describe(value)}.`);
  }
  return value;
}

export function assertNonEmptyArray(value, label) {
  assertArray(value, label);
  if (value.length === 0) {
    throw new Error(`[build-data] Expected ${label} to be a non-empty array.`);
  }
  return value;
}

export function assertObject(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`[build-data] Expected ${label} to be an object, received ${describe(value)}.`);
  }
  return value;
}

export function requireFields(item, fields, label) {
  assertObject(item, label);
  for (const field of fields) {
    const v = item[field];
    if (v === undefined || v === null || v === '') {
      throw new Error(`[build-data] ${label} is missing required field "${field}".`);
    }
  }
  return item;
}

export function assertItemsHaveFields(items, fields, label) {
  assertNonEmptyArray(items, label);
  items.forEach((item, index) => requireFields(item, fields, `${label}[${index}]`));
  return items;
}
