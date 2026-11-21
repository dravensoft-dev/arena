/* Whether a node runs, and the sentence saying why. The reason is not decoration: a skipped step is
 * the one thing a reader cannot see happening, so a run that decides to skip has to be able to say
 * what it compared. The order of the tests is the order a reader would ask them in, cheapest and
 * most conclusive first, and the fingerprint answers last because it says only that something
 * moved. Declared outputs that are not on disk run the node whatever the fingerprint says, which is
 * what makes a deleted artifact and a fresh clone the same case. */

import type { GraphNode } from './graph.ts';
import type { Fingerprint } from './fingerprint.ts';
import type { NodeEntry } from './state.ts';

export type Decision = { name: string; run: boolean; reason: string | null; fingerprint: string };

export function decide(
  node: GraphNode, current: Fingerprint, previous: NodeEntry | undefined,
  onDisk: (path: string) => boolean,
): Decision {
  const answer = (run: boolean, reason: string | null) =>
    ({ name: node.name, run, reason, fingerprint: current.fingerprint });

  if (!previous) return answer(true, 'no fingerprint is recorded, so nothing is known about the last run');

  const gone = (previous.writes ?? []).find((path) => !onDisk(path));
  if (gone) return answer(true, `${gone} is gone since the last green run`);

  const moved = Object.entries(current.self).find(([path, hash]) => previous.self?.[path] !== hash);
  if (moved) {
    const [path] = moved;
    return answer(true, path === current.script
      ? `${path} has moved since the last green run`
      : `${path}, which it imports, has moved since the last green run`);
  }

  const upstream = Object.entries(current.up).find(([name, fingerprint]) => previous.up?.[name] !== fingerprint);
  if (upstream) return answer(true, `${upstream[0]} ran, so what it reads was rewritten under it`);

  if (current.reads.count !== previous.reads?.count) {
    return answer(true, `it now reads ${current.reads.count} file(s) where the last green run read ${previous.reads?.count ?? 0}`);
  }
  if (current.reads.digest !== previous.reads?.digest) {
    return answer(true, 'its sources have moved since the last green run');
  }
  if (current.fingerprint !== previous.fingerprint) {
    return answer(true, 'its fingerprint has moved since the last green run');
  }
  return answer(false, null);
}

export const shortFingerprint = (fingerprint: string) => fingerprint.slice(0, 12);
