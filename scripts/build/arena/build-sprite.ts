/* Writes assets/Icons.generated.svg: the sprite every playground, kitchen sink and intro page in this
 * repository hands to ArenaIcon. It holds the glyphs the components draw, the seeds and specimens
 * that name more, and the intro pages, through the same scan and spriteSvg the arena command uses.
 * The weight swap is the one thing a scan cannot see: a component calling arenaActiveWeight draws
 * any name it is given in fill, so its own glyphs and every name in a source that mentions it
 * (a demo seed, a specimen) get a fill symbol. The output is TRACKED, like assets/fonts/, because
 * the git tag serves intro/ and nothing builds there. */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { kebab } from '../../utils/case.ts';
import { SPRITE_FILE } from '../../lib/arena/playground-page.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { withoutComments } from '../../lib/arena/icon-manifest.ts';
import { phosphorRoot } from '../../generate/core/arena-cli/host.ts';
import { drawnGlyphs, glyphNames, scan } from '../../generate/core/arena-cli/icon-css.ts';
import { glyphFile, spriteSvg } from '../../generate/core/arena-cli/sprite.ts';
import type { IconScan } from '../../generate/core/arena-cli/icon-css.ts';

export { SPRITE_FILE };

export const LAYERS = ['react', 'angular'];

export const PAGE_MODULES = 'scripts/lib/arena/hero-page.ts';

export const node = {
  name: 'build:sprite',
  reads: [
    ...LAYERS.flatMap((layer) => [`frameworks/${layer}/components/**/*.ts`, `frameworks/${layer}/components/**/*.tsx`]),
    '!frameworks/**/*.generated.*', '!frameworks/**/*.test.*',
    'frameworks/demos/*.demo.json', 'frameworks/tailwind/**/*.card.html', 'intro/**/*.html', PAGE_MODULES,
  ],
  writes: [SPRITE_FILE],
  feeds: ['check:generated', 'check:icons', 'check:pixel-parity', 'check:target-size', 'build:site', 'check:site'],
};

const BARE = (glyph: string) => glyph.replace(/^ph-/, '');

const isComponentSource = (path: string) => /\.tsx?$/.test(path) && !/\.(generated|test)\.|\.generated\./.test(path);

function read(path: string) {
  return readFileSync(path, 'utf8');
}

function walk(dir: string, accept: (path: string) => boolean) {
  return existsSync(dir) ? walkFiles(dir).filter(accept) : [];
}

export function repoSprite(root = repoRoot, core = phosphorRoot() ?? '') {
  if (!core) throw new Error('build-sprite: @phosphor-icons/core is not installed, so no glyph can be read');
  const found: IconScan = { pairs: new Map(), loose: new Set() };
  const swapping = new Set<string>();
  const fillGlyphs = new Set<string>();

  for (const layer of LAYERS) {
    for (const path of walk(join(root, 'frameworks', layer, 'components'), isComponentSource)) {
      const source = withoutComments(read(path), basename(path));
      scan(source, found);
      if (/\barenaActiveWeight\b/.test(source)) {
        swapping.add(basename(path).replace(/\.tsx?$/, ''));
        for (const glyph of glyphNames(scan(source))) fillGlyphs.add(glyph);
      }
    }
  }

  const names = [...swapping].flatMap((name) => [name, kebab(name)]);
  const others = [
    ...walk(join(root, 'frameworks', 'demos'), (path) => path.endsWith('.demo.json')),
    ...walk(join(root, 'frameworks', 'tailwind'), (path) => path.endsWith('.card.html')),
    ...walk(join(root, 'intro'), (path) => path.endsWith('.html')),
    ...(existsSync(join(root, PAGE_MODULES)) ? [join(root, PAGE_MODULES)] : []),
  ];
  for (const path of others) {
    const source = read(path);
    scan(source, found);
    if (names.some((name) => source.includes(name))) for (const glyph of glyphNames(scan(source))) fillGlyphs.add(glyph);
  }

  const wanted = drawnGlyphs(found, fillGlyphs);
  return spriteSvg(
    wanted.map(({ weight, glyphs }) => ({ weight, glyphs: new Set([...glyphs].map(BARE)) })),
    (weight, name) => {
      const file = glyphFile(core, weight, name);
      return existsSync(file) ? read(file) : null;
    },
  );
}

function main() {
  const { svg, missing, kept } = repoSprite();
  if (missing.size > 0) {
    const lines = [...missing].map(([weight, glyphs]) => `  ${weight}: ${glyphs.join(', ')}`);
    throw new Error(`build-sprite: @phosphor-icons/core holds no file for\n${lines.join('\n')}\n`
      + 'a source names a glyph that does not exist, and ArenaIcon would paint nothing for it');
  }
  writeFileSync(join(repoRoot, SPRITE_FILE), svg);
  console.log(`wrote ${SPRITE_FILE}: ${kept} symbols, ${Buffer.byteLength(svg)} bytes`);
}

if (isMainModule(import.meta.url)) main();
