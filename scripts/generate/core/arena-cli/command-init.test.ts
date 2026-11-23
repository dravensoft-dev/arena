/* arena init: the config it copies, the scripts it wires, and what it leaves alone. */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from './command-init.ts';
import { captureIo, hostRoot, removeFixtures } from './cli-fixtures.ts';
import { RULE_TAGS } from './audit.ts';
import { parseArgs } from './args.ts';
import { strictNames } from './reports.ts';

after(removeFixtures);

const made: string[] = [];
const track = (dir: string) => { made.push(dir); return dir; };
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

const REACT = '@dravensoft/arena-react';
const ANGULAR = '@dravensoft/arena-angular';
const AUDIT = `arena audit --strict=${strictNames('audit').join(',')}`;
const EXAMPLE = '{\n  "palettes": [],\n  "x": 1\n}\n';

function setup(name = REACT, pkg: string | null = '{}\n') {
  const arena = hostRoot(name, '1.0.0', { 'arena.config.example.json': EXAMPLE });
  const cwd = track(mkdtempSync(join(tmpdir(), 'arena-init-')));
  if (pkg !== null) writeFileSync(join(cwd, 'package.json'), pkg);
  const captured = captureIo(cwd, { arena });
  return { arena, cwd, ...captured };
}

const scriptsOf = (cwd: string) => JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')).scripts;

test('React: an empty {} package.json gains prebuild, predev, arena:check and arena:audit with the exact texts', () => {
  const { cwd, io, out } = setup();
  assert.equal(run([], io), 0);
  assert.deepEqual(scriptsOf(cwd), {
    prebuild: 'arena build',
    predev: 'arena build',
    'arena:check': 'arena check --strict=components,glyph,markers',
    'arena:audit': AUDIT,
  });
  assert.ok(out.includes('arena init: added prebuild, predev, arena:check, arena:audit to package.json'));
});

test('Angular: prebuild and prestart', () => {
  const { cwd, io } = setup(ANGULAR);
  assert.equal(run([], io), 0);
  assert.deepEqual(Object.keys(scriptsOf(cwd)), ['prebuild', 'prestart', 'arena:check', 'arena:audit']);
  assert.equal(scriptsOf(cwd).prestart, 'arena build');
});

test('the config is a byte copy of the package\'s example', () => {
  const { cwd, io, out } = setup();
  run([], io);
  assert.equal(readFileSync(join(cwd, 'arena.config.json'), 'utf8'), EXAMPLE);
  assert.ok(out.includes(`arena init: wrote ${join(cwd, 'arena.config.json')}, a copy of the example this package carries`));
});

test('an existing config is never overwritten', () => {
  const { cwd, io, out } = setup();
  writeFileSync(join(cwd, 'arena.config.json'), 'mine');
  run([], io);
  assert.equal(readFileSync(join(cwd, 'arena.config.json'), 'utf8'), 'mine');
  assert.ok(!out.some((line) => line.includes('wrote')));
});

test('an existing identical script is not rewritten', () => {
  const pkg = JSON.stringify({ scripts: { prebuild: 'arena build' } }, null, 2) + '\n';
  const { cwd, io } = setup(REACT, pkg);
  run([], io);
  assert.deepEqual(Object.keys(scriptsOf(cwd)), ['prebuild', 'predev', 'arena:check', 'arena:audit']);
  const again = setup(REACT, JSON.stringify({ scripts: { prebuild: 'arena build', predev: 'arena build',
    'arena:check': 'arena check --strict=components,glyph,markers', 'arena:audit': AUDIT } }));
  writeFileSync(join(again.cwd, 'arena.config.json'), 'x');
  const before = readFileSync(join(again.cwd, 'package.json'), 'utf8');
  again.out.length = 0;
  run([], again.io);
  assert.equal(readFileSync(join(again.cwd, 'package.json'), 'utf8'), before);
  assert.deepEqual(again.out, ['arena init: nothing to do']);
});

test('a foreign prebuild is kept and the "make it" line names the text to add', () => {
  const { cwd, io, out } = setup(REACT, JSON.stringify({ scripts: { prebuild: 'tsc -b' } }));
  assert.equal(run([], io), 0);
  assert.equal(scriptsOf(cwd).prebuild, 'tsc -b');
  assert.ok(out.includes('arena init: package.json already runs "tsc -b" as prebuild, so init left it; make it: arena build && tsc -b'));
  assert.equal(scriptsOf(cwd).predev, 'arena build');
});

