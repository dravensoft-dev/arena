/* The grammar of every arena subcommand, declared once: which flags exist, which command takes
 * which, what a refused flag points at, and the usage text derived from all of it. A command
 * calls commandOptions and gets either its options or an exit code. */
import { KINDS_BY_COMMAND, holder, type StrictCommand, type StrictKind } from './reports.ts';
import { DEFAULT_SOURCE } from './sources.ts';
import { under, type Io } from './io.ts';

export const COMMAND_NAMES = ['build', 'check', 'audit', 'usage', 'init', 'doctor', 'clean'] as const;
export type Command = (typeof COMMAND_NAMES)[number];

export const FLAG_NAMES = ['config', 'src', 'out', 'no-import', 'watch', 'strict', 'audit', 'undrawn'] as const;
export type FlagName = (typeof FLAG_NAMES)[number];

export type FlagSpec = {
  spellings: readonly string[];
  takes: 'path' | 'dir' | 'none' | 'kinds';
  repeatable: boolean;
  help: string;
};

export const FLAGS: Record<FlagName, FlagSpec> = {
  config: { spellings: ['--config'], takes: 'path', repeatable: false, help: 'the config file (default arena.config.json)' },
  src: { spellings: ['--src'], takes: 'path', repeatable: true, help: 'a source file or directory to read (default src, repeatable)' },
  out: { spellings: ['-o', '--out'], takes: 'dir', repeatable: false, help: 'the directory the sheets are written to (default src)' },
  'no-import': { spellings: ['--no-import'], takes: 'none', repeatable: false, help: 'leave the package import out of the theme sheet' },
  watch: { spellings: ['--watch'], takes: 'none', repeatable: false, help: 'rebuild the sheets whenever the config or a source changes' },
  strict: { spellings: ['--strict'], takes: 'kinds', repeatable: false, help: 'exit 1 on a report of these kinds (all of them when no list is given)' },
  audit: { spellings: ['--audit'], takes: 'none', repeatable: false, help: 'accepted by no command' },
  undrawn: { spellings: ['--undrawn'], takes: 'none', repeatable: false, help: 'accepted by no command' },
};

export type CommandSpec = { summary: string; flags: readonly FlagName[] };

export const SPECS: Record<Command, CommandSpec> = {
  build: { summary: 'write the theme, icon and plugin sheets from your config and sources', flags: ['config', 'src', 'out', 'no-import', 'watch'] },
  check: { summary: 'report what your config and sources ask of the language', flags: ['config', 'src', 'strict'] },
  audit: { summary: 'read your sources and style plugins against the rules of the language', flags: ['config', 'src', 'strict'] },
  usage: { summary: 'name the components you draw nowhere and the parts your plugins paint', flags: ['config', 'src'] },
  init: { summary: 'wire the config and the scripts into this project', flags: ['config'] },
  doctor: { summary: 'say whether this project is set up and its sheets are current', flags: ['config', 'src', 'out', 'no-import', 'strict'] },
  clean: { summary: 'delete the sheets arena build writes', flags: ['out'] },
};

export const DEFAULT_CONFIG = 'arena.config.json';
export const DEFAULT_OUT = 'src';

export type Options = {
  config: string;
  paths: string[];
  out: string;
  importHeader: boolean;
  watch: boolean;
  strict: StrictKind[];
};

export type Parsed =
  | { kind: 'help' }
  | { kind: 'error'; error: string }
  | { kind: 'options'; options: Options };

const A = '`arena audit` reads your sources against the rules of the language';
const U = '`arena usage` names the components your sources draw nowhere';
const W = '`arena build --watch` rebuilds the sheets as you edit';
const quiet = (command: string) => ({
  out: `arena ${command} writes nothing; \`arena build -o\` names where the sheets go`,
  'no-import': `arena ${command} writes nothing; \`arena build --no-import\` drops the package import from the theme sheet`,
});

export const NEIGHBOURS: Record<Command, Partial<Record<FlagName, string>>> = {
  build: {
    strict: 'a build holds no report; `arena check --strict` holds the ones it counts',
    audit: A,
    undrawn: U,
  },
  check: {
    ...quiet('check'),
    watch: W,
    audit: A,
    undrawn: U,
  },
  audit: {
    ...quiet('audit'),
    watch: W,
    audit: 'this is `arena audit` already, so drop the flag',
    undrawn: U,
  },
  usage: {
    ...quiet('usage'),
    watch: W,
    strict: 'arena usage reports nothing a project fixes; `arena check --strict` and `arena audit --strict` hold what does',
    audit: A,
    undrawn: 'this is `arena usage` already, so drop the flag',
  },
  init: {
    src: 'arena init reads no sources; the scripts it writes run `arena build`, which takes --src',
    out: 'arena init writes the config and the scripts; add -o to the `arena build` script it writes',
    'no-import': 'arena init writes the config and the scripts; add --no-import to the `arena build` script it writes',
    watch: W,
    strict: 'arena init writes `arena:check` and `arena:audit`, which carry --strict; run `arena check --strict`',
    audit: A,
    undrawn: U,
  },
  doctor: {
    watch: W,
    audit: A,
    undrawn: U,
  },
  clean: {
    config: 'arena clean reads no config; it deletes the sheets `arena build` writes, by name, inside -o',
    src: 'arena clean reads no sources; it deletes the sheets `arena build` writes, by name, inside -o',
    'no-import': 'arena clean only deletes; `arena build --no-import` drops the package import from the theme sheet',
    watch: W,
    strict: 'arena clean reports nothing; `arena check --strict` holds the reports a build counts',
    audit: A,
    undrawn: U,
  },
};

