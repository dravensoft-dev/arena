import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaTimelineGlyph, arenaTimelineState, arenaTimelineTone } from './TimelineGlyphs';

test('each status tone carries its own glyph, and neutral carries none', () => {
  assert.deepEqual(
    (['success', 'warning', 'danger', 'info', 'neutral'] as const).map((tone) => arenaTimelineGlyph(tone)),
    ['ph-fill ph-check-circle', 'ph-fill ph-warning', 'ph-fill ph-warning-octagon', 'ph-fill ph-info', undefined],
  );
});

test('an icon replaces the tone\'s glyph, on a neutral milestone too, and a blank one does not', () => {
  assert.equal(arenaTimelineGlyph('danger', 'ph-bold ph-truck'), 'ph-bold ph-truck');
  assert.equal(arenaTimelineGlyph('neutral', 'ph-bold ph-truck'), 'ph-bold ph-truck');
  assert.equal(arenaTimelineGlyph('info', '  '), 'ph-fill ph-info');
});

test('an absent or unknown tone reads as neutral', () => {
  assert.equal(arenaTimelineTone(undefined), 'neutral');
  assert.equal(arenaTimelineTone('loud'), 'neutral');
  assert.equal(arenaTimelineTone('warning'), 'warning');
});

test('a milestone before the index is complete, at it current and after it upcoming, and no index is a history', () => {
  const states = (index: number | undefined) => [0, 1, 2].map((i) => arenaTimelineState(i, index, 3));
  assert.deepEqual(states(1), ['complete', 'current', 'upcoming']);
  assert.deepEqual(states(undefined), ['complete', 'complete', 'complete']);
  assert.deepEqual(states(7), ['complete', 'complete', 'complete']);
  assert.deepEqual(states(-1), ['current', 'upcoming', 'upcoming']);
  assert.deepEqual(states(Number.NaN), ['current', 'upcoming', 'upcoming']);
  assert.deepEqual(states(1.6), ['complete', 'current', 'upcoming']);
});