test('a prebuild already running arena build counts as wired', () => {
  const { cwd, io, out } = setup(REACT, JSON.stringify({ scripts: { prebuild: 'arena build && tsc -b' } }));
  run([], io);
  assert.equal(scriptsOf(cwd).prebuild, 'arena build && tsc -b');
  assert.ok(!out.some((line) => line.includes('so init left it')));
});

test('a second run prints "nothing to do" and leaves package.json byte-identical', () => {
  const { cwd, io, out } = setup();
  run([], io);
  const before = readFileSync(join(cwd, 'package.json'), 'utf8');
  out.length = 0;
  assert.equal(run([], io), 0);
  assert.equal(readFileSync(join(cwd, 'package.json'), 'utf8'), before);
  assert.deepEqual(out, ['arena init: nothing to do']);
});

test('a kept arena:check is reported', () => {
  const { cwd, io, out } = setup(REACT, JSON.stringify({ scripts: { 'arena:check': 'arena check' } }));
  run([], io);
  assert.equal(scriptsOf(cwd)['arena:check'], 'arena check');
  assert.ok(out.includes('arena init: kept arena:check, which reads "arena check"'));
});

test('the original indent and trailing newline are kept', () => {
  const { cwd, io } = setup(REACT, '{\n\t"name": "app"\n}\n');
  run([], io);
  const text = readFileSync(join(cwd, 'package.json'), 'utf8');
  assert.match(text, /^\{\n\t"name": "app",\n\t"scripts": \{\n\t\t"prebuild"/);
  assert.ok(text.endsWith('}\n'));
  const bare = setup(REACT, '{"name":"app"}');
  run([], bare.io);
  assert.ok(readFileSync(join(bare.cwd, 'package.json'), 'utf8').endsWith('}'));
  assert.match(readFileSync(join(bare.cwd, 'package.json'), 'utf8'), /\n  "scripts"/);
});

test('a non-default --config is appended to every script it writes', () => {
  const { cwd, io } = setup();
  assert.equal(run(['--config', 'config/arena.json'], io), 0);
  assert.deepEqual(scriptsOf(cwd), {
    prebuild: 'arena build --config config/arena.json',
    predev: 'arena build --config config/arena.json',
    'arena:check': 'arena check --strict=components,glyph,markers --config config/arena.json',
    'arena:audit': `${AUDIT} --config config/arena.json`,
  });
  assert.equal(readFileSync(join(cwd, 'config', 'arena.json'), 'utf8'), EXAMPLE);
});

type InitCtx = { arena: string | null; cwd: string; io: ReturnType<typeof captureIo>['io']; err: string[] };
const noConfig = (ctx: InitCtx) => !existsSync(join(ctx.cwd, 'arena.config.json'));

const EXIT_2: {
  name: string;
  make: () => InitCtx;
  expected: (ctx: InitCtx) => string[] | string | RegExp;
  packageJson?: string;
  noConfig?: boolean;
}[] = [
  {
    name: 'no package exits 2',
    make: () => {
      const { cwd } = setup();
      const { io, err } = captureIo(cwd, { arena: null });
      return { arena: null, cwd, io, err };
    },
    expected: () => ['arena init: arena init copies the example config an Arena package carries, and no Arena package is around this command'],
  },
  {
    name: 'an unknown package exits 2 naming it',
    make: () => setup('@dravensoft/arena-vue'),
    expected: () => ['arena init: @dravensoft/arena-vue is not a package arena init knows how to wire'],
  },
  {
    name: 'no example exits 2',
    make: () => {
      const ctx = setup();
      rmSync(join(ctx.arena, 'arena.config.example.json'));
      return ctx;
    },
    expected: (ctx) => [`arena init: ${join(ctx.arena!, 'arena.config.example.json')} is not there`],
    noConfig: true,
  },
  {
    name: 'no package.json exits 2',
    make: () => setup(REACT, null),
    expected: (ctx) => [`arena init: no package.json in ${ctx.cwd}; arena init adds scripts to the one your project has`],
    noConfig: true,
  },
  {
    name: 'bad JSON exits 2',
    make: () => setup(REACT, '{nope'),
    expected: (ctx) => new RegExp(`^arena init: cannot read ${join(ctx.cwd, 'package.json').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: `),
    noConfig: true,
  },
  ...['null', '[]', '7', '"x"'].map((body) => ({
    name: `a package.json that is not a JSON object exits 2 and is untouched (${body})`,
    make: () => setup(REACT, body),
    expected: (ctx: InitCtx) => `arena init: cannot read ${join(ctx.cwd, 'package.json')}: it holds ${body === '[]' ? 'an array' : 'no JSON object'}`,
    packageJson: body,
    noConfig: true,
  })),
  ...['"x"', '["a"]', 'null'].map((scripts) => ({
    name: `a scripts field that is not an object exits 2 naming it and writes nothing (${scripts})`,
    make: () => setup(REACT, `{"scripts":${scripts}}`),
    expected: (ctx: InitCtx) => `arena init: "scripts" in ${join(ctx.cwd, 'package.json')} is not an object, so init cannot add to it`,
    packageJson: `{"scripts":${scripts}}`,
    noConfig: true,
  })),
];

test('arena init exits 2 and writes nothing when it cannot wire the project', () => {
  assert.ok(EXIT_2.length > 0, 'the table has rows');
  for (const row of EXIT_2) {
    const ctx = row.make();
    assert.equal(run([], ctx.io), 2, row.name);
    const expected = row.expected(ctx);
    if (Array.isArray(expected)) assert.deepEqual(ctx.err, expected, row.name);
    else if (typeof expected === 'string') assert.equal(ctx.err[0], expected, row.name);
    else assert.match(ctx.err[0] as string, expected, row.name);
    if (row.packageJson !== undefined) assert.equal(readFileSync(join(ctx.cwd, 'package.json'), 'utf8'), row.packageJson, row.name);
    if (row.noConfig) assert.ok(noConfig(ctx), `${row.name}: no arena.config.json was written`);
  }
});

test('a --config path with a space is wrapped in plain double quotes, with no backslash escape, in every script', () => {
  const { cwd, io } = setup();
  assert.equal(run(['--config', 'my config/a b.json'], io), 0);
  assert.equal(scriptsOf(cwd).prebuild, 'arena build --config "my config/a b.json"');
  assert.equal(scriptsOf(cwd)['arena:audit'], `${AUDIT} --config "my config/a b.json"`);
  const plain = setup();
  run(['--config', 'conf/a-b_c.json'], plain.io);
  assert.equal(scriptsOf(plain.cwd).prebuild, 'arena build --config conf/a-b_c.json');
});

for (const bad of ['a"b.json', 'a$b.json', 'a`b.json', 'a%b%.json', 'a!b.json', 'conf\\a.json']) {
  test(`a --config path holding a character no shell quotes the same way (${bad}) exits 2 naming it and writes nothing`, () => {
    const { cwd, io, out, err } = setup();
    assert.equal(run(['--config', bad], io), 2);
    assert.deepEqual(out, []);
    assert.deepEqual(err, [`arena init: --config ${bad} holds ", $, \`, %, ! or \\, which a package.json script cannot quote the same way under sh and cmd.exe; pick a path without them`]);
    assert.equal(readFileSync(join(cwd, 'package.json'), 'utf8'), '{}\n');
    assert.ok(!existsSync(join(cwd, bad)));
  });
}

test('a CRLF package.json keeps CRLF line endings', () => {
  const { cwd, io } = setup(REACT, '{\r\n  "name": "app"\r\n}\r\n');
  run([], io);
  const text = readFileSync(join(cwd, 'package.json'), 'utf8');
  assert.ok(text.includes('\r\n'));
  assert.ok(!/[^\r]\n/.test(text));
  assert.ok(text.endsWith('}\r\n'));
});

test('a config it cannot write exits 2 naming it, and package.json is untouched', () => {
  const { cwd, io, out, err } = setup();
  writeFileSync(join(cwd, 'blocker'), 'a file, not a directory');
  assert.equal(run(['--config', 'blocker/arena.json'], io), 2);
  assert.deepEqual(out, []);
  assert.equal(err.length, 1);
  assert.ok(err[0]!.startsWith(`arena init: cannot write ${join(cwd, 'blocker', 'arena.json')}: `), err.join('\n'));
  assert.equal(readFileSync(join(cwd, 'package.json'), 'utf8'), '{}\n');
});

test('a package.json it cannot write exits 2 naming it', { skip: process.getuid?.() === 0 && 'root writes a read-only file' }, () => {
  const { cwd, io, err } = setup();
  const pkg = join(cwd, 'package.json');
  chmodSync(pkg, 0o444);
  try {
    assert.equal(run([], io), 2);
    assert.equal(err.length, 1);
    assert.ok(err[0]!.startsWith(`arena init: cannot write ${pkg}: `), err.join('\n'));
    assert.equal(readFileSync(pkg, 'utf8'), '{}\n');
  } finally { chmodSync(pkg, 0o644); }
});

test('the "make it" line carries a non-default --config', () => {
  const { io, out } = setup(REACT, JSON.stringify({ scripts: { prebuild: 'tsc -b' } }));
  assert.equal(run(['--config', 'conf/my arena.json'], io), 0);
  assert.ok(out.includes('arena init: package.json already runs "tsc -b" as prebuild, so init left it; '
    + 'make it: arena build --config "conf/my arena.json" && tsc -b'), out.join('\n'));
});

test('a package.json saved with a byte order mark is read, and keeps the mark', () => {
  const { cwd, io } = setup(REACT, '﻿{\n  "name": "app"\n}\n');
  assert.equal(run([], io), 0);
  const text = readFileSync(join(cwd, 'package.json'), 'utf8');
  assert.ok(text.startsWith('﻿{\n  "name": "app",\n  "scripts": {'), JSON.stringify(text.slice(0, 40)));
  assert.equal(JSON.parse(text.slice(1)).scripts.prebuild, 'arena build');
});

test('the written arena:audit names every audit rule and restated, and parses back to those names', () => {
  const { cwd, io } = setup();
  assert.equal(run([], io), 0);
  const script = scriptsOf(cwd)['arena:audit'] as string;
  for (const rule of RULE_TAGS) assert.ok(script.includes(`audit:${rule}`), rule);
  assert.ok(script.endsWith(',restated'), script);
  const parsed = parseArgs('audit', script.split(' ').slice(2));
  assert.equal(parsed.kind, 'options');
  if (parsed.kind === 'options') assert.deepEqual(parsed.options.strict, strictNames('audit'));
});

test('a project wired with the bare switch keeps it on a second init', () => {
  const { cwd, io, out } = setup(REACT, JSON.stringify({ scripts: { 'arena:audit': 'arena audit --strict' } }));
  assert.equal(run([], io), 0);
  assert.equal(scriptsOf(cwd)['arena:audit'], 'arena audit --strict');
  assert.ok(out.includes('arena init: kept arena:audit, which reads "arena audit --strict"'), out.join('\n'));
});

const FONT_FILES = { 'fonts/a.woff2': 'wOF2 a', 'fonts/a.OFL.txt': 'licence a', 'fonts/b.woff2': 'wOF2 b' };

function withFonts(files: Record<string, string> = FONT_FILES) {
  const arena = hostRoot(REACT, '1.0.0', { 'arena.config.example.json': EXAMPLE, ...files });
  const cwd = track(mkdtempSync(join(tmpdir(), 'arena-init-')));
  writeFileSync(join(cwd, 'package.json'), '{}\n');
  return { arena, cwd, ...captureIo(cwd, { arena }) };
}

test('init copies the example\'s fonts beside the config, with their licence, and says so', () => {
  const { cwd, io, out } = withFonts();
  assert.equal(run([], io), 0);
  assert.deepEqual(readdirSync(join(cwd, 'fonts')).sort(), ['a.OFL.txt', 'a.woff2', 'b.woff2']);
  assert.equal(readFileSync(join(cwd, 'fonts', 'a.woff2'), 'utf8'), 'wOF2 a');
  assert.ok(out.some((line) => /^arena init: wrote 3 file\(s\) under .*fonts, the fonts the example config names$/.test(line)));
});

test('the fonts go beside a config that is not at the project root, and a file the project holds stays', () => {
  const { cwd, io } = withFonts();
  mkdirSync(join(cwd, 'config', 'fonts'), { recursive: true });
  writeFileSync(join(cwd, 'config', 'fonts', 'a.woff2'), 'mine');
  assert.equal(run(['--config', 'config/arena.json'], io), 0);
  assert.equal(readFileSync(join(cwd, 'config', 'fonts', 'a.woff2'), 'utf8'), 'mine');
  assert.deepEqual(readdirSync(join(cwd, 'config', 'fonts')).sort(), ['a.OFL.txt', 'a.woff2', 'b.woff2']);
  assert.equal(existsSync(join(cwd, 'fonts')), false);
});

test('a config the project already has gets no fonts, and a package with none writes none', () => {
  const kept = withFonts();
  writeFileSync(join(kept.cwd, 'arena.config.json'), '{}\n');
  assert.equal(run([], kept.io), 0);
  assert.equal(existsSync(join(kept.cwd, 'fonts')), false);
  const bare = setup();
  assert.equal(run([], bare.io), 0);
  assert.equal(existsSync(join(bare.cwd, 'fonts')), false);
});