export function strictKinds(command: StrictCommand, value: string): { kinds: StrictKind[] } | { error: string } {
  const held = KINDS_BY_COMMAND[command] as readonly StrictKind[];
  const list = held.join(', ');
  const named = value.split(',').map((one) => one.trim()).filter(Boolean);
  if (named.length === 0) return { error: `--strict= names no kind; arena ${command} holds ${list}` };
  for (const name of named) {
    if (name === 'wash') {
      return { error: `wash is reported and never held, since no configuration can clear it; arena ${command} holds ${list}` };
    }
    if (held.includes(name as StrictKind)) continue;
    const other = holder(name);
    if (other) return { error: `--strict=${name} belongs to arena ${other}; arena ${command} holds ${list}` };
    return { error: `--strict does not report on ${name}; arena ${command} holds ${list}` };
  }
  return { kinds: named as StrictKind[] };
}

const NEEDS = { path: 'a path', dir: 'a directory' } as const;

function matchFlag(token: string): { name: FlagName; spelling: string; value: string | null } | null {
  for (const name of FLAG_NAMES) {
    for (const spelling of FLAGS[name].spellings) {
      if (token === spelling) return { name, spelling, value: null };
      if (spelling.startsWith('--') && token.startsWith(`${spelling}=`)) {
        return { name, spelling, value: token.split('=').slice(1).join('=') };
      }
    }
  }
  return null;
}

export function parseArgs(command: Command, argv: string[]): Parsed {
  const spec = SPECS[command];
  const options: Options = {
    config: DEFAULT_CONFIG, paths: [], out: DEFAULT_OUT, importHeader: true, watch: false, strict: [],
  };
  const given = new Set<FlagName>();
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;
    if (token === '--help' || token === '-h') return { kind: 'help' };
    const hit = matchFlag(token);
    if (!hit) {
      if (token.startsWith('-')) return { kind: 'error', error: `unknown flag: ${token}` };
      return { kind: 'error', error: `unexpected argument: ${token}; every path this command takes is named by a flag` };
    }
    const flag = FLAGS[hit.name];
    if (!spec.flags.includes(hit.name)) {
      return { kind: 'error', error: `${hit.spelling} is not a flag of arena ${command}; ${NEIGHBOURS[command][hit.name]}` };
    }
    if (given.has(hit.name) && !flag.repeatable) {
      return { kind: 'error', error: `${hit.spelling} is given twice; arena ${command} takes it once` };
    }
    given.add(hit.name);
    if (flag.takes === 'none') {
      if (hit.value !== null) return { kind: 'error', error: `${hit.spelling} takes no value` };
      if (hit.name === 'watch') options.watch = true;
      else options.importHeader = false;
      continue;
    }
    if (flag.takes === 'kinds') {
      if (hit.value === null) {
        options.strict = [...KINDS_BY_COMMAND[command as StrictCommand]];
        continue;
      }
      const named = strictKinds(command as StrictCommand, hit.value);
      if ('error' in named) return { kind: 'error', error: named.error };
      options.strict = named.kinds;
      continue;
    }
    const value = hit.value ?? argv[++i];
    if (!value || (hit.value === null && value.startsWith('-'))) return { kind: 'error', error: `${hit.spelling} needs ${NEEDS[flag.takes]}` };
    if (hit.name === 'config') options.config = value;
    else if (hit.name === 'out') options.out = value;
    else options.paths.push(value);
  }
  if (options.paths.length === 0) options.paths.push(DEFAULT_SOURCE);
  return { kind: 'options', options };
}

function placeholder(flag: FlagSpec) {
  if (flag.takes === 'path') return '<path>';
  if (flag.takes === 'dir') return '<dir>';
  return '';
}

export function usageOf(command: Command) {
  const spec = SPECS[command];
  const heads = spec.flags.map((name) => {
    const flag = FLAGS[name];
    const spelling = [...flag.spellings].sort((a, b) => b.length - a.length)[0]!;
    if (flag.takes === 'kinds') return `[${spelling}[=<kind>,...]]`;
    if (flag.takes === 'none') return `[${spelling}]`;
    return `[${spelling} ${placeholder(flag)}${flag.repeatable ? '...' : ''}]`;
  });
  const lines = spec.flags.map((name) => {
    const flag = FLAGS[name];
    const spellings = flag.spellings.join(', ');
    const head = flag.takes === 'kinds' ? `${spellings}[=<kind>,...]`
      : flag.takes === 'none' ? spellings : `${spellings} ${placeholder(flag)}`;
    const help = flag.takes === 'kinds'
      ? `exit 1 on a report of these kinds: ${KINDS_BY_COMMAND[command as StrictCommand].join(', ')} (all of them when no list is given)`
      : flag.help;
    return `  ${head}  ${help}`;
  });
  return [`usage: arena ${command}${heads.length ? ` ${heads.join(' ')}` : ''}`, '', spec.summary, '', ...lines].join('\n');
}

export function commandOptions(command: Command, argv: string[], io: Io): Options | number {
  const parsed = parseArgs(command, argv);
  if (parsed.kind === 'help') {
    io.out(usageOf(command));
    return 0;
  }
  if (parsed.kind === 'error') {
    io.err(`arena ${command}: ${parsed.error}`);
    io.err('');
    io.err(usageOf(command));
    return 2;
  }
  const { options } = parsed;
  return {
    ...options,
    config: under(io.cwd, options.config),
    out: under(io.cwd, options.out),
    paths: options.paths.map((path) => under(io.cwd, path)),
  };
}
