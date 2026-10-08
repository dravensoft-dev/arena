/* The consumer page for the arena command against the command itself. Every command the dispatch
 * carries has a row, every row lists every spelling of every flag that command takes, every kind
 * --strict holds is named beside its command, every `arena <word>` the page writes is a word the
 * dispatch answers, each JSON block is what arena init writes, and every cause the exit-code table
 * names is a run that exits with that code. The page is prose a person writes, so this is what
 * keeps it from promising a code, a script or a flag the command does not keep. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMANDS, main } from './arena.ts';
import { COMMAND_NAMES, FLAGS, FLAG_NAMES, NEIGHBOURS, SPECS } from './args.ts';
import type { FlagName } from './args.ts';
import { KINDS_BY_COMMAND, RULES_BY_KIND } from './reports.ts';
import { OUTPUT_SHEETS } from './sources.ts';
import { MAP, SHEETS, captureIo, hostRoot, phosphor, project, readable } from './cli-fixtures.ts';
import type { HostEnvironment } from './host.ts';

const PAGE = fileURLToPath(new URL('../../../../skills/design/references/cli.md', import.meta.url));
const ANSWERED = new Set<string>([...COMMAND_NAMES, 'help', '--help', '-h', '--version']);

const page = () => {
  assert.ok(existsSync(PAGE), `${PAGE} is not there`);
  return readFileSync(PAGE, 'utf8');
};

function row(source: string, command: string) {
  const line = source.split('\n').find((one) => one.startsWith(`| \`arena ${command}\``));
  assert.ok(line, `the command table has no row for arena ${command}`);
  return line;
}

function code(source: string) {
  const fences = [...source.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((match) => match[1] ?? '');
  const prose = source.replace(/```[^\n]*\n[\s\S]*?```/g, '');
  const spans = [...prose.matchAll(/`([^`\n]+)`/g)].map((match) => match[1] ?? '');
  return [...fences, ...spans];
}

test('the command table has a row for every command the dispatch carries', () => {
  const source = page();
  assert.deepEqual(Object.keys(COMMANDS).sort(), [...COMMAND_NAMES].sort());
  for (const command of COMMAND_NAMES) row(source, command);
});

test('every row names every spelling of every flag its command takes, and no other flag', () => {
  const source = page();
  for (const command of COMMAND_NAMES) {
    const line = row(source, command);
    for (const name of FLAG_NAMES) {
      for (const spelling of FLAGS[name].spellings) {
        const named = new RegExp(`\`${spelling}(?![\\w-])`).test(line);
        if (SPECS[command].flags.includes(name)) assert.ok(named, `the arena ${command} row does not name ${spelling}`);
        else assert.ok(!named, `the arena ${command} row names ${spelling}, which arena ${command} refuses`);
      }
    }
  }
});

test('a flag no command takes is named nowhere on the page', () => {
  const source = page();
  const taken = new Set(COMMAND_NAMES.flatMap((command) => SPECS[command].flags));
  for (const name of FLAG_NAMES) {
    if (taken.has(name)) continue;
    for (const spelling of FLAGS[name].spellings) {
      assert.ok(!new RegExp(`${spelling}(?![\\w-])`).test(source), `the page names ${spelling}, which every command refuses`);
    }
  }
});

test('every kind --strict holds is named on the line that names its command, and no other kind', () => {
  const source = page();
  for (const [command, kinds] of Object.entries(KINDS_BY_COMMAND)) {
    const line = source.split('\n').find((one) => one.startsWith(`| \`arena ${command} --strict\``));
    assert.ok(line, `the strict table has no row for arena ${command}`);
    for (const kind of kinds) assert.ok(line.includes(`\`${kind}\``), `the arena ${command} --strict row does not name ${kind}`);
    const cells = line.split('|').slice(2).join('|');
    for (const [, named] of cells.matchAll(/`([^`]+)`/g)) {
      assert.ok((kinds as readonly string[]).includes(named ?? ''), `the arena ${command} --strict row names ${named}, which arena ${command} does not hold`);
    }
  }
});

test('every rule --strict can name is on the rules row of its kind, and kind:rule is said', () => {
  const source = page();
  assert.ok(source.includes('`<kind>:<rule>`'), 'the page never says how a rule is named');
  for (const [kind, rules] of Object.entries(RULES_BY_KIND)) {
    const line = source.split('\n').find((one) => one.startsWith(`| \`${kind}\` |`));
    assert.ok(line, `the rules table has no row for ${kind}`);
    for (const rule of rules ?? []) assert.ok(line.includes(`\`${rule}\``), `the ${kind} row does not name ${rule}`);
    const cells = line.split('|').slice(2).join('|');
    for (const [, named] of cells.matchAll(/`([^`]+)`/g)) {
      assert.ok((rules ?? []).includes(named ?? ''), `the ${kind} row names ${named}, which ${kind} does not have`);
    }
  }
});

test('every arena <word> the page writes is a word the dispatch answers', () => {
  const named = code(page()).flatMap((text) => [...text.matchAll(/(?<![\w@/.:-])arena\s+([^\s`"',;)]+)/g)].map((match) => match[1] ?? ''));
  assert.ok(named.length > 0, 'the page writes no arena command at all');
  for (const word of named.filter((one) => !/^<\w+>$/.test(one))) assert.ok(ANSWERED.has(word), `the page writes arena ${word}, which the dispatch does not answer`);
});

const INIT_BLOCKS = [
  ['React', '@dravensoft/arena-react'],
  ['Angular', '@dravensoft/arena-angular'],
] as const;

function block(source: string, heading: string) {
  const at = source.indexOf(`## ${heading}`);
  assert.ok(at >= 0, `the page has no section "${heading}"`);
  const fence = /```json\n([\s\S]*?)```/.exec(source.slice(at));
  assert.ok(fence, `the section "${heading}" holds no JSON block`);
  return JSON.parse(fence[1] ?? '');
}

for (const [framework, name] of INIT_BLOCKS) {
  test(`the ${framework} JSON block is what arena init writes into {} on ${name}`, async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'arena-doc-init-'));
    writeFileSync(join(cwd, 'package.json'), '{}\n');
    const { io } = captureIo(cwd, { arena: hostRoot(name, '1.0.0') });
    assert.equal(await main(['init'], io), 0);
    const written = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
    assert.deepEqual(block(page(), `How do I wire it into a${framework === 'Angular' ? 'n' : ''} ${framework} build?`), written);
  });
}

type Run = { label: string; argv: string[]; cwd: string; environment: HostEnvironment };
type Cause = { code: 0 | 1 | 2; phrase: string; runs: () => Run[] };

const BROKEN = '{ "palettes": [], }';
const READING = ['build', 'check', 'audit', 'usage'] as const;

function environment(extra: HostEnvironment = {}): HostEnvironment {
  return { arena: null, packageName: '@dravensoft/arena-react', map: MAP, sheets: null, vocabulary: null,
    phosphor: phosphor().web, ...extra };
}

function at(label: string, argv: string[], cwd: string, extra: HostEnvironment = {}): Run {
  return { label, argv, cwd, environment: environment(extra) };
}

function brokenConfig() {
  const root = project(null);
  writeFileSync(join(root, 'arena.config.json'), BROKEN);
  return root;
}

const CAUSES: Cause[] = [
  { code: 0, phrase: 'The command did its job', runs: () => [
    at('build', ['build'], project()),
    at('check', ['check'], project()),
  ] },
  { code: 1, phrase: 'a config that parses and is invalid', runs: () => [
    at('check', ['check'], project({ ...readable, palettes: 7 })),
    at('build', ['build'], project({ ...readable, palettes: 7 })),
  ] },
  { code: 1, phrase: 'a `stylesheet` name the package does not ship', runs: () => [
    at('check', ['check'], project({ ...readable, stylesheet: { components: ['nope'] } }), { sheets: SHEETS as never }),
  ] },
  { code: 1, phrase: 'a report `--strict` holds', runs: () => [
    at('check', ['check', '--strict=glyph'], project(readable, { 'app.html': '<i class="ph-bold ph-nope"></i>' })),
    at('audit', ['audit', '--strict'], project(readable, { 'App.tsx': '<div style={{ color: "#b52a20" }} />' })),
  ] },
  { code: 1, phrase: '`arena doctor` exits 1 on anything that stops a build', runs: () => [
    at('a config it cannot read', ['doctor'], brokenConfig()),
    at('no Phosphor', ['doctor'], project(), { phosphor: null }),
    at('a missing --src', ['doctor', '--src', 'nowhere'], project()),
  ] },
  { code: 1, phrase: 'a sheet that is missing, stale or no longer produced', runs: () => {
    const orphan = project();
    writeFileSync(join(orphan, 'src', [...OUTPUT_SHEETS].find((one) => one.startsWith('plugin'))!), 'x');
    return [at('missing', ['doctor'], project()), at('orphan', ['doctor'], orphan)];
  } },
  { code: 2, phrase: 'an unknown, refused or repeated flag', runs: () => COMMAND_NAMES.flatMap((command) => [
    at(`${command} --bogus`, [command, '--bogus'], project()),
    ...SPECS[command].flags.filter((flag) => !FLAGS[flag].repeatable).map((flag) => {
      const spelling = FLAGS[flag].spellings[0]!;
      const once = FLAGS[flag].takes === 'path' || FLAGS[flag].takes === 'dir' ? [spelling, 'x'] : [spelling];
      return at(`${command} ${spelling} twice`, [command, ...once, ...once], project());
    }),
    ...(Object.keys(NEIGHBOURS[command]) as FlagName[])
      .map((flag) => at(`${command} ${FLAGS[flag].spellings[0]}`, [command, FLAGS[flag].spellings[0]!, 'x'], project())),
  ]) },
  { code: 2, phrase: 'a config it cannot read as JSON', runs: () => READING.flatMap((command) => [
    at(`${command} on a broken config`, [command], brokenConfig()),
    at(`${command} --config nope.json`, [command, '--config', 'nope.json'], project()),
  ]) },
  { code: 2, phrase: 'a missing `--src`', runs: () => READING.map((command) =>
    at(command, [command, '--src', 'nowhere'], project())) },
  { code: 2, phrase: 'Phosphor not installed', runs: () => [
    at('build', ['build'], project(), { phosphor: null }),
    at('check', ['check'], project(), { phosphor: null }),
  ] },
  { code: 2, phrase: 'a file it cannot write or delete', runs: () => {
    const build = project();
    writeFileSync(join(build, 'blocker'), 'a file');
    const init = project();
    writeFileSync(join(init, 'package.json'), '{}');
    writeFileSync(join(init, 'blocker'), 'a file');
    const clean = project();
    mkdirSync(join(clean, 'src', [...OUTPUT_SHEETS][0]!));
    return [
      at('build -o under a file', ['build', '-o', 'blocker/out'], build),
      at('init --config under a file', ['init', '--config', 'blocker/arena.json'], init,
        { arena: hostRoot('@dravensoft/arena-react', '1.0.0') }),
      at('clean over a directory', ['clean'], clean),
    ];
  } },
  { code: 2, phrase: '`arena init` with no `package.json`', runs: () => [
    at('init', ['init'], project(), { arena: hostRoot('@dravensoft/arena-react', '1.0.0') }),
  ] },
];

function exitRow(source: string, code: number) {
  const line = source.split('\n').find((one) => one.startsWith(`| \`${code}\` |`));
  assert.ok(line, `the exit-code table has no row for ${code}`);
  return line;
}

test('the exit-code table has a row for 0, 1 and 2 and no other code', () => {
  const codes = page().split('\n').map((line) => /^\| `(\d+)` \|/.exec(line)?.[1]).filter(Boolean);
  assert.deepEqual(codes, ['0', '1', '2']);
});

for (const cause of CAUSES) {
  test(`exit ${cause.code}: "${cause.phrase}" is on its row, and each run of it exits ${cause.code}`, async () => {
    assert.ok(exitRow(page(), cause.code).includes(cause.phrase), `the ${cause.code} row does not say ${cause.phrase}`);
    for (const run of cause.runs()) {
      const { io, out, err } = captureIo(run.cwd, run.environment);
      assert.equal(await main(run.argv, io), cause.code, `${run.label}:\n${[...out, ...err].join('\n')}`);
    }
  });
}
