import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_SR_ONLY } from './DataVisuals';

test('ARENA_SR_ONLY hides the element without removing it from the accessibility tree', () => {

  assert.equal(ARENA_SR_ONLY.position, 'absolute');
  assert.equal(ARENA_SR_ONLY.clipPath, 'inset(50%)');
  assert.equal(ARENA_SR_ONLY.overflow, 'hidden');
  assert.ok(!('display' in ARENA_SR_ONLY), 'display:none would drop it from the accessibility tree');
});

test('every ARENA_SR_ONLY value carries its unit, because Angular appends none', () => {

  for (const [key, value] of Object.entries(ARENA_SR_ONLY)) {
    assert.equal(typeof value, 'string', `${key} must be a string`);

    if (/^-?\d/.test(value)) assert.match(value, /^(0|-?\d+px)$/, `${key} must carry a unit or be 0`);
  }
});

test('ARENA_SR_ONLY cancels its own footprint so the hidden table shifts no sibling', () => {
  assert.equal(ARENA_SR_ONLY.margin, `-${ARENA_SR_ONLY.width}`);
  assert.equal(ARENA_SR_ONLY.width, ARENA_SR_ONLY.height);
});
