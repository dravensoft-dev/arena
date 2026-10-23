/* arena doctor: it compares the tree with what arena build would leave and names every difference,
 * then the environment around it. It writes nothing. A plan fatal, a missing, stale or orphan file
 * (a sheet, the sprite or its module) and a held environment report exit 1; notes never change the exit.
 * unignoredOutputs gives null for an empty list, because git was asked about nothing and an empty answer would read as every output ignored. */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { commandOptions } from './args.ts';
import { under, voice } from './io.ts';
import { relPosix } from './posix.ts';
import type { Io } from './io.ts';
import { hostManifest, resolveEnvironment } from './host.ts';
import { plan, sheetStates } from './plan.ts';
import { readSources } from './sources.ts';
import { PACKAGE_SHEET } from './sheets.ts';
import { heldMessage, report, reported } from './reports.ts';
import type { Report } from './reports.ts';

function triple(text: string): [number, number, number] | null {
  const found = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(text);
  return found ? [Number(found[1]), Number(found[2] ?? 0), Number(found[3] ?? 0)] : null;
}

export function satisfies(version: string, range: string): boolean | null {
  const floor = /^>=\s*(\d+(?:\.\d+){0,2})$/.exec(range.trim());
  const have = triple(version.trim().replace(/^v/, ''));
  const want = floor ? triple(floor[1] as string) : null;
  if (!have || !want) return null;
  for (let at = 0; at < 3; at++) {
    if (have[at] !== want[at]) return (have[at] as number) > (want[at] as number);
  }
  return true;
}

function runsBuild(cwd: string) {
  try {
    const { scripts } = JSON.parse(readFileSync(under(cwd, 'package.json'), 'utf8'));
    return Object.values(scripts ?? {}).some((value) => typeof value === 'string' && /\barena build\b/.test(value));
  } catch {
    return false;
  }
}

export function unignoredOutputs(cwd: string, paths: string[]): string[] | null {
  if (paths.length === 0) return null;
  const asked = spawnSync('git', ['-C', cwd, 'check-ignore', '-z', '--stdin'], { encoding: 'utf8', input: `${paths.join('\0')}\0` });
  if (asked.error || (asked.status !== 0 && asked.status !== 1)) return null;
  const ignored = new Set(asked.stdout.split('\0').filter((one) => one !== ''));
  return paths.filter((one) => !ignored.has(one));
}

function ignoresSheets(cwd: string) {
  const file = under(cwd, '.gitignore');
  if (!existsSync(file)) return false;
  return readFileSync(file, 'utf8').split(/\r?\n/).map((line) => line.trim()).some((line) => {
    if (line === '' || line.startsWith('#') || line.startsWith('!')) return false;
    const last = line.split('/').pop();
    return last === '*.generated.css' || last === '*.generated.*';
  });
}

export async function run(argv: string[], io: Io): Promise<number> {
  const options = commandOptions('doctor', argv, io);
  if (typeof options === 'number') return options;
  const say = voice(io, 'doctor');
  const env = resolveEnvironment(io.environment);
  const environment: Report[] = [];
  let problems = 0;

  const manifest = hostManifest(env.arena);
  if (manifest) say.out(`package ${manifest.name} ${manifest.version}`);
  else environment.push(report('environment', 'not running from inside an Arena package, so no package or version can be named'));

  const range = manifest?.engines?.node;
  if (range === undefined) say.out(`node ${io.node}`);
  else {
    const ok = satisfies(io.node, range);
    if (ok === true) say.out(`node ${io.node} satisfies ${range}`);
    else if (ok === false) environment.push(report('environment', `node ${io.node} does not satisfy engines.node ${range}`));
    else environment.push(report('environment', `engines.node reads ${range}, which this command does not compare`));
  }

  if (env.phosphor) say.out(`@phosphor-icons/core at ${env.phosphor}`);

  const planned = await plan(options, env);
  if (planned.fatal.length) {
    problems++;
    for (const line of planned.fatal) say.err(line);
    say.err('sheets not compared, since nothing can be built yet');
  } else {
    say.out(`config ${options.config} is valid`);
    for (const { path, state } of sheetStates([...planned.outputs, ...planned.binaries])) {
      if (state === 'current') say.out(`${path} is current`);
      else {
        problems++;
        say.err(`${path} is ${state}; arena build ${state === 'missing' ? 'writes' : 'rewrites'} it`);
      }
    }
    for (const name of planned.orphans) {
      problems++;
      say.err(`${join(options.out, name)} is a file this config does not produce; arena build removes it`);
    }
  }

  environment.push(...planned.reports.filter((one) => one.kind === 'environment'));
  for (const one of environment) say.err(`[${one.kind}] ${one.message}`);
  const others = planned.reports.filter((one) => one.kind !== 'environment').length;
  if (others > 0) say.err(`${others} report(s): arena check names them`);

  if (!planned.fatal.length && planned.outputs.some((one) => one.name === PACKAGE_SHEET)
    && !readSources(options.paths).some((text) => text.includes(PACKAGE_SHEET))) {
    say.out(`note: no source imports ${PACKAGE_SHEET}, so the app renders with no Arena CSS; add @import './${PACKAGE_SHEET}'; before the import of arena.generated.css, in the stylesheet beside it`);
  }
  if (!runsBuild(io.cwd)) {
    say.out('note: no script in package.json runs arena build, so the sheets go stale as the config and sources change; arena init wires one');
  }
  const asked = planned.fatal.length ? [] : [...planned.outputs, ...planned.binaries].map((one) => relPosix(io.cwd, one.path));
  const unignored = unignoredOutputs(io.cwd, asked);
  if (unignored !== null) {
    if (unignored.length > 0) {
      say.out(`note: git does not ignore ${unignored.join(', ')}; every file arena build writes is rebuilt from the config and your sources, so add them to .gitignore`);
    }
  } else if (!ignoresSheets(io.cwd)) {
    say.out('note: .gitignore does not cover *.generated.css; add that line, with icons-*.svg and <stem>-*.woff2 for the sprite and the cut fonts, since every file the build writes is rebuilt from the config and your sources');
  }

  if (problems > 0) return 1;
  const held = reported(environment, options.strict);
  if (held.length === 0) return 0;
  say.err(heldMessage(options.strict, held));
  return 1;
}
