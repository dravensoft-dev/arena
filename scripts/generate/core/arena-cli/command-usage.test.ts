/* arena usage: it names what the sources draw and what the plugins paint, writes nothing, and
 * holds no report, so its only failures are the ones where it cannot run. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { run } from './command-usage.ts';
import { MAP, captureIo, project, readable } from './cli-fixtures.ts';

const environment = { arena: null, packageName: '@dravensoft/arena-react', map: MAP, phosphor: null };

function tree(root: string): Record<string, string> {
  const seen: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const at = join(dir, entry.name);
      if (entry.isDirectory()) walk(at);
      else seen[at] = readFileSync(at, 'utf8');
    }
  };
  walk(root);
  return seen;
}

test('writes nothing', () => {
  const root = project(readable, { 'app.html': '<arena-button></arena-button>' });
  try {
    const before = tree(root);
    const { io } = captureIo(root, environment);
    assert.equal(run([], io), 0);
    assert.deepEqual(tree(root), before);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('names the undrawn components and the painted parts', () => {
  const root = project({ ...readable, stylePlugins: ['plugin'] }, { 'app.html': '<arena-button></arena-button>' });
  try {
    mkdirSync(join(root, 'plugin'));
    writeFileSync(join(root, 'plugin', 'skin.css'), '[data-arena-part="title"] { color: red; }');
    const { io, out, err } = captureIo(root, environment);
    assert.equal(run([], io), 0);
    assert.deepEqual(err, []);
    assert.equal(out[0], 'arena usage: 1 of 3 shipped component(s) drawn under ' + join(root, 'src'));
    assert.equal(out[1], 'arena usage: 2 drawn nowhere: arena-bar-chart, arena-table');
    assert.match(out[2]!, /^arena usage: your style plugin\(s\) paint 1 part\(s\): title\. /);
    assert.equal(out.length, 3);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a missing --src exits 2 and names it', () => {
  const root = project();
  try {
    const { io, err } = captureIo(root, environment);
    assert.equal(run(['--src', 'nowhere'], io), 2);
    assert.deepEqual(err, [`arena usage: ${join(root, 'nowhere')} is not there`]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('no component map exits 2', () => {
  const root = project();
  try {
    const { io, out, err } = captureIo(root, { ...environment, map: null });
    assert.equal(run([], io), 2);
    assert.equal(out.length, 0);
    assert.match(err[0]!, /^arena usage: .*component map this package carries/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('--strict exits 2 with the neighbour message', () => {
  const root = project();
  try {
    const { io, err } = captureIo(root, environment);
    assert.equal(run(['--strict'], io), 2);
    assert.match(err[0]!, /^arena usage: --strict is not a flag of arena usage; arena usage reports nothing a project fixes/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a config it cannot read exits 2 naming it, and a named config that is not there does too', () => {
  const root = project({ ...readable, stylePlugins: ['plugin'] }, { 'app.html': '<arena-button></arena-button>' });
  try {
    const config = join(root, 'arena.config.json');
    writeFileSync(config, '{ "stylePlugins": ["plugin"], }');
    const broken = captureIo(root, environment);
    assert.equal(run([], broken.io), 2);
    assert.deepEqual(broken.out, []);
    assert.equal(broken.err.length, 1);
    assert.ok(broken.err[0]!.startsWith(`arena usage: cannot read ${config}: `), broken.err.join('\n'));

    const named = captureIo(root, environment);
    assert.equal(run(['--config', 'nope.json'], named.io), 2);
    assert.ok(named.err[0]!.startsWith(`arena usage: cannot read ${join(root, 'nope.json')}: `), named.err.join('\n'));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('no config at the default path reads as no style plugin', () => {
  const root = project(null, { 'app.html': '<arena-button></arena-button>' });
  try {
    const { io, out } = captureIo(root, environment);
    assert.equal(run([], io), 0);
    assert.match(out[2]!, /paint no part\(s\)/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a --config spelled like the default that is not there exits 2, since it was named', () => {
  const root = project(null, { 'app.html': '<arena-button></arena-button>' });
  try {
    const { io, err } = captureIo(root, environment);
    assert.equal(run(['--config', 'arena.config.json'], io), 2);
    assert.match(err[0]!, /^arena usage: cannot read .*arena\.config\.json: /);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
