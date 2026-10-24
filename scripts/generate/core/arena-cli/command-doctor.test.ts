/* arena doctor compares the tree with what a build would leave and names what differs; it writes
 * nothing, and only held environment reports, a plan fatal or a differing sheet change its exit. */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { relPosix } from './posix.ts';
import { run, satisfies, unignoredOutputs } from './command-doctor.ts';
import { plan } from './plan.ts';
import { ICON_MANIFEST, PACKAGE_SHEET, PLUGIN_SHEET, THEME_SHEET } from './sheets.ts';
import { MAP, SHEETS, captureIo, hostRoot, options, phosphor, project, readable, removeFixtures, packageStub } from './cli-fixtures.ts';

after(removeFixtures);

const NO_COMPONENTS = { match: 'selector', draws: {}, needs: {} };

function setup(extra: Record<string, unknown> = {}) {
  const root = project();
  const { core } = phosphor();
  const environment = { arena: packageStub(), phosphor: core, sheets: null, map: NO_COMPONENTS, vocabulary: null, ...extra };
  return { root, core, environment };
}

async function build(root: string, core: string, arena: string | null = packageStub()) {
  const built = await plan(options(root), { arena, packageName: '@dravensoft/arena-react', sheets: null, map: NO_COMPONENTS, vocabulary: null, phosphor: core });
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

test('writes nothing', async () => {
  const { root, environment } = setup();
  const before = snapshot(root);
  const { io } = captureIo(root, environment);
  await run([], io);
  assert.deepEqual(snapshot(root), before);
});

test('before a build: missing sheets, exit 1', async () => {
  const { root, environment } = setup();
  const { io, out, err } = captureIo(root, environment);
  assert.equal(await run([], io), 1);
  assert.ok(err.some((line) => line === `arena doctor: ${join(root, 'src', 'arena.generated.css')} is missing; arena build writes it`));
  assert.ok(out.some((line) => line === `arena doctor: config ${join(root, 'arena.config.json')} is valid`));
});

test('after a build: current, exit 0', async () => {
  const { root, core, environment } = setup();
  const built = await build(root, core);
  const { io, out, err } = captureIo(root, environment);
  assert.equal(await run([], io), 0);
  for (const one of built.outputs) assert.ok(out.includes(`arena doctor: ${one.path} is current`));
  assert.deepEqual(err.filter((line) => !line.includes('[environment]') && !line.includes('report(s)')), []);
  assert.ok(out.includes(`arena doctor: @phosphor-icons/core at ${core}`));
});

test('an edited sheet is stale, exit 1', async () => {
  const { root, core, environment } = setup();
  const built = await build(root, core);
  const edited = built.outputs[0]!.path;
  writeFileSync(edited, 'x');
  const { io, err } = captureIo(root, environment);
  assert.equal(await run([], io), 1);
  assert.ok(err.includes(`arena doctor: ${edited} is stale; arena build rewrites it`));
});

test('an orphan plugin sheet is reported, exit 1', async () => {
  const { root, core, environment } = setup();
  await build(root, core);
  const orphan = join(root, 'src', PLUGIN_SHEET);
  writeFileSync(orphan, 'x');
  const { io, err } = captureIo(root, environment);
  assert.equal(await run([], io), 1);
  assert.ok(err.includes(`arena doctor: ${orphan} is a file this config does not produce; arena build removes it`));
});

test('a sprite the build no longer writes and an icon sheet from an earlier version are orphans, exit 1', async () => {
  const { root, core, environment } = setup();
  await build(root, core);
  const stale = join(root, 'src', 'icons-0123456789.svg');
  const sheet = join(root, 'src', 'icons.generated.css');
  writeFileSync(stale, '<svg/>');
  writeFileSync(sheet, 'x');
  const { io, err } = captureIo(root, environment);
  assert.equal(await run([], io), 1);
  assert.ok(err.includes(`arena doctor: ${stale} is a file this config does not produce; arena build removes it`));
  assert.ok(err.includes(`arena doctor: ${sheet} is a file this config does not produce; arena build removes it`));
});

test('a plan fatal exits 1 and says the sheets were not compared', async () => {
  const { root, environment } = setup();
  const { io, err } = captureIo(root, environment);
  assert.equal(await run(['--src', 'gone'], io), 1);
  assert.ok(err.includes(`arena doctor: ${join(root, 'gone')} is not there`));
  assert.ok(err.includes('arena doctor: sheets not compared, since nothing can be built yet'));
});

test('satisfies reads >=22 against v22.0.0, v21.9.9 and v23.1.0, >=22.11 against v22.10.0, and gives null for ^22', async () => {
  assert.equal(satisfies('v22.0.0', '>=22'), true);
  assert.equal(satisfies('v21.9.9', '>=22'), false);
  assert.equal(satisfies('v23.1.0', '>=22'), true);
  assert.equal(satisfies('v22.10.0', '>=22.11'), false);
  assert.equal(satisfies('v22.11.0', '>=22.11'), true);
  assert.equal(satisfies('v22.0.0', '^22'), null);
});

const withEngines = (range: string) => hostRoot('@dravensoft/arena-react', '1.2.3', {
  'package.json': JSON.stringify({ name: '@dravensoft/arena-react', version: '1.2.3', engines: { node: range } }),
  [ICON_MANIFEST]: JSON.stringify({ components: {}, fills: [] }),
});

test('Node below engines is an environment report, held only by --strict=environment', async () => {
  const { root, core, environment } = setup();
  const host = withEngines('>=99');
  await build(root, core, host);
  const env = { ...environment, arena: host };
  const loose = captureIo(root, env);
  assert.equal(await run([], loose.io), 0);
  assert.deepEqual(loose.err.filter((line) => line.includes('[environment]')),
    ['arena doctor: [environment] node v22.12.0 does not satisfy engines.node >=99']);
  assert.ok(loose.out.includes('arena doctor: package @dravensoft/arena-react 1.2.3'));
  const held = captureIo(root, env);
  assert.equal(await run(['--strict=environment'], held.io), 1);
  assert.ok(held.err.includes('arena doctor: --strict holds environment, and this run reports 1 of them: environment'));
  const modern = withEngines('>=22');
  await build(root, core, modern);
  const fine = captureIo(root, { ...environment, arena: modern });
  await run([], fine.io);
  assert.ok(fine.out.includes('arena doctor: node v22.12.0 satisfies >=22'));
  const odd = withEngines('^22');
  await build(root, core, odd);
  const unread = captureIo(root, { ...environment, arena: odd });
  await run([], unread.io);
  assert.ok(unread.err.includes('arena doctor: [environment] engines.node reads ^22, which this command does not compare'));
});

test('no script running arena build is a note and leaves the exit 0', async () => {
  const { root, core, environment } = setup();
  await build(root, core);
  writeFileSync(join(root, '.gitignore'), '*.generated.css\n');
  const bare = captureIo(root, environment);
  assert.equal(await run([], bare.io), 0);
  assert.ok(bare.out.some((line) => line.includes('no script in package.json runs arena build')));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: { prebuild: 'arena build && tsc' } }));
  const wired = captureIo(root, environment);
  assert.equal(await run([], wired.io), 0);
  assert.ok(!wired.out.some((line) => line.includes('no script in package.json')));
});

