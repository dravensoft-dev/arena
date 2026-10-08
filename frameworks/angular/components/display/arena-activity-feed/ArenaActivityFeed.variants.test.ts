import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaResolveActivityFeedRows } from './ArenaActivityFeed';
import type { ArenaActivityItem } from '../../../Api.generated';
import { arenaActivityFeedStyles } from './ArenaActivityFeed.variants';

test('the five tones resolve to five distinct dot classes', () => {
  const tones = ['neutral', 'success', 'warning', 'danger', 'info'] as const;
  const classes = tones.map((tone) => JSON.stringify(arenaActivityFeedStyles({ tone }).$data.dot()));
  assert.equal(new Set(classes).size, tones.length, `expected ${tones.length} distinct dot classes, got ${JSON.stringify(classes)}`);
});

test('arenaResolveActivityFeedRows carries each item through unchanged, for the template to read', () => {
  const items: ArenaActivityItem[] = [{ id: 'evt-1', actor: 'Marta', action: 'deployed', target: 'billing@2.4.1', time: '2m', tone: 'success' }];
  const rows = arenaResolveActivityFeedRows(items);
  assert.equal(rows[0].item, items[0]);
});

test('an untoned or unknown tone paints the feed accent: the dot carries no tone attribute', () => {
  const plain = arenaActivityFeedStyles({ tone: undefined }).$data.dot();
  assert.equal(plain['data-arena-tone'], undefined);
  const rows = arenaResolveActivityFeedRows([{ id: 'a', actor: 'Marta', action: 'deployed', target: 'x', time: '1m', tone: 'gold' as never }]);
  assert.equal(arenaActivityFeedStyles({ tone: undefined }).$data.dot()['data-arena-tone'], undefined);
  assert.equal(rows.length, 1);
});
