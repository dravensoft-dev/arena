/* The Angular demo pages are the only place a person can exercise what happy-dom cannot:
 * motion, focus rings, layout. This gate is structural and portable, no browser and no
 * bundler, and it holds what only this layer can get wrong: the three lines without which a
 * page mounts nothing and says nothing. There is no coverage list any more, because every
 * component has a page: the inventory is the component tree, so a page cannot go missing
 * and a list cannot go stale. Whether a page RENDERS is held by nothing; see DOUBTS.md. */

import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readIfExists } from '../../utils/read-file.ts';
import { pascal } from '../../utils/case.ts';
import { readLayer } from '../../lib/arena/layers.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { captured } from '../../utils/captures.ts';

export const BUNDLE_DIR = 'build/demo/js';


export const PAGE_SUFFIX = '.demo.generated.html';
export const ENTRY_SUFFIX = '.demo.entry.generated.ts';

export const node = {
  name: 'check:angular-demos',
  reads: [
    `frameworks/angular/components/**/*${PAGE_SUFFIX}`,
    `frameworks/angular/components/**/*${ENTRY_SUFFIX}`,
    `frameworks/angular/${BUNDLE_DIR}/**/*.js`,
  ],
  writes: [],
  feeds: [],
};

export function pageProblems(tree: Record<string, string[]>, read: (path: string) => string | null) {
  const problems = [];
  const found = new Set();

  for (const [category, dirs] of Object.entries(tree)) {
    for (const dir of dirs) {
      const name = pascal(dir);
      const base = `frameworks/angular/components/${category}/${dir}`;
      const page = `${base}/${name}${PAGE_SUFFIX}`;
      const entry = `${base}/${name}${ENTRY_SUFFIX}`;
      const pageSource = read(page);
      const entrySource = read(entry);

      found.add(name);

      if (pageSource === null) {
        problems.push(`${page}: missing — run bun run generate:playgrounds`);
      }
      if (entrySource === null) {
        problems.push(`${entry}: missing, so its page has no application to bootstrap`);
      }
      if (pageSource === null || entrySource === null) continue;

      const src = /<script[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/.exec(pageSource);
      if (!src) {
        problems.push(`${page}: loads no module script, so it renders an empty document`);
      } else if (!captured(src).endsWith(`/${BUNDLE_DIR}/${name}${ENTRY_SUFFIX.replace(/\.ts$/, '.js')}`)) {
        problems.push(
          `${page}: loads "${src[1]}", which is not this component's bundled entry `
          + `(…/${BUNDLE_DIR}/${name}${ENTRY_SUFFIX.replace(/\.ts$/, '.js')})`,
        );
      }

      if (/@dsCard/.test(pageSource)) {
        problems.push(
          `${page}: declares @dsCard. An Angular page's script is git-ignored build output, so on `
          + 'a fresh clone it renders blank, and a box declared around nothing measures nothing.',
        );
      }

      if (!/bootstrapApplication\s*\(/.test(entrySource)) {
        problems.push(`${entry}: calls no bootstrapApplication, so the page mounts nothing`);
      }
      if (!/provideZonelessChangeDetection\s*\(/.test(entrySource)) {
        problems.push(
          `${entry}: does not provide zoneless change detection, and the layer ships no zone.js — `
          + 'without it nothing in the page ever re-renders',
        );
      }
      if (!/^import '@angular\/compiler';$/m.test(entrySource)) {
        problems.push(
          `${entry}: does not import '@angular/compiler'. ngc compiles Arena's own components AOT, `
          + 'but @angular/* ships partially compiled and its injectables need the JIT fallback in a '
          + 'browser bundle — without it the page throws before it mounts anything, the same reason '
          + 'the Angular test harness imports it.',
        );
      }
    }
  }

  if (found.size === 0) {
    problems.push(
      'found 0 Angular demo pages. An empty result set is a failure, not a clean pass: '
      + 'a gate iterating nothing reports nothing wrong with everything.',
    );
  }
  return { problems, pages: found.size };
}

function main() {
  const read = (rel: string) => readIfExists(join(repoRoot, rel));
  const { problems, pages } = pageProblems(readLayer('angular'), read);
  if (problems.length) {
    console.error(`check-angular-demos: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-angular-demos: ${pages} page(s) mount a zoneless app from ${BUNDLE_DIR}`);
}

if (isMainModule(import.meta.url)) main();
