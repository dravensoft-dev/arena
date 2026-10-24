/* A <button> with no `type` is a submit button, so one drawn inside a consumer's <form> submits it
 * when it is only meant to act on the component around it. Every button a React component draws
 * writes its type, and this scan reads the sources so a new one cannot ship without. Comments are
 * prose and are blanked first, keeping their newlines so a reported line is the file's own. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export function untypedButtons(source: string): number[] {
  const blank = source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
  const lines: number[] = [];
  const open = /<button(?=[\s>])/g;
  for (let m = open.exec(blank); m; m = open.exec(blank)) {
    let depth = 0;
    let end = blank.length;
    for (let i = m.index + m[0].length; i < blank.length; i++) {
      const c = blank[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) { end = i; break; }
    }
    const tag = blank.slice(m.index, end + 1);
    if (!/\stype=/.test(tag)) lines.push(blank.slice(0, m.index).split('\n').length);
  }
  return lines;
}

test('a button tag with no type is found, on one line or across several', () => {
  assert.deepEqual(untypedButtons('<button onClick={f}>x</button>'), [1]);
  assert.deepEqual(untypedButtons('<button\n  onClick={f}\n  type="button">x</button>'), []);
  assert.deepEqual(untypedButtons('a\n<button\n onClick={f}>'), [2]);
});

test('a button named in a comment is prose, not a tag', () => {
  assert.deepEqual(untypedButtons('/** absent => a <button>. */\n// <button>\nconst a = 1;'), []);
});

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sources(path));
    else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx') && !entry.name.endsWith('.generated.tsx')) out.push(path);
  }
  return out;
}

test('no React component draws a button without a type', () => {
  const root = join(import.meta.dir, '..', 'components');
  const hits: string[] = [];
  for (const file of sources(root)) {
    for (const line of untypedButtons(readFileSync(file, 'utf8'))) hits.push(`${relative(root, file).split(sep).join('/')}:${line}`);
  }
  assert.deepEqual(hits, [], 'a button with no type inside a form submits it; write type="button" on each');
});
