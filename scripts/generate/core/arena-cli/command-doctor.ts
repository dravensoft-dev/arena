/* arena doctor: it compares the tree with what arena build would leave and names every difference,
 * then the environment around it. It writes nothing. A plan fatal, a missing, stale or orphan sheet
 * and a held environment report exit 1; notes never change the exit. */
import { existsSync, readFileSync } from 'node:fs';
import { commandOptions } from './args.ts';
import { under, voice } from './io.ts';
import type { Io } from './io.ts';
import { hostManifest, resolveEnvironment } from './host.ts';
import { plan, sheetStates } from './plan.ts';
import { heldMessage, report, reported } from './reports.ts';
import type { Report } from './reports.ts';
import { join } from 'node:path';

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

function ignoresSheets(cwd: string) {
  const file = under(cwd, '.gitignore');
  if (!existsSync(file)) return false;
  return readFileSync(file, 'utf8').split(/\r?\n/).map((line) => line.trim()).some((line) => {
    if (line === '' || line.startsWith('#') || line.startsWith('!')) return false;
    const last = line.split('/').pop();
    return last === '*.generated.css' || last === '*.generated.*';
  });
}

export function run(argv: string[], io: Io): number {
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

  if (env.phosphor) say.out(`phosphor at ${env.phosphor}`);

  const planned = plan(options, env);
  if (planned.fatal.length) {
    problems++;
    for (const line of planned.fatal) say.err(line);
    say.err('sheets not compared, since nothing can be built yet');
  } else {
    say.out(`config ${options.config} is valid`);
    for (const { path, state } of sheetStates(planned.outputs)) {
      if (state === 'current') say.out(`${path} is current`);
      else {
        problems++;
        say.err(`${path} is ${state}; arena build ${state === 'missing' ? 'writes' : 'rewrites'} it`);
      }
    }
    for (const name of planned.orphans) {
      problems++;
      say.err(`${join(options.out, name)} is a sheet this config no longer produces; arena build removes it`);
    }
  }

  environment.push(...planned.reports.filter((one) => one.kind === 'environment'));
  for (const one of environment) say.err(`[${one.kind}] ${one.message}`);
  const others = planned.reports.filter((one) => one.kind !== 'environment').length;
  if (others > 0) say.err(`${others} report(s): arena check names them`);

  if (!runsBuild(io.cwd)) {
    say.out('note: no script in package.json runs arena build, so the sheets go stale as the config and sources change; arena init wires one');
  }
  if (!ignoresSheets(io.cwd)) {
    say.out('note: .gitignore does not cover *.generated.css; add that line, since every sheet is rebuilt from the config and your sources');
  }

  if (problems > 0) return 1;
  const held = reported(environment, options.strict);
  if (held.length === 0) return 0;
  say.err(heldMessage(options.strict, held));
  return 1;
}
