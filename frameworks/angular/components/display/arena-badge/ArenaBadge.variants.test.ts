import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaBadgeStyles } from './ArenaBadge.variants';

const TONES = ['neutral', 'success', 'warning', 'danger', 'info'] as const;

test('the five tones resolve to five distinct roots, none silently collapsing onto another', () => {
  const roots = new Set(TONES.map((tone) => JSON.stringify(arenaBadgeStyles({ tone }).$data.root())));
  assert.equal(roots.size, TONES.length, `two tones resolved to the same classes: ${[...roots].join(' | ')}`);
});