const gitOk = spawnSync('git', ['--version']).status === 0;
const gitSkip = gitOk ? false : 'git is not installed';
const ignoreNote = (out: string[]) => out.filter((line) => line.includes('note: git does not ignore'));

async function builtRoot() {
  const { root, core, environment } = setup();
  const built = await build(root, core);
  const paths = [...built.outputs, ...built.binaries].map((one) => relPosix(root, one.path));
  return { root, environment, paths };
}

test('a .gitignore listing every output by path gets no note', { skip: gitSkip }, async () => {
  const { root, environment, paths } = await builtRoot();
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: root }).status, 0);
  writeFileSync(join(root, '.gitignore'), `${paths.map((one) => `/${one}`).join('\n')}\n`);
  const { io, out } = captureIo(root, environment);
  assert.equal(await run([], io), 0);
  assert.deepEqual(ignoreNote(out), []);
  assert.ok(!out.some((line) => line.includes('.gitignore does not cover')));
});

test('an output git does not ignore is named in the note', { skip: gitSkip }, async () => {
  const { root, environment, paths } = await builtRoot();
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: root }).status, 0);
  const sprite = paths.find((one) => /(^|\/)icons-[0-9a-f]{10}\.svg$/.test(one))!;
  assert.ok(sprite);
  writeFileSync(join(root, '.gitignore'), `${paths.filter((one) => one !== sprite).map((one) => `/${one}`).join('\n')}\n`);
  const { io, out } = captureIo(root, environment);
  assert.equal(await run([], io), 0);
  const notes = ignoreNote(out);
  assert.equal(notes.length, 1);
  assert.ok(notes[0]!.includes(`git does not ignore ${sprite};`), notes[0]!);
  assert.ok(notes[0]!.includes('add them to .gitignore'));
  for (const one of paths.filter((one) => one !== sprite)) assert.ok(!notes[0]!.includes(one), one);
});

