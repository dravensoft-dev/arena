/* The two identity pages are copied by adopters, so a custom property they read must be one they
 * declare or the stylesheet they link defines. The hosted sheet is mapped to the tree's
 * `intro/styles.css` by its suffix, and its local `@import` closure is read. A `var(--x, fallback)`
 * counts as a read, since the fallback hides the miss. A page whose link cannot be mapped, or an
 * import that is missing, fails loudly. Both pages carry every section of IDENTITY_SECTIONS in
 * order, the template asks in each but the preview, and the example declares the language course
 * palettes under one class per polarity. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { IDENTITY_PAGES } from '../../lib/arena/agent-payload.ts';
import { IDENTITY_SECTIONS, SECTION_ATTRIBUTE, UNFILLED_ATTRIBUTE, identityProblems } from '../../generate/core/arena-cli/identity.ts';

const SHEET_SUFFIX = '/intro/styles.css';

export function sheetDefinitions(entry: string, seen = new Set<string>()): Set<string> {
  const defined = new Set<string>();
  if (seen.has(entry)) return defined;
  seen.add(entry);
  if (!existsSync(entry)) throw new Error(`identity-pages: the import ${entry} does not exist`);
  const css = readFileSync(entry, 'utf8');
  for (const m of css.matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1] ?? '');
  for (const m of css.matchAll(/@import\s+(?:url\(\s*["']?([^"')\s]+)["']?\s*\)|["']([^"']+)["'])/g)) {
    const target = m[1] ?? m[2] ?? '';
    if (/^[a-z]+:\/\//i.test(target)) continue;
    for (const name of sheetDefinitions(join(dirname(entry), target), seen)) defined.add(name);
  }
  return defined;
}

export function undefinedProperties(html: string, defined: Set<string>): string[] {
  const own = new Set([...html.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1] ?? ''));
  const read = [...html.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1] ?? '');
  return [...new Set(read)].filter((name) => !own.has(name) && !defined.has(name)).sort();
}

function linkedSheet(page: string, html: string): string {
  const hrefs = [...html.matchAll(/<link\b[^>]*>/g)].flatMap((tag) => {
    if (!/\brel="stylesheet"/.test(tag[0])) return [];
    const href = /\bhref="([^"]+)"/.exec(tag[0])?.[1];
    return href ? [href] : [];
  });
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

test('an import of a sheet that does not exist throws, naming it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-identity-'));
  try {
    const entry = join(dir, 'entry.css');
    writeFileSync(entry, "@import './missing.css';\n:root { --a: 1; }\n");
    assert.throws(() => sheetDefinitions(entry), /identity-pages: the import .*missing\.css does not exist/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an unquoted url() import is read, and a link with href before rel is found', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-identity-'));
  try {
    writeFileSync(join(dir, 'part.css'), ':root { --from-part: 1; }\n');
    const entry = join(dir, 'entry.css');
    writeFileSync(entry, '@import url(part.css);\n');
    assert.ok(sheetDefinitions(entry).has('--from-part'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const html = '<link href="https://example.org/intro/styles.css" rel="stylesheet">';
  assert.equal(linkedSheet('fixture.html', html), join(repoRoot, 'intro', 'styles.css'));
});

const [TEMPLATE, EXAMPLE] = IDENTITY_PAGES as [string, string];
const pageHtml = (page: string) => readFileSync(join(repoRoot, page), 'utf8');
const ENTRY = join(repoRoot, 'plugin-style-store', 'catalogue', 'language-course', 'arena.config.json');

type Section = { id: string; title: string; body: string };

export function sectionsOf(html: string): Section[] {
  const opens = [...html.matchAll(new RegExp(`<section\\b[^>]*\\b${SECTION_ATTRIBUTE}="([^"]+)"[^>]*>`, 'g'))];
  return opens.map((open, i) => {
    const body = html.slice((open.index ?? 0) + open[0].length, opens[i + 1]?.index ?? html.length);
    return { id: open[1] ?? '', title: /<h2>([^<]*)<\/h2>/.exec(body)?.[1] ?? '', body };
  });
}

export function declaredColours(html: string, polarity: string): Record<string, string> {
  const block = new RegExp(`^\\s*\\.arena-${polarity}\\s*\\{([^}]*)\\}`, 'm').exec(html)?.[1] ?? '';
  return Object.fromEntries([...block.matchAll(/--color-([\w-]+):\s*([^;]+);/g)].map((m) => [m[1] ?? '', (m[2] ?? '').trim()]));
}

const DERIVED = { 'primary-fill': 'var(--color-primary)' };

const STATIC_ROWS: { name: string; problems: (page: string, html: string) => string[] }[] = [
  { name: 'every section in order, each with its title',
    problems: (page, html) => {
      const got = sectionsOf(html);
      const ids = got.map((s) => s.id);
      const want = IDENTITY_SECTIONS.map((s) => s.id);
      const wrong = ids.join() === want.join() ? [] : [`${page}: sections are ${ids.join(', ')}, expected ${want.join(', ')}`];
      return [...wrong, ...IDENTITY_SECTIONS.flatMap(({ id, title }) => {
        const one = got.find((s) => s.id === id);
        return one && one.title !== title ? [`${page}: section ${id} titles itself "${one.title}", expected "${title}"`] : [];
      })];
    } },
  { name: 'sets lang and names it in the language section',
    problems: (page, html) => {
      const lang = /<html\b[^>]*\blang="([^"]+)"/.exec(html)?.[1];
      if (!lang) return [`${page}: <html> carries no lang`];
      const body = sectionsOf(html).find((s) => s.id === 'language')?.body ?? '';
      return body.includes(`lang="${lang}"`) ? [] : [`${page}: the language section never names lang="${lang}"`];
    } },
];

test('each identity page holds its rows', () => {
  const wrong = IDENTITY_PAGES.flatMap((page) => STATIC_ROWS.flatMap((row) => row.problems(page, pageHtml(page)).map((p) => `${row.name}: ${p}`)));
  assert.deepEqual(wrong, []);
});

test('the template asks in every section but the preview', () => {
  const unfilled = new RegExp(`\\b${UNFILLED_ATTRIBUTE}\\b`);
  const quiet = sectionsOf(pageHtml(TEMPLATE)).filter((s) => s.id !== 'preview' && !unfilled.test(s.body)).map((s) => s.id);
  assert.deepEqual(quiet, []);
});

test('the example leaves nothing unfilled', () => {
  assert.deepEqual(identityProblems(pageHtml(EXAMPLE)), []);
});

test('the example declares the language course palettes exactly', () => {
  const entry = JSON.parse(readFileSync(ENTRY, 'utf8')) as { palettes: { polarity: string; colors: Record<string, string> }[] };
  const html = pageHtml(EXAMPLE);
  const wrong = entry.palettes.flatMap((palette) => {
    const declared = declaredColours(html, palette.polarity);
    const keys = new Set([...Object.keys(declared), ...Object.keys(palette.colors)]);
    return [...keys].flatMap((key) => {
      const want = palette.colors[key] ?? (DERIVED as Record<string, string>)[key];
      return declared[key] === want ? [] : [`${palette.polarity} ${key} is ${declared[key]}, expected ${want}`];
    });
  });
  assert.deepEqual(wrong, []);
});
