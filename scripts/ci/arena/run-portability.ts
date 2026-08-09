/* The gates worth running on a second operating system, each with the reason it is here. The
 * full sweep is 52 gates and most of them judge text a platform cannot change, so paying macOS
 * minutes for all of them per pull request is a cost nobody keeps paying, and a nightly run is
 * where that belongs. What is left is the set whose ANSWER can differ by platform: a spawn, a
 * link, a path, a line ending, a Bun API, a real browser. Declared in TypeScript because a list
 * that lives in YAML is a list nothing tests, and printed with its reason, so a leg that skipped
 * something says which and why rather than reporting a confident pass over less. */

import { spawnSync } from 'node:child_process';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { GATES } from '../../check/arena/check-all.ts';

export const PORTABILITY_GATES: Record<string, string> = {
  'check:portability': 'the rules themselves, so a leg that runs nothing else still says whether one was broken',
  'check:consumer': 'spawns a resolved binary and builds a directory link into a fixture, which is a junction on Windows',
  'check:script-types': 'reads a compiler line-wise, which is where a CRLF from a Windows-built tsc lands',
  'check:generated': 'asks git what it tracks, and holds the rule that no tracked text file carries a CR',
  'check:skills': 'the same question over the consumer index, through a separate spawn',
  'check:graph': 'pathspecs and the fingerprint cache, which now discards a state file written on another machine',
  'check:intro': 'Bun.build, whose bundler resolves and emits paths of its own on every platform',
  'check:vendor': 'Bun.build again, over the React vendor chunks a browser then imports by URL',
  'check:demos': 'Bun.Transpiler, which is a Bun API and so a Bun-on-this-platform question',
  'check:cards': 'a real browser, found through the per-platform candidate list rather than a Linux path',
  'check:focus-trap': 'the same browser, plus native sequential focus, which is a platform behaviour',
  'check:playgrounds': 'the same browser, over every emitted page',
  'check:style-parity': 'the same browser, plus computed styles and emulated media',
};

export function unknownGates(names = Object.keys(PORTABILITY_GATES), gates = GATES) {
  const declared = new Set(gates.map((gate) => gate.name));
  return names.filter((name) => !declared.has(name));
}

export function unreasonedGates(names = Object.keys(PORTABILITY_GATES)) {
  return names.filter((name) => !PORTABILITY_GATES[name]);
}

export function runPortability(names = Object.keys(PORTABILITY_GATES)) {
  const unknown = unknownGates(names);
  if (unknown.length > 0) {
    console.error(`run-portability: ${unknown.join(', ')} is not a declared gate; the list is stale`);
    return 1;
  }
  const unreasoned = unreasonedGates(names);
  if (unreasoned.length > 0) {
    console.error(`run-portability: ${unreasoned.join(', ')} carries no reason, and a leg that `
      + 'cannot say why it ran something cannot say what it proved');
    return 1;
  }

  const failed: string[] = [];
  for (const name of names) {
    console.log(`\n> ${name}, because ${PORTABILITY_GATES[name]}\n`);
    const r = spawnSync(process.execPath, ['run', name], { stdio: 'inherit', cwd: repoRoot });
    if (r.error || r.status !== 0) failed.push(name);
  }

  console.log(`\nrun-portability: ${names.length - failed.length}/${names.length} gate(s) passed`);
  if (failed.length > 0) console.error(`run-portability: ${failed.join(', ')} failed`);
  return failed.length === 0 ? 0 : 1;
}

if (isMainModule(import.meta.url)) process.exit(runPortability());