async function outsideAnyWorkTree<T>(body: () => Promise<T>) {
  const held = process.env.GIT_CEILING_DIRECTORIES;
  process.env.GIT_CEILING_DIRECTORIES = tmpdir();
  try { return await body(); } finally {
    if (held === undefined) delete process.env.GIT_CEILING_DIRECTORIES; else process.env.GIT_CEILING_DIRECTORIES = held;
  }
}

test('outside a git work tree the .gitignore is read as text, as before', () => outsideAnyWorkTree(async () => {
  const { root, core, environment } = setup();
  await build(root, core);
  const noted = async (content: string | null) => {
    if (content !== null) writeFileSync(join(root, '.gitignore'), content);
    const { io, out } = captureIo(root, environment);
    assert.equal(await run([], io), 0);
    return out.some((line) => line.includes('.gitignore does not cover *.generated.css'));
  };
  assert.equal(await noted(null), true);
  const named = captureIo(root, environment);
  await run([], named.io);
  assert.ok(named.out.some((line) => line.includes('icons-*.svg') && line.includes('-*.woff2')));
  assert.equal(await noted('# *.generated.css\n*.generated.css\n'), false);
  assert.equal(await noted('src/*.generated.css\n'), false);
  assert.equal(await noted('node_modules\n!*.generated.css\n'), true);
}));

test('an output leaving the work tree falls back to the text reading and does not throw', { skip: gitSkip }, async () => {
  const { root, core, environment } = setup();
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: root }).status, 0);
  const away = mkdtempSync(join(tmpdir(), 'arena-away-'));
  const { io, out } = captureIo(root, environment);
  const code = await run(['-o', away], io);
  rmSync(away, { recursive: true, force: true });
  assert.ok(code === 0 || code === 1);
  assert.ok(out.some((line) => line.includes('.gitignore does not cover *.generated.css')));
  assert.ok(!out.some((line) => line.includes('note: git does not ignore')));
});

