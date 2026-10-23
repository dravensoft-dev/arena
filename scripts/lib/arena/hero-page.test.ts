import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { heroSkins, HERO_ENTRIES } from './hero-page.ts';
import { repoRoot } from './repo-root.ts';

test("the hero wears each entry's default palette, read from its own config", () => {
  const skins = heroSkins();
  assert.deepEqual(skins.map((one) => one.name), HERO_ENTRIES);
  for (const { name, primary, content } of skins) {
    const file = join(repoRoot, 'plugin-style-store', 'catalogue', name, 'arena.config.json');
    const config = JSON.parse(readFileSync(file, 'utf8')) as {
      palettes: { default?: boolean; colors: Record<string, string> }[];
    };
    const own = config.palettes.find((palette) => palette.default === true);
    assert.ok(own, `${name} declares a default palette`);
    assert.equal(primary, own.colors.primary);
    assert.equal(content, own.colors['primary-content']);
  }
  assert.equal(skins.find((one) => one.name === 'photo-feed')?.content, '#000000');
});

test('a missing entry config throws naming the file', () => {
  assert.throws(() => heroSkins(join(repoRoot, 'no-such-root')), /arena\.config\.json/);
});
