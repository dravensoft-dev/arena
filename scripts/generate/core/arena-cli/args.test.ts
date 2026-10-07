// The argument grammar of every arena subcommand: flags, strict sets, neighbour messages and usage text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import {
  COMMAND_NAMES, FLAG_NAMES, FLAGS, SPECS, NEIGHBOURS, parseArgs, usageOf, commandOptions,
  DEFAULT_CONFIG, DEFAULT_OUT, type Command, type Options,
} from './args.ts';
import { KINDS_BY_COMMAND, type StrictCommand } from './reports.ts';
import { DEFAULT_SOURCE } from './sources.ts';
import { captureIo } from './cli-fixtures.ts';

const options = (command: Command, argv: string[]): Options => {
  const parsed = parseArgs(command, argv);
  assert.equal(parsed.kind, 'options', JSON.stringify(parsed));
  return (parsed as { options: Options }).options;
};
const error = (command: Command, argv: string[]) => {
  const parsed = parseArgs(command, argv);
  assert.equal(parsed.kind, 'error', JSON.stringify(parsed));
  return (parsed as { error: string }).error;
};
const takes = (command: Command, flag: (typeof FLAG_NAMES)[number]) => SPECS[command].flags.includes(flag);
const holding = ['check', 'audit', 'doctor'] as const satisfies readonly StrictCommand[];

test("every command's defaults: config, src, out, importHeader, watch, strict", () => {
  for (const command of COMMAND_NAMES) {
    assert.deepEqual(options(command, []), {
      config: DEFAULT_CONFIG, paths: [DEFAULT_SOURCE], out: DEFAULT_OUT,
      importHeader: true, watch: false, strict: [],
    }, command);
  }
});

test('--config, --src, -o and --out take their value either way, and --src repeats', () => {
  assert.equal(options('build', ['--config', 'a.json']).config, 'a.json');
  assert.equal(options('build', ['--config=a.json']).config, 'a.json');
  assert.equal(options('build', ['--config', 'a', '--config', 'b']).config, 'b');
  assert.deepEqual(options('build', ['--src', 'a', '--src=b']).paths, ['a', 'b']);
  assert.equal(options('build', ['-o', 'x']).out, 'x');
  assert.equal(options('build', ['--out', 'x']).out, 'x');
  assert.equal(options('build', ['--out=x']).out, 'x');
  assert.equal(options('clean', ['-o', 'x']).out, 'x');
  assert.equal(options('build', ['--watch', '--no-import']).watch, true);
  assert.equal(options('build', ['--no-import']).importHeader, false);
});

test('a path flag with nothing after it, or an empty `=`, names the value it needs', () => {
  assert.equal(error('build', ['--config']), '--config needs a path');
  assert.equal(error('build', ['--src']), '--src needs a path');
  assert.equal(error('build', ['-o']), '-o needs a directory');
  assert.equal(error('build', ['--out']), '--out needs a directory');
  assert.equal(error('build', ['--config=']), '--config needs a path');
  assert.equal(error('build', ['--src=']), '--src needs a path');
  assert.equal(error('build', ['--out=']), '--out needs a directory');
});

test('a valueless flag given `=` is refused', () => {
  assert.equal(error('build', ['--watch=1']), '--watch takes no value');
  assert.equal(error('build', ['--no-import=1']), '--no-import takes no value');
});

test("bare --strict holds exactly the command's set, for check, audit and doctor", () => {
  for (const command of holding) {
    assert.deepEqual(options(command, ['--strict']).strict, [...KINDS_BY_COMMAND[command]], command);
  }
  assert.deepEqual(options('check', ['--strict=glyph,contrast']).strict, ['glyph', 'contrast']);
});

test('--strict= holds nothing', () => {
  for (const command of holding) assert.deepEqual(options(command, ['--strict=']).strict, [], command);
});

test('--strict with a kind of another command names that command', () => {
  assert.equal(error('check', ['--strict=audit']),
    '--strict=audit belongs to arena audit; arena check holds components, contrast, ramp, weight, glyph, markers');
  assert.equal(error('audit', ['--strict=contrast']),
    '--strict=contrast belongs to arena check; arena audit holds audit, restated');
  assert.equal(error('doctor', ['--strict=contrast']),
    '--strict=contrast belongs to arena check; arena doctor holds environment');
});

test('--strict=wash says it is never held', () => {
  assert.equal(error('check', ['--strict=wash']),
    'wash is reported and never held, since no configuration can clear it; arena check holds components, contrast, ramp, weight, glyph, markers');
});

test('--strict with an unknown kind lists what the command holds', () => {
  assert.equal(error('audit', ['--strict=nonsense']),
    '--strict does not report on nonsense; arena audit holds audit, restated');
  assert.equal(error('check', ['--strict=glyph,nonsense,audit']),
    '--strict does not report on nonsense; arena check holds components, contrast, ramp, weight, glyph, markers');
});