test('an ignored output with a non-ASCII path is not reported as unignored', { skip: gitSkip }, () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-ascii-'));
  try {
    assert.equal(spawnSync('git', ['init', '-q'], { cwd: root }).status, 0);
    writeFileSync(join(root, '.gitignore'), '/\u00e9.css\n');
    assert.deepEqual(unignoredOutputs(root, ['\u00e9.css', 'plain.css']), ['plain.css']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a git that fails or is absent, and an empty list, give null, the answer run reads as the text reading', () => {
  assert.equal(unignoredOutputs(join(tmpdir(), 'arena-no-such-root-0'), ['src/a.css']), null);
  assert.equal(unignoredOutputs(tmpdir(), []), null);
  if (!gitOk) return;
  const tree = process.cwd();
  assert.notEqual(unignoredOutputs(tree, ['package.json']), null, 'the suite runs inside a work tree git answers for');
  const held = process.env.PATH;
  process.env.PATH = join(tmpdir(), 'arena-no-such-path-0');
  try { assert.equal(unignoredOutputs(tree, ['package.json']), null, 'no git on the PATH'); } finally { process.env.PATH = held; }
});

test('a build that writes the package sheet no source imports is a note naming the sheet, and an import clears it', async () => {
  const { root, core, environment } = setup();
  await build(root, core);
  writeFileSync(join(root, 'src', 'main.css'), `@import './${THEME_SHEET}';\n`);
  const noted = async () => {
    const { io, out } = captureIo(root, environment);
    assert.equal(await run([], io), 0);
    return out.filter((line) => line.includes('note:') && line.includes(PACKAGE_SHEET));
  };
  const before = await noted();
  assert.equal(before.length, 1);
  assert.ok(before[0]!.includes(`@import './${PACKAGE_SHEET}'`));
  writeFileSync(join(root, 'src', 'main.css'), `@import './${PACKAGE_SHEET}';\n@import './${THEME_SHEET}';\n`);
  assert.deepEqual(await noted(), []);
});

test('--strict=contrast exits 2 naming arena check', async () => {
  const { root, environment } = setup();
  const { io, err } = captureIo(root, environment);
  assert.equal(await run(['--strict=contrast'], io), 2);
  assert.ok(err[0]!.includes('belongs to arena check'));
});

test('a tree built from a named list the map closes is current, and one built from the list as written is stale', async () => {
  const { core } = phosphor();
  const root = project({ ...readable, stylesheet: { components: ['table'] } });
  const environment = { arena: packageStub(SHEETS), packageName: '@dravensoft/arena-react', phosphor: core, sheets: SHEETS, map: MAP, vocabulary: null };

  const asWritten = await plan(options(root), { ...environment, map: null });
  for (const one of asWritten.outputs) writeFileSync(one.path, one.content);
  const before = captureIo(root, environment);
  assert.equal(await run([], before.io), 1);
  const packaged = asWritten.outputs.find((one) => one.name === PACKAGE_SHEET)!;
  assert.ok(before.err.includes(`arena doctor: ${packaged.path} is stale; arena build rewrites it`));
  assert.ok(before.out.includes(`arena doctor: ${asWritten.outputs[0]!.path} is current`), 'the app\'s half does not follow the components');

  const built = await plan(options(root), environment);
  assert.match(built.outputs.find((one) => one.name === PACKAGE_SHEET)!.content, /\/\* @dravensoft\/arena-react\/css\/components\/pagination\.css \*\//);
  for (const one of built.outputs) writeFileSync(one.path, one.content);
  const staleSprite = asWritten.outputs.find((one) => /^icons-[0-9a-f]{10}\.svg$/.test(one.name))!;
  assert.notEqual(staleSprite.name, built.outputs.find((one) => /^icons-[0-9a-f]{10}\.svg$/.test(one.name))!.name,
    'the list as written drew the filled weight too, so its sprite carries another name');
  const leftover = captureIo(root, environment);
  assert.equal(await run([], leftover.io), 1);
  assert.ok(leftover.err.includes(`arena doctor: ${staleSprite.path} is a file this config does not produce; arena build removes it`));
  rmSync(staleSprite.path);
  const after = captureIo(root, environment);
  assert.equal(await run([], after.io), 0);
  for (const one of built.outputs) assert.ok(after.out.includes(`arena doctor: ${one.path} is current`), one.path);
});
