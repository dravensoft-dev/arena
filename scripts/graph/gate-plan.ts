/* What check-all asks the graph, kept here rather than there so the runner stays the single
 * authority for how the suite is invoked and nothing else. A gate that declares no node is not in
 * the answer at all, which is what makes adoption safe: an undeclared gate runs every time, and
 * nothing has to be listed for that to be true. Most gates write nothing, so the value measured
 * before running one is the value after and a second measurement is waste; one that declares
 * writes is measured again, the rule the build follows, and no gate declares one today.
 * Only a pass records: exit 2 is a SKIP, and a SKIP written down as
 * green is a gate that never runs again on a machine that cannot run it. */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../lib/arena/repo-root.ts';
import { needsOf, topoOrder } from './graph.ts';
import { allNodes } from './nodes.ts';
import { stampAll, universe } from './inputs.ts';
import { fingerprintOne } from './fingerprint.ts';
import type { Fingerprint } from './fingerprint.ts';
import { forget, readFiles, readState, recordGreen, writeFiles, writeState } from './state.ts';
import { decide } from './plan.ts';

export { shortFingerprint } from './plan.ts';

export async function gateDecisions(names: string[], force: boolean, root = repoRoot) {
  const wanted = new Set(names);
  const collected = await allNodes(root);
  const needs = needsOf(collected.nodes);
  const state = readState(root);
  const onDisk = (path: string) => existsSync(join(root, path));

  let paths = universe(root);
  let stamps = stampAll(root, paths, readFiles(root));
  const upstream = new Map([...state].map(([name, entry]) => [name, entry.fingerprint] as const));
  const measure = () => ({ declaredIn: collected.declaredIn, root, paths, stamps, needs, upstream: new Map(upstream) });

  const decisions = new Map<string, { run: boolean; reason: string | null; fingerprint: string }>();
  const measured = new Map<string, Fingerprint>();
  const byName = new Map(collected.nodes.map((node) => [node.name, node]));

  for (const node of topoOrder(collected.nodes)) {
    const print = fingerprintOne(node, measure());
    measured.set(node.name, print);
    upstream.set(node.name, print.fingerprint);
    if (!wanted.has(node.name)) continue;
    decisions.set(node.name, force
      ? { run: true, reason: 'this is a full run', fingerprint: print.fingerprint }
      : decide(node, print, state.get(node.name), onDisk));
  }

  return {
    decisions,
    record(name: string, passed: boolean) {
      const node = byName.get(name);
      if (!node) return;
      if (!passed) { forget(state, name); return; }

      let print = measured.get(name);
      if (node.writes.length > 0) {
        paths = universe(root);
        stamps = stampAll(root, paths, stamps);
        print = fingerprintOne(node, measure());
      }
      if (print) recordGreen(state, name, print, new Date().toISOString());
    },
    flush() {
      writeState(state, root);
      writeFiles(stamps, root);
    },
  };
}
