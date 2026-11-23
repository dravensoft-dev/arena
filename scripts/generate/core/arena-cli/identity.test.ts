/* Covers identity.ts: a section named missing, a dashed block named with its section, the reader
 * that accepts either quote and any case, and the page read beside the config. */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IDENTITY_SECTIONS, identityProblems, identityStep } from './identity.ts';

const page = (skip: string[] = [], inside: Record<string, string> = {}) => IDENTITY_SECTIONS
  .filter(({ id }) => !skip.includes(id))
  .map(({ id }) => `<section data-identity-section="${id}">${inside[id] ?? '<p>decided</p>'}</section>`).join('\n');

const ROWS: Array<{ name: string; html: string; expect: Array<string | RegExp> }> = [
  { name: 'a page carrying every section and no unfilled block has no problem', html: page(), expect: [] },
  {
    name: 'an unfilled block is named with its section',
    html: page([], { palette: '<div data-arena-unfilled></div>' }),
    expect: [/^design\/identity\.html: the section "The palette" still holds 1 unfilled block\. Replace each dashed block with the decision it asks for\.$/],
  },
  {
    name: 'a missing section is named, with the answer that keeps it',
    html: page(['media']),
    expect: [/^design\/identity\.html: the section "The media" is missing\. Keep every section of the template, and answer one the product does not need with why it does not apply\.$/],
  },
  {
    name: 'single-quoted and upper-case markers are read',
    html: "<div DATA-IDENTITY-SECTION='palette'><i Data-Arena-Unfilled></i></div>"
      + IDENTITY_SECTIONS.filter(({ id }) => id !== 'palette').map(({ id }) => `<b data-identity-section='${id}'></b>`).join(''),
    expect: [/the section "The palette" still holds 1 unfilled block/],
  },
  { name: 'a page of prose with no marker at all names every section missing', html: '<p>Our product is blue.</p>', expect: new Array(14).fill(/is missing\./) },
];

test('identityProblems reads sections and unfilled blocks', () => {
  for (const row of ROWS) {
    const found = identityProblems(row.html);
    assert.equal(found.length, row.expect.length, `${row.name}: ${found.join(' | ')}`);
    row.expect.forEach((want, at) => assert.match(found[at] ?? '', want as RegExp, row.name));
  }
});

const made: string[] = [];
after(() => { for (const dir of made) rmSync(dir, { recursive: true, force: true }); });
const tmp = () => { const dir = mkdtempSync(join(tmpdir(), 'arena-identity-')); made.push(dir); return dir; };

test('identityStep reads the identity document beside the config and reports nothing without one', () => {
  const bare = tmp();
  assert.deepEqual(identityStep(join(bare, 'arena.config.json')).reports, [], 'no identity document means no report');

  const nested = tmp();
  mkdirSync(join(nested, 'config', 'design'), { recursive: true });
  writeFileSync(join(nested, 'config', 'design', 'identity.html'), '<p>nothing</p>');
  const found = identityStep(join(nested, 'config', 'arena.json')).reports;
  assert.equal(found.length, 14, 'the identity document is read beside the config');
  assert.ok(found.every((one) => one.kind === 'identity'), 'every report carries the identity kind');
});
