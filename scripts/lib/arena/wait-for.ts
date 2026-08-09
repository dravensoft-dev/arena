/* Waits for a CONDITION and reports what it cost, so the bound beside it is a hang detector and
 * never a schedule. The answer is not a boolean: a boolean cannot carry the difference between
 * a subject that was not there and one that was not seen in time, and a gate that collapses the
 * two names a defect in a component that has none. The cost travels on both answers, because a
 * margin closing is only visible on the runs that still pass. The poll interval is written here
 * and nowhere else, which is what keeps it from becoming a second set of numbers. */

import type { Deadline } from './deadline.ts';

export const POLL_MS = 50;

export type Waited = { seen: true; ms: number } | { seen: false; ms: number; why: string };

export type Clock = { now?: () => number; sleep?: (ms: number) => Promise<void> };

const realSleep = (ms: number) => new Promise<void>((done) => { setTimeout(done, ms); });

export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  bound: Deadline,
  clock: Clock = {},
): Promise<Waited> {
  const now = clock.now ?? Date.now;
  const sleep = clock.sleep ?? realSleep;
  const started = now();
  let last = '';
  for (;;) {
    try {
      if (await condition()) return { seen: true, ms: now() - started };
      last = '';
    } catch (err) {
      last = ` The last look raised: ${(err as Error).message}.`;
    }
    const spent = now() - started;
    if (spent >= bound.ms) {
      return {
        seen: false,
        ms: spent,
        why: `${bound.name} was not seen within ${bound.ms}ms, which is that size because `
          + `${bound.why}.${last} This is a wait that expired, and not a report that the thing `
          + 'waited for is absent.',
      };
    }
    await sleep(POLL_MS);
  }
}
