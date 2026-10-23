/* Covers build-sprite.ts on fixture trees under <repo>/.cache/plan-1.29/. The repo draws icons
 * through a sprite it writes itself, so a glyph named by a component, a demo seed, a specimen or an
 * intro page that is missing from it paints nothing, and says so nowhere. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { readFileSync } from 'node:fs';
import { repoSprite, SPRITE_FILE } from './build-sprite.ts';
import { withoutComments } from '../../lib/arena/icon-manifest.ts';
import { scan } from '../../generate/core/arena-cli/icon-css.ts';
import { symbolId } from '../../generate/core/arena-cli/sprite.ts';

const BASE = join(repoRoot, '.cache', 'plan-1.29', 'build-sprite');

function put(root: string, rel: string, text: string) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
}

function fixture(name: string) {
  const root = join(BASE, name);
  rmSync(root, { recursive: true, force: true });
  const core = join(root, 'core');
  const glyphs: [string, string][] = [
    ['bold', 'stack'], ['fill', 'stack'], ['bold', 'squares-four'], ['fill', 'squares-four'],
    ['bold', 'x'], ['bold', 'bell'], ['duotone', 'robot'], ['fill', 'bell'], ['bold', 'nope'],
  ];
  for (const [weight, glyph] of glyphs) {
    put(core, `assets/${weight}/${glyph}-${weight}.svg`, `<svg viewBox="0 0 256 256"><path d="M0 0 ${weight} ${glyph}"/></svg>`);
  }
  put(root, 'frameworks/react/components/navigation/arena-side-nav-item/ArenaSideNavItem.tsx',
    "import { arenaActiveWeight } from '../../../ArenaIcons.ts';\nexport const icon = arenaActiveWeight('ph-bold ph-stack');");
  put(root, 'frameworks/react/components/data/arena-tag/ArenaTag.tsx',
    "/** draws 'ph-bold ph-nope' */\nexport const close = 'ph-bold ph-x';");
  put(root, 'frameworks/react/components/data/arena-tag/ArenaTag.test.tsx', "const a = 'ph-bold ph-absent';");
  put(root, 'frameworks/demos/ArenaSideNav.demo.json',
    '{"children":[{"component":"ArenaSideNavItem","props":{"icon":"ph-bold ph-squares-four"}}]}');
  put(root, 'frameworks/demos/ArenaButton.demo.json', '{"props":{"icon":"ph-bold ph-bell"}}');
  put(root, 'frameworks/tailwind/components/data/arena-tag/ArenaTag.card.html', '<i class="ph-bold ph-bell"></i>');
  put(root, 'intro/guidelines/icons.html', '<i class="ph-duotone ph-robot"></i>');
  return { root, core };
}

test('the repo sprite holds every glyph the components, seeds, specimens and intro name', () => {
  const { root, core } = fixture('holds');
  const { svg, missing } = repoSprite(root, core);
  assert.equal(SPRITE_FILE, 'assets/Icons.generated.svg');
  for (const id of ['ph-bold-stack', 'ph-bold-squares-four', 'ph-bold-x', 'ph-bold-bell', 'ph-duotone-robot']) {
    assert.ok(svg.includes(`id="${id}"`), `${id} is named by a source and missing from the sprite`);
  }
  assert.equal(missing.size, 0);
});

test('a fill-swapping component\'s glyphs and the seeds it is given carry a fill symbol, and nothing else does', () => {
  const { root, core } = fixture('fills');
  const { svg } = repoSprite(root, core);
  assert.ok(svg.includes('id="ph-fill-stack"'), 'the component\'s own glyph swaps to fill');
  assert.ok(svg.includes('id="ph-fill-squares-four"'), 'a seed given to the component swaps to fill');
  assert.ok(!svg.includes('id="ph-fill-bell"'), 'a glyph no swapping component receives stays out of the fill weight');
});

test('a glyph named in a comment or a test is not drawn, so it is not carried', () => {
  const { root, core } = fixture('prose');
  const { svg } = repoSprite(root, core);
  assert.ok(!svg.includes('ph-bold-nope'));
  assert.ok(!svg.includes('ph-bold-absent'));
});

test('a glyph the install does not hold is reported, not dropped', () => {
  const { root, core } = fixture('missing');
  put(root, 'intro/guidelines/extra.html', '<i class="ph-bold ph-zzz"></i>');
  const { missing } = repoSprite(root, core);
  assert.deepEqual(missing.get('bold'), ['zzz']);
});

test('the same tree writes the same bytes', () => {
  const { root, core } = fixture('stable');
  assert.equal(repoSprite(root, core).svg, repoSprite(root, core).svg);
});

test('every glyph the page modules write has a symbol in the repo sprite', () => {
  const sprite = readFileSync(join(repoRoot, SPRITE_FILE), 'utf8');
  for (const module of ['playground-page', 'kitchen-sink-page', 'hero-page']) {
    const source = withoutComments(readFileSync(join(repoRoot, 'scripts', 'lib', 'arena', `${module}.ts`), 'utf8'), `${module}.ts`);
    const found = scan(source);
    for (const [weight, glyphs] of found.pairs) {
      for (const glyph of glyphs) {
        const id = symbolId(weight, glyph.replace(/^ph-/, ''));
        assert.ok(sprite.includes(`id="${id}"`), `${module}.ts writes ${glyph} in ${weight} and the repo sprite has no ${id}`);
      }
    }
  }
});

test('a sprite symbol reference in an intro page keeps its glyph and reports nothing missing', () => {
  const { root, core } = fixture('reference');
  put(root, 'intro/guidelines/ref.html', '<svg><use href="../assets/Icons.generated.svg#ph-bold-squares-four"></use></svg>');
  const { svg, missing } = repoSprite(root, core);
  assert.equal(missing.size, 0);
  assert.ok(svg.includes('id="ph-bold-squares-four"'));
});
