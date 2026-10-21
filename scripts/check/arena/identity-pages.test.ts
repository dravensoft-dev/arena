/* The two identity pages are copied by adopters, so a custom property they read must be one they
 * declare or the stylesheet they link defines. The hosted sheet is mapped to the tree's
 * `intro/styles.css` by its suffix, and its local `@import` closure is read. A `var(--x, fallback)`
 * counts as a read, since the fallback hides the miss. A page whose link cannot be mapped, or an
 * import that is missing, fails loudly. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { IDENTITY_PAGES } from '../../lib/arena/agent-payload.ts';

const SHEET_SUFFIX = '/intro/styles.css';

export function sheetDefinitions(entry: string, seen = new Set<string>()): Set<string> {
  const defined = new Set<string>();
  if (seen.has(entry)) return defined;
  seen.add(entry);
  if (!existsSync(entry)) throw new Error(`identity-pages: the import ${entry} does not exist`);
  const css = readFileSync(entry, 'utf8');
  for (const m of css.matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1]);
  for (const m of css.matchAll(/@import\s+(?:url\()?["']([^"')]+)["']/g)) {
    if (/^[a-z]+:\/\//i.test(m[1])) continue;
    for (const name of sheetDefinitions(join(dirname(entry), m[1]), seen)) defined.add(name);
  }
  return defined;
}

export function undefinedProperties(html: string, defined: Set<string>): string[] {
  const own = new Set([...html.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  const read = [...html.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
  return [...new Set(read)].filter((name) => !own.has(name) && !defined.has(name)).sort();
}

function linkedSheet(page: string, html: string): string {
  const hrefs = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  const href = hrefs.find((one) => one.endsWith(SHEET_SUFFIX));
  if (!href) throw new Error(`identity-pages: ${page} links no stylesheet ending ${SHEET_SUFFIX}`);
  return join(repoRoot, 'intro', 'styles.css');
}

test('each identity page reads only custom properties it declares or its sheet defines', () => {
  const report: string[] = [];
  for (const page of IDENTITY_PAGES) {
    const html = readFileSync(join(repoRoot, page), 'utf8');
    const missing = undefinedProperties(html, sheetDefinitions(linkedSheet(page, html)));
    if (missing.length > 0) report.push(`${page} reads undefined ${missing.join(', ')}`);
  }
  assert.deepEqual(report, []);
});

test('an undeclared var() is reported and a property the page declares is not', () => {
  const html = '<style>:root { --mine: 1; } a { color: var(--mine); b: var(--nope, red); c: var(--sheet); }</style>';
  assert.deepEqual(undefinedProperties(html, new Set(['--sheet'])), ['--nope']);
});

test('a page whose stylesheet link is not the hosted intro sheet fails loudly', () => {
  const html = '<link rel="stylesheet" href="https://example.org/other.css">';
  assert.throws(() => linkedSheet('fixture.html', html), /fixture\.html links no stylesheet ending \/intro\/styles\.css/);
});

test('a missing import throws, naming it', () => {
  assert.throws(() => sheetDefinitions(join(repoRoot, 'intro', 'no-such-sheet.css')), /no-such-sheet\.css/);
});
