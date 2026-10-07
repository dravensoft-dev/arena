/* arena init: copies the example config the package carries and wires the scripts that keep the
 * sheets current. It adds what is absent and never rewrites what a project already wrote. */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DEFAULT_CONFIG, commandOptions, parseArgs } from './args.ts';
import { hostManifest, resolveEnvironment } from './host.ts';
import { under, voice } from './io.ts';
import type { Io } from './io.ts';

const LAYER_SCRIPTS: Record<string, string[]> = {
  '@dravensoft/arena-react': ['prebuild', 'predev'],
  '@dravensoft/arena-angular': ['prebuild', 'prestart'],
};

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function run(argv: string[], io: Io): number {
  const options = commandOptions('init', argv, io);
  if (typeof options === 'number') return options;
  const say = voice(io, 'init');
  const typed = parseArgs('init', argv);
  const typedConfig = typed.kind === 'options' ? typed.options.config : DEFAULT_CONFIG;
  if (/["$`%!\\]/.test(typedConfig)) {
    say.err(`--config ${typedConfig} holds ", $, \`, %, ! or \\, which a package.json script cannot quote the same way under sh and cmd.exe; pick a path without them`);
    return 2;
  }
  const env = resolveEnvironment(io.environment);
  if (env.arena === null) {
    say.err('arena init copies the example config an Arena package carries, and no Arena package is around this command');
    return 2;
  }
  const name = hostManifest(env.arena)?.name ?? '';
  const layer = LAYER_SCRIPTS[name];
  if (!layer) {
    say.err(`${name} is not a package arena init knows how to wire`);
    return 2;
  }
  const example = under(env.arena, 'arena.config.example.json');
  if (!existsSync(example)) {
    say.err(`${example} is not there`);
    return 2;
  }
  const pkgPath = under(io.cwd, 'package.json');
  if (!existsSync(pkgPath)) {
    say.err(`no package.json in ${io.cwd}; arena init adds scripts to the one your project has`);
    return 2;
  }
  const read = readFileSync(pkgPath, 'utf8');
  const bom = read.startsWith('\uFEFF') ? '\uFEFF' : '';
  const raw = read.slice(bom.length);
  let pkg: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      say.err(`cannot read ${pkgPath}: it holds ${Array.isArray(parsed) ? 'an array' : 'no JSON object'}`);
      return 2;
    }
    pkg = parsed;
  } catch (error) {
    say.err(`cannot read ${pkgPath}: ${message(error)}`);
    return 2;
  }
  if ('scripts' in pkg && (pkg.scripts === null || typeof pkg.scripts !== 'object' || Array.isArray(pkg.scripts))) {
    say.err(`"scripts" in ${pkgPath} is not an object, so init cannot add to it`);
    return 2;
  }

  let wroteConfig = false;
  if (!existsSync(options.config)) {
    try {
      mkdirSync(dirname(options.config), { recursive: true });
      copyFileSync(example, options.config);
    } catch (error) {
      say.err(`cannot write ${options.config}: ${message(error)}`);
      return 2;
    }
    say.out(`wrote ${options.config}, a copy of the example this package carries`);
    wroteConfig = true;
  }

  const quoted = /^[\w./@:+,=-]+$/.test(typedConfig) ? typedConfig : `"${typedConfig}"`;
  const suffix = typedConfig === DEFAULT_CONFIG ? '' : ` --config ${quoted}`;
  const wanted: [string, string][] = [
    ...layer.map((script): [string, string] => [script, `arena build${suffix}`]),
    ['arena:check', `arena check --strict=components,glyph,markers${suffix}`],
    ['arena:audit', `arena audit --strict${suffix}`],
  ];

  const scripts = (pkg.scripts ?? {}) as Record<string, string>;
  const added: string[] = [];
  for (const [script, text] of wanted) {
    const value = scripts[script];
    if (value === undefined) {
      scripts[script] = text;
      added.push(script);
    } else if (value === text) {
      continue;
    } else if (layer.includes(script)) {
      if (!/\barena build\b/.test(value)) {
        say.out(`package.json already runs "${value}" as ${script}, so init left it; make it: arena build${suffix} && ${value}`);
      }
    } else {
      say.out(`kept ${script}, which reads "${value}"`);
    }
  }

  if (added.length > 0) {
    pkg.scripts = scripts;
    const indent = /^([ \t]+)"/m.exec(raw)?.[1] ?? '  ';
    const text = JSON.stringify(pkg, null, indent) + (raw.endsWith('\n') ? '\n' : '');
    try {
      writeFileSync(pkgPath, bom + (raw.includes('\r\n') ? text.replace(/\n/g, '\r\n') : text));
    } catch (error) {
      say.err(`cannot write ${pkgPath}: ${message(error)}`);
      return 2;
    }
    say.out(`added ${added.join(', ')} to package.json`);
  }
  if (!wroteConfig && added.length === 0) say.out('nothing to do');
  return 0;
}