test('--help and -h win over anything after them, on every command', () => {
  for (const command of COMMAND_NAMES) {
    assert.deepEqual(parseArgs(command, ['--help', '--bogus']), { kind: 'help' });
    assert.deepEqual(parseArgs(command, ['-h', 'stray']), { kind: 'help' });
  }
});

test('an unknown flag is refused by name, and a positional is refused', () => {
  assert.equal(error('build', ['--bogus']), 'unknown flag: --bogus');
  assert.equal(error('build', ['-x']), 'unknown flag: -x');
  assert.equal(error('build', ['src']),
    'unexpected argument: src; every path this command takes is named by a flag');
});

test('NEIGHBOURS covers exactly the flags each command refuses', () => {
  for (const command of COMMAND_NAMES) {
    const refused = FLAG_NAMES.filter((flag) => !takes(command, flag));
    assert.deepEqual(Object.keys(NEIGHBOURS[command]).sort(), [...refused].sort(), command);
    for (const flag of refused) {
      const typed = FLAGS[flag].spellings[0]!;
      const argv = FLAGS[flag].takes === 'none' || FLAGS[flag].takes === 'kinds' ? [typed] : [typed, 'x'];
      assert.equal(error(command, argv), `${typed} is not a flag of arena ${command}; ${NEIGHBOURS[command][flag]}`);
    }
  }
});

test('a refused flag is named as the user typed it, without its value', () => {
  assert.equal(error('check', ['--out=lib']), '--out is not a flag of arena check; '
    + NEIGHBOURS.check.out);
  assert.equal(error('check', ['-o', 'lib']), '-o is not a flag of arena check; '
    + NEIGHBOURS.check.out);
  assert.equal(error('usage', ['--strict=glyph']), '--strict is not a flag of arena usage; '
    + NEIGHBOURS.usage.strict);
});

test('every NEIGHBOURS message names a real `arena <command>`', () => {
  for (const command of COMMAND_NAMES) {
    for (const message of Object.values(NEIGHBOURS[command])) {
      const named = [...message.matchAll(/arena (\w+)/g)].map((match) => match[1]);
      assert.ok(named.length > 0, message);
      for (const one of named) assert.ok((COMMAND_NAMES as readonly string[]).includes(one!), `${one} in ${message}`);
    }
  }
});

test("build --audit points at arena audit, build --undrawn at arena usage, build --strict at arena check", () => {
  assert.match(error('build', ['--audit']), /`arena audit`/);
  assert.match(error('build', ['--undrawn']), /`arena usage`/);
  assert.match(error('build', ['--strict']), /`arena check --strict`/);
});

test('usageOf lists each flag of the spec and no other, and the strict line lists the command\'s kinds', () => {
  for (const command of COMMAND_NAMES) {
    const text = usageOf(command);
    assert.ok(text.startsWith(`usage: arena ${command}`), command);
    assert.ok(text.includes(SPECS[command].summary), command);
    for (const flag of FLAG_NAMES) {
      for (const spelling of FLAGS[flag].spellings) {
        const present = new RegExp(`(^|[\\s\\[,])${spelling}($|[\\s\\[\\]=,|])`, 'm').test(text);
        assert.equal(present, takes(command, flag), `${command} ${spelling}`);
      }
    }
    if (command in KINDS_BY_COMMAND) {
      const line = text.split('\n').find((one) => one.includes('--strict') && !one.startsWith('usage'))!;
      assert.ok(line.includes(KINDS_BY_COMMAND[command as StrictCommand].join(', ')), command);
    }
  }
});

test('commandOptions prints usage on help with 0, prints the error and usage on stderr with 2, and roots paths at cwd', () => {
  const root = join('/tmp', 'arena-args');
  const help = captureIo(root);
  assert.equal(commandOptions('build', ['--help'], help.io), 0);
  assert.deepEqual(help.out, [usageOf('build')]);
  assert.deepEqual(help.err, []);

  const bad = captureIo(root);
  assert.equal(commandOptions('build', ['--bogus'], bad.io), 2);
  assert.deepEqual(bad.err, ['arena build: unknown flag: --bogus', '', usageOf('build')]);
  assert.deepEqual(bad.out, []);

  const ok = captureIo(root);
  const got = commandOptions('build', ['--config', 'c.json', '--src', 'a', '--src', join(root, 'b'), '-o', 'lib'], ok.io);
  assert.deepEqual(got, {
    config: join(root, 'c.json'), paths: [join(root, 'a'), join(root, 'b')], out: join(root, 'lib'),
    importHeader: true, watch: false, strict: [],
  });
  const defaults = commandOptions('check', [], captureIo(root).io) as Options;
  assert.deepEqual(defaults.paths, [join(root, DEFAULT_SOURCE)]);
});
