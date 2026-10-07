/* arena doctor compares the tree with what a build would leave and names what differs; it writes
 * nothing, and only held environment reports, a plan fatal or a differing sheet change its exit. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, satisfies } from './command-doctor.ts';
import { plan } from './plan.ts';
import { PLUGIN_SHEET } from './sheets.ts';
import { captureIo, hostRoot, options, phosphor, project } from './cli-fixtures.ts';

function setup(extra: Record<string, unknown> = {}) {
  const root = project();
  const { web } = phosphor();
  const environment = { arena: null, phosphor: web, sheets: null, map: null, vocabulary: null, ...extra };
  return { root, web, environment };
}

function build(root: string, web: string, arena: string | null = null) {
  const built = plan(options(root), { arena, packageName: '@dravensoft/arena-react', sheets: null, map: null, vocabulary: null, phosphor: web });
  for (const one of built.outputs) writeFileSync(one.path, one.content);
  return built;
}

function snapshot(root: string) {
  const out: Record<string, string> = {};
  for (const dir of ['.', 'src']) for (const name of readdirSync(join(root, dir), { withFileTypes: true })) {
    if (name.isFile()) out[join(dir, name.name)] = readFileSync(join(root, dir, name.name), 'utf8');
  }
  return out;
}

test('writes nothing', () => {
  const { root, environment } = setup();
  const before = snapshot(root);
  const { io } = captureIo(root, environment);
  run([], io);
  assert.deepEqual(snapshot(root), before);
});

test('before a build: missing sheets, exit 1', () => {
  const { root, environment } = setup();
  const { io, out, err } = captureIo(root, environment);
  assert.equal(run([], io), 1);
  assert.ok(err.some((line) => line === `arena doctor: ${join(root, 'src', 'arena.generated.css')} is missing; arena build writes it`));
  assert.ok(out.some((line) => line === `arena doctor: config ${join(root, 'arena.config.json')} is valid`));
});

test('after a build: current, exit 0', () => {
  const { root, web, environment } = setup();
  const built = build(root, web);
  const { io, out, err } = captureIo(root, environment);
  assert.equal(run([], io), 0);
  for (const one of built.outputs) assert.ok(out.includes(`arena doctor: ${one.path} is current`));
  assert.deepEqual(err.filter((line) => !line.includes('[environment]') && !line.includes('report(s)')), []);
  assert.ok(out.includes(`arena doctor: phosphor at ${web}`));
});

test('an edited sheet is stale, exit 1', () => {
  const { root, web, environment } = setup();
  const built = build(root, web);
  const edited = built.outputs[0]!.path;
  writeFileSync(edited, 'x');
  const { io, err } = captureIo(root, environment);
  assert.equal(run([], io), 1);
  assert.ok(err.includes(`arena doctor: ${edited} is stale; arena build rewrites it`));
});

test('an orphan plugin sheet is reported, exit 1', () => {
  const { root, web, environment } = setup();
  build(root, web);
  const orphan = join(root, 'src', PLUGIN_SHEET);
  writeFileSync(orphan, 'x');
  const { io, err } = captureIo(root, environment);
  assert.equal(run([], io), 1);
  assert.ok(err.includes(`arena doctor: ${orphan} is a sheet this config no longer produces; arena build removes it`));
});

test('a plan fatal exits 1 and says the sheets were not compared', () => {
  const { root, environment } = setup();
  const { io, err } = captureIo(root, environment);
  assert.equal(run(['--src', 'gone'], io), 1);
  assert.ok(err.includes(`arena doctor: ${join(root, 'gone')} is not there`));
  assert.ok(err.includes('arena doctor: sheets not compared, since nothing can be built yet'));
});

test('satisfies reads >=22 against v22.0.0, v21.9.9 and v23.1.0, >=22.11 against v22.10.0, and gives null for ^22', () => {
  assert.equal(satisfies('v22.0.0', '>=22'), true);
  assert.equal(satisfies('v21.9.9', '>=22'), false);
  assert.equal(satisfies('v23.1.0', '>=22'), true);
  assert.equal(satisfies('v22.10.0', '>=22.11'), false);
  assert.equal(satisfies('v22.11.0', '>=22.11'), true);
  assert.equal(satisfies('v22.0.0', '^22'), null);
});

const withEngines = (range: string) => hostRoot('@dravensoft/arena-react', '1.2.3', {
  'package.json': JSON.stringify({ name: '@dravensoft/arena-react', version: '1.2.3', engines: { node: range } }),
});

test('Node below engines is an environment report, held only by --strict=environment', () => {
  const { root, web, environment } = setup();
  const host = withEngines('>=99');
  build(root, web, host);
  const env = { ...environment, arena: host };
  const loose = captureIo(root, env);
  assert.equal(run([], loose.io), 0);
  assert.ok(loose.err.includes('arena doctor: [environment] node v22.12.0 does not satisfy engines.node >=99'));
  assert.ok(loose.out.includes('arena doctor: package @dravensoft/arena-react 1.2.3'));
  const held = captureIo(root, env);
  assert.equal(run(['--strict=environment'], held.io), 1);
  assert.ok(held.err.some((line) => line.startsWith('arena doctor: --strict holds environment')));
  const modern = withEngines('>=22');
  build(root, web, modern);
  const fine = captureIo(root, { ...environment, arena: modern });
  run([], fine.io);
  assert.ok(fine.out.includes('arena doctor: node v22.12.0 satisfies >=22'));
  const odd = withEngines('^22');
  build(root, web, odd);
  const unread = captureIo(root, { ...environment, arena: odd });
  run([], unread.io);
  assert.ok(unread.err.includes('arena doctor: [environment] engines.node reads ^22, which this command does not compare'));
});

test('no script running arena build is a note and leaves the exit 0', () => {
  const { root, web, environment } = setup();
  build(root, web);
  writeFileSync(join(root, '.gitignore'), '*.generated.css\n');
  const bare = captureIo(root, environment);
  assert.equal(run([], bare.io), 0);
  assert.ok(bare.out.some((line) => line.includes('no script in package.json runs arena build')));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: { prebuild: 'arena build && tsc' } }));
  const wired = captureIo(root, environment);
  assert.equal(run([], wired.io), 0);
  assert.ok(!wired.out.some((line) => line.includes('no script in package.json')));
});

test('.gitignore with *.generated.css is covered, src/*.generated.css is covered, a missing one is a note, and !*.generated.css does not cover', () => {
  const { root, web, environment } = setup();
  build(root, web);
  const noted = (content: string | null) => {
    if (content !== null) writeFileSync(join(root, '.gitignore'), content);
    const { io, out } = captureIo(root, environment);
    assert.equal(run([], io), 0);
    return out.some((line) => line.includes('.gitignore does not cover *.generated.css'));
  };
  assert.equal(noted(null), true);
  assert.equal(noted('# *.generated.css\n*.generated.css\n'), false);
  assert.equal(noted('src/*.generated.css\n'), false);
  assert.equal(noted('node_modules\n!*.generated.css\n'), true);
});

test('--strict=contrast exits 2 naming arena check', () => {
  const { root, environment } = setup();
  const { io, err } = captureIo(root, environment);
  assert.equal(run(['--strict=contrast'], io), 2);
  assert.ok(err[0]!.includes('belongs to arena check'));
});
