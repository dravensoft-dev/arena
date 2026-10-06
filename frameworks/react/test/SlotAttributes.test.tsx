/* A slot whose manifest carries a group spreads that group's data-arena attributes wherever the
 * component draws the slot: every element that takes the slot's class is held to spread
 * $data.<slot>() on the same tag. unboundDraws is the scan, and a source missing the spread
 * fails it. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REACT_COMPONENTS } from './AssertPattern.tsx';

interface Classes { attributes?: Record<string, string[]> }

export function unboundDraws(source: string, slot: string): string[] {
  const draws = [...source.matchAll(/className=\{([^}]*)\}/g)].filter((m) => new RegExp(`(?<!\\$data)\\.${slot}\\(`).test(m[1] ?? ''));
  return draws.flatMap((draw) => {
    const start = source.lastIndexOf('<', draw.index);
    let depth = 0;
    let end = start;
    for (; end < source.length; end += 1) {
      const char = source[end];
      if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
      else if (char === '>' && depth === 0 && source[end - 1] !== '=') break;
    }
    const tag = source.slice(start, end);
    return new RegExp(`\\$data\\.${slot}\\(`).test(tag) ? [] : [tag.replace(/\s+/g, ' ').slice(0, 120)];
  });
}

function primitiveSources(): string[] {
  return readdirSync(REACT_COMPONENTS, { withFileTypes: true })
    .filter((category) => category.isDirectory())
    .flatMap((category) => readdirSync(join(REACT_COMPONENTS, category.name), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => readdirSync(join(REACT_COMPONENTS, category.name, entry.name))
        .filter((file) => /^Arena[A-Za-z]+\.tsx$/.test(file))
        .map((file) => join(REACT_COMPONENTS, category.name, entry.name, file))));
}

test('an element that draws a slot with a group and does not spread it is reported', () => {
  const spread = '<span className={styles.dot()} data-arena-part={p.dot} {...styles.$data.dot()} />';
  const missing = '<span aria-hidden="true" className={styles.dot()} data-arena-part={p.dot} />';
  assert.deepEqual(unboundDraws(spread, 'dot'), []);
  assert.equal(unboundDraws(missing, 'dot').length, 1);
  assert.equal(unboundDraws(`${spread}\n${missing}`, 'dot').length, 1, 'one spread element hides an unspread one');
});

test('every component spreads the attributes of each slot it draws that its manifest gives a group', async () => {
  const sources = primitiveSources();
  assert.ok(sources.length > 0, 'no primitive sources found -- the guard would silently check nothing');
  let checked = 0;
  for (const path of sources) {
    const source = readFileSync(path, 'utf8');
    const imported = source.match(/from '(\.[^']*\.classes\.generated)(?:\.ts)?'/);
    if (!imported) continue;
    const manifest = (await import(pathToFileURL(resolve(dirname(path), `${imported[1]}.ts`)).href)).default as Classes;
    for (const slot of new Set(Object.values(manifest.attributes ?? {}).flat())) {
      checked += 1;
      assert.deepEqual(unboundDraws(source, slot), [], `${path}: draws the "${slot}" slot, which carries groups, on an element that does not spread its $data`);
    }
  }
  assert.ok(checked > 0, 'no slot with a group was found -- the guard would silently check nothing');
});
