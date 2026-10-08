/* A slot whose manifest carries a group spreads that group's data-arena attributes wherever the
 * component draws the slot: every element that takes the slot's class is held to spread
 * $data.<slot>() on the same tag, and a source that draws a slot through a prop object reads
 * $data.<slot>() somewhere. unboundDraws is the scan, and a source missing the spread fails it. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REACT_COMPONENTS } from './AssertPattern.tsx';

interface Classes { attributes?: Record<string, string[]> }

function braced(source: string, open: number): string {
  let depth = 0;
  for (let at = open; at < source.length; at += 1) {
    if (source[at] === '{') depth += 1;
    else if (source[at] === '}' && (depth -= 1) === 0) return source.slice(open + 1, at);
  }
  return source.slice(open + 1);
}

export function unboundDraws(source: string, slot: string): string[] {
  const draw = new RegExp(`(?<!\\$data)\\.${slot}\\(`);
  const reads = new RegExp(`\\$data\\.${slot}\\(`);
  const draws = [...source.matchAll(/className=\{/g)]
    .map((m) => ({ index: m.index, body: braced(source, m.index + m[0].length - 1) }))
    .filter((m) => draw.test(m.body));
  const bound = draws.flatMap((one) => {
    const start = source.lastIndexOf('<', one.index);
    let depth = 0;
    let end = start;
    for (; end < source.length; end += 1) {
      const char = source[end];
      if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
      else if (char === '>' && depth === 0 && source[end - 1] !== '=') break;
    }
    const tag = source.slice(start, end);
    return reads.test(tag) ? [] : [tag.replace(/\s+/g, ' ').slice(0, 120)];
  });
  return bound.length === 0 && draw.test(source) && !reads.test(source) ? [`no $data.${slot}() read anywhere in the source`] : bound;
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

test('a draw whose className holds an inner brace is scanned, and a draw passed through a prop object must still read the group', () => {
  const object = '<li className={styles({ current: p === page }).page()} />';
  const template = '<i className={`${icon} ${styles.icon()}`} />';
  assert.ok(unboundDraws(object, 'page').length > 0);
  assert.ok(unboundDraws(template, 'icon').length > 0);
  assert.deepEqual(unboundDraws('<i className={`${icon} ${styles.icon()}`} {...styles.$data.icon()} />', 'icon'), []);
  assert.equal(unboundDraws('const props = { className: rows.row() };', 'row').length, 1);
  assert.deepEqual(unboundDraws('const props = { className: rows.row(), ...rows.$data.row() };', 'row'), []);
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
