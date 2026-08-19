import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { POLARITIES, FONT_ROLES, requiredKeys } from '../../generate/core/arena-to-prod/palette-keys.ts';
import { ROLES } from './check-style-plugin.ts';
import {
  CARRIES, CATALOGUE, CARD, CONFIG, SHEET, TOKENS, catalogueProblems, configProblems, entries,
  missingFileProblems, shapeProblems, sheetProblems, tokenProblems, zeroScanProblems,
} from './check-catalogue.ts';

const ARENA_EXT = 'com.dravensoft.arena';

type Role = { $type?: string; $extensions?: Record<string, { values?: string[] }> };

const roles = readJson(join(repoRoot, ROLES)) as Record<string, Role>;

function anyAnswer(shape: Role) {
  if (shape.$type === 'color') return '{color.base-100}';
  if (shape.$type === 'keyword') return shape.$extensions?.[ARENA_EXT]?.values?.[0];
  return 1;
}

function bench(build: (dir: string) => void) {
  const base = mkdtempSync(join(tmpdir(), 'arena-catalogue-'));
  mkdirSync(join(base, CATALOGUE, 'a-register'), { recursive: true });
  build(join(base, CATALOGUE, 'a-register'));
  return { base, clean: () => rmSync(base, { recursive: true, force: true }) };
}

function wholeEntry(dir: string, name = 'a-register') {
  const answers = Object.fromEntries(Object.entries(roles).map(([role, shape]) => [
    role, { $type: shape.$type, $value: anyAnswer(shape) },
  ]));
  writeFileSync(join(dir, TOKENS), JSON.stringify(answers));
  writeFileSync(join(dir, SHEET), '[data-arena-part="button"] { color: var(--ink-body); }');
  writeFileSync(join(dir, CONFIG), JSON.stringify({
    stylePlugins: [`./design/${name}`],
    palettes: POLARITIES.map((polarity) => ({
      name: polarity,
      polarity,
      colors: Object.fromEntries(requiredKeys().map((key) => [key, '#ffffff'])),
    })),
    fonts: Object.fromEntries(Object.keys(FONT_ROLES).map((slot) => [slot, { family: 'Inter' }])),
  }));
  writeFileSync(join(dir, CARD), '# An entry\n');
}

test('the repository catalogue is inside every claim this gate makes', () => {
  const { problems, found } = catalogueProblems();
  assert.deepEqual(problems, []);
  assert.ok(found.length > 0, 'the catalogue the skill routes a cold start to is empty');
});

test('every shipped entry is named for a register rather than for the product it was measured on', () => {
  for (const name of entries())
    assert.doesNotMatch(name, /clickup|duolingo|instagram|notion/i,
      `${name} is named for a product. The name becomes a class in a consumer's build, and a `
      + 'register generalises to a second measurement where a product name contradicts it.');
});

test('an entry missing any of the four files it carries is reported per file', () => {
  const { base, clean } = bench(() => {});
  try {
    const problems = missingFileProblems('a-register', base);
    assert.equal(problems.length, CARRIES.length);
    for (const file of CARRIES) assert.ok(problems.some((one) => one.includes(file)));
  } finally { clean(); }
});

test('a whole entry built from the roles themselves is clean, which is what makes the failures below mean something', () => {
  const { base, clean } = bench((dir) => wholeEntry(dir));
  try {
    assert.deepEqual(catalogueProblems(base).problems, []);
  } finally { clean(); }
});

test('a role the kernel declares and the entry does not answer is a missing border, not a plainer look', () => {
  const { base, clean } = bench((dir) => {
    wholeEntry(dir);
    const answers = readJson(join(dir, TOKENS)) as Record<string, unknown>;
    delete answers['r-control'];
    writeFileSync(join(dir, TOKENS), JSON.stringify(answers));
  });
  try {
    const problems = tokenProblems('a-register', roles, base);
    assert.equal(problems.length, 1);
    assert.match(problems[0] ?? '', /r-control/);
  } finally { clean(); }
});

test('a name that is no role at all, and a type disagreeing with roles.json, are each reported', () => {
  assert.match(shapeProblems('at', 'sp-5', { $type: 'dimension' }, undefined)[0] ?? '',
    /not a role/);
  assert.match(shapeProblems('at', 'r-control', { $type: 'number' }, { $type: 'dimension' })[0] ?? '',
    /cannot disagree/);
  assert.deepEqual(shapeProblems('at', 'r-control', { $type: 'dimension' }, { $type: 'dimension' }), []);
});

test('a colour role answered with a literal is refused, because the palette is the consumer\'s', () => {
  const { base, clean } = bench((dir) => {
    wholeEntry(dir);
    const answers = readJson(join(dir, TOKENS)) as Record<string, { $value: unknown }>;
    (answers['fill-surface'] as { $value: unknown }).$value = '#ffffff';
    writeFileSync(join(dir, TOKENS), JSON.stringify(answers));
  });
  try {
    assert.match(tokenProblems('a-register', roles, base)[0] ?? '', /\{color\.\*\} alias/);
  } finally { clean(); }
});

test('a stylesheet reaching past the part hooks, or spelling its own layer, is reported', () => {
  const { base, clean } = bench((dir) => {
    wholeEntry(dir);
    writeFileSync(join(dir, SHEET),
      '@layer arena-plugin { .arena-button__label { color: red; } }');
  });
  try {
    const problems = sheetProblems('a-register', base);
    assert.ok(problems.some((one) => one.includes('@layer')));
    assert.ok(problems.some((one) => one.includes('not a data-arena-part hook')));
  } finally { clean(); }
});

test('a comment naming a class does not count as a selector', () => {
  const { base, clean } = bench((dir) => {
    wholeEntry(dir);
    writeFileSync(join(dir, SHEET),
      '/* .arena-button__label is compiler output */\n[data-arena-part="button"] { color: red; }');
  });
  try {
    assert.deepEqual(sheetProblems('a-register', base), []);
  } finally { clean(); }
});

test('a config is held to both polarities, the whole colour set, the three font slots and its own path', () => {
  const { base, clean } = bench((dir) => {
    wholeEntry(dir);
    writeFileSync(join(dir, CONFIG), JSON.stringify({
      stylePlugins: ['./design/somewhere-else'],
      palettes: [{ name: 'light', polarity: 'light', colors: { 'base-100': '#fff' } }],
      fonts: { display: { family: 'Inter' } },
    }));
  });
  try {
    const problems = configProblems('a-register', base);
    assert.ok(problems.some((one) => one.includes('somewhere-else')));
    assert.ok(problems.some((one) => one.includes('no dark palette')));
    assert.ok(problems.some((one) => one.includes('answers no base-content')));
    assert.ok(problems.some((one) => one.includes('no body font')));
    assert.ok(problems.some((one) => one.includes('no mono font')));
  } finally { clean(); }
});

test('an empty catalogue is a failure rather than a clean pass', () => {
  assert.equal(zeroScanProblems([]).length, 1);
  assert.deepEqual(zeroScanProblems(['a-register']), []);
});
