import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TAILWIND_COMPONENTS } from '../../../test/Compliance';
import { arenaTagStyles } from './ArenaTag.variants';


test('a tag keeps its word whole in a row, and still breaks it when the container is narrower than the label', () => {
  const source = JSON.parse(readFileSync(join(TAILWIND_COMPONENTS, 'display/arena-tag/ArenaTag.manifest.json'), 'utf8')) as { slots: Record<string, string> };
  const root = source.slots['root']!.split(/\s+/);
  assert.ok(root.includes('shrink-0'), source.slots['root']);
  assert.ok(root.includes('wrap-anywhere'), source.slots['root']);
});
