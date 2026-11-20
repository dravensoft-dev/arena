import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { colouredParts } from './color-slot-map.ts';

const manifest = {
  component: 'ArenaFixture',
  slots: { root: 'flex bg-surface', inner: 'p-2 focus-visible:outline-2 focus-visible:outline-surface', glyph: 'text-current', label: 'text-sm', raw: 'border-[color:var(--x)]', plain: 'p-1' },
  variants: { tone: { loud: { label: 'hover:text-ink', plain: 'bg-transparent' } } },
  compoundVariants: [{ tone: 'loud', class: { glyph: 'stroke-cat-1', plain: 'ring-cat-2' } }],
};

test('the criterion reads variants and compoundVariants, and tells focus-only and keywords-only parts', () => {
  const root = mkdtempSync(join(tmpdir(), 'cs-map-'));
  try {
    mkdirSync(join(root, 'frameworks/tailwind/components/x'), { recursive: true });
    mkdirSync(join(root, 'contracts/design'), { recursive: true });
    writeFileSync(join(root, 'frameworks/tailwind/Theme.css'), '@theme { --color-surface: red; --color-ink: blue; }');
    writeFileSync(join(root, 'contracts/design/palette.dark.json'), JSON.stringify({ color: { $type: 'color', 'cat-1': {}, 'cat-2': {} } }));
    writeFileSync(join(root, 'frameworks/tailwind/components/x/ArenaFixture.manifest.json'), JSON.stringify(manifest));
    const parts = colouredParts(root);
    assert.deepEqual([...parts.keys()].sort(), ['ArenaFixture.glyph', 'ArenaFixture.inner', 'ArenaFixture.label', 'ArenaFixture.plain', 'ArenaFixture.raw', 'ArenaFixture.root']);
    assert.deepEqual(parts.get('ArenaFixture.inner'), { focusOnly: true, keywordsOnly: false, properties: [] });
    assert.deepEqual(parts.get('ArenaFixture.glyph'), { focusOnly: false, keywordsOnly: false, properties: ['edge'] });
    assert.equal(parts.get('ArenaFixture.label')!.properties.join(), 'ink');
    assert.equal(parts.get('ArenaFixture.plain')!.keywordsOnly, false);
    assert.equal(parts.get('ArenaFixture.root')!.properties.join(), 'fill');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a fill utility is ink on a part named like text and fill on any other, by the part name', () => {
  const root = mkdtempSync(join(tmpdir(), 'cs-map-'));
  try {
    mkdirSync(join(root, 'frameworks/tailwind/components/x'), { recursive: true });
    mkdirSync(join(root, 'contracts/design'), { recursive: true });
    writeFileSync(join(root, 'frameworks/tailwind/Theme.css'), '@theme { --color-surface: red; }');
    writeFileSync(join(root, 'contracts/design/palette.dark.json'), JSON.stringify({ color: { $type: 'color' } }));
    writeFileSync(join(root, 'frameworks/tailwind/components/x/ArenaFixture.manifest.json'), JSON.stringify({ component: 'ArenaFixture', slots: { label: 'fill-surface', bar: 'fill-surface' } }));
    const parts = colouredParts(root);
    assert.equal(parts.get('ArenaFixture.label')!.properties.join(), 'ink');
    assert.equal(parts.get('ArenaFixture.bar')!.properties.join(), 'fill');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
