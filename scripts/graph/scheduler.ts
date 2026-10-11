/* Runs steps side by side within pools sized from the machine, for the runners that sweep the
 * tree. A step names in `after` the steps it waits for, each listed before it, and starts once they
 * have FINISHED whatever their outcome; a runner that blocks on a failure says so in its own step.
 * Light steps share the cores; browser and compiler steps share one heavy budget of free memory,
 * the measured compiler peak plus a margin, and the browser is capped lower by BROWSER_CAP. With
 * one slot a ready step starts in the order given; with more, a step that declares its cost starts
 * first, longest first. A step that throws is a FAIL and its slot comes back; a list that cannot
 * finish is refused. An abort starts nothing further, and a step still running ABORT_GRACE after
 * one is a FAIL and is left. A finished hook that throws ends the run with a sentence once nothing
 * runs. */

import { availableParallelism, freemem } from 'node:os';
import { deadline, type Deadline } from '../lib/arena/deadline.ts';
import { POOLS, type Pool } from './pools.ts';

export { POOLS, type Pool };
export type Outcome = { status: 'pass' | 'fail' | 'skip'; note?: string | undefined };
export type Step = { name: string; pool?: Pool | undefined; cost?: number | undefined; after?: string[] | undefined; run: () => Promise<Outcome> };
export type Finished = Outcome & { name: string; ms: number };
export type Slots = { total: number; heavy: number; browser: number };
export type Hooks = {
  signal?: AbortSignal | undefined;
  finished?: ((one: Finished) => void) | undefined;
  clock?: (() => number) | undefined;
  abandonAfter?: Deadline | undefined;
};

export const GIB = 1024 ** 3;
export const HEAVY_PEAK = 1.1 * GIB;
export const HEADROOM = GIB;
export const BROWSER_CAP = 2;

export const ABORT_GRACE: Deadline = deadline('scheduler:abort-grace', 10_000,
  'a caller that owns its children ends them within their own grace of a few seconds, so ten seconds is '
  + 'spent only by a step that never settles, which nothing else would end');

const STATUSES = ['pass', 'fail', 'skip'];

export function slotsFor(jobs: number | null, cores = availableParallelism(), free = freemem()): Slots {
  const total = Math.min(jobs ?? Number.POSITIVE_INFINITY, Math.max(1, cores));
  const heavy = Math.min(total, Math.max(1, Math.floor((free - HEADROOM) / HEAVY_PEAK)));
  return { total, heavy, browser: Math.min(heavy, BROWSER_CAP) };
}

export function parseJobs(value: string, runner: string) {
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new Error(`${runner}: --jobs=${value} is not a whole number of at least 1 written without a leading zero; `
      + '--jobs=1 runs one step at a time, in the order the runner lists them');
  }
  return Number(value);
}

export function describeSlots(jobs: number | null, cores: number, free: number) {
  const slots = slotsFor(jobs, cores, free);
  let total = `the ${cores} cores`;
  if (jobs !== null) total = slots.total === jobs ? `--jobs=${jobs}` : `--jobs=${jobs} capped at the ${cores} cores`;
  const heavy = slots.heavy < slots.total ? 'bounded by the free memory' : 'the free memory allows that many';
  const browser = slots.browser < slots.heavy ? `capped at ${BROWSER_CAP}` : 'the heavy limit';
  const order = slots.total > 1 ? 'the heavy ones longest first' : 'one at a time in the order listed';
  return `up to ${slots.total} step(s) at once (${total}), ${slots.heavy} of them a browser or a compiler `
    + `(${heavy}) and ${slots.browser} a browser (${browser}), ${order}`;
}

export function scheduleProblems(steps: Step[], slots: Slots) {
  const problems: string[] = [];
  for (const key of ['total', 'heavy', 'browser'] as const) {
    if (!Number.isInteger(slots[key]) || slots[key] < 1) {
      problems.push(`${key} slots are ${slots[key]}, and a pool with no slot starts nothing`);
    }
  }
  const listed = new Set<string>();
  for (const step of steps) {
    if (listed.has(step.name)) problems.push(`${step.name} is listed twice, and a step runs exactly once`);
    if (step.pool !== undefined && !(POOLS as readonly string[]).includes(step.pool)) {
      problems.push(`${step.name} declares pool "${step.pool}", which is none of ${POOLS.join(', ')}; `
        + 'a light step declares none');
    }
    for (const before of step.after ?? []) {
      if (!listed.has(before)) {
        problems.push(`${step.name} waits for ${before}, which is not listed before it, so one slot `
          + 'could not run the list in order');
      }
    }
    if (step.cost !== undefined) {
      if (step.pool === undefined) {
        problems.push(`${step.name} declares a cost and no pool; only a heavy step is started by its cost`);
      }
      if (typeof step.cost !== 'number' || !Number.isFinite(step.cost) || step.cost <= 0) {
        problems.push(`${step.name} declares cost ${step.cost}, and a cost is the seconds a step takes, above zero`);
      }
    }
    listed.add(step.name);
  }
  return problems;
}

function known(outcome: Outcome): Outcome {
  if (STATUSES.includes(outcome?.status)) return outcome;
  return {
    status: 'fail',
    note: `the step reported "${String(outcome?.status)}", which is none of ${STATUSES.join(', ')}`,
  };
}

export async function schedule(steps: Step[], slots: Slots, hooks: Hooks = {}) {
  const problems = scheduleProblems(steps, slots);
  if (problems.length > 0) throw new Error(`scheduler: ${problems.join('; ')}`);
  const clock = hooks.clock ?? (() => performance.now());
  const grace = hooks.abandonAfter ?? ABORT_GRACE;
  const pending = [...steps];
  const done = new Set<string>();
  const finished: Finished[] = [];
  const live = new Map<string, number>();
  const held = { total: 0, heavy: 0, browser: 0 };
  let running = 0;
  let wake = () => {};
  let abandoned = false;
  let hookError: Error | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const fits = (step: Step) => held.total < slots.total
    && (step.pool === undefined || held.heavy < slots.heavy)
    && (step.pool !== 'browser' || held.browser < slots.browser);
  const take = (step: Step, by: 1 | -1) => {
    held.total += by;
    if (step.pool !== undefined) held.heavy += by;
    if (step.pool === 'browser') held.browser += by;
  };
  const report = (one: Finished) => {
    finished.push(one);
    try {
      hooks.finished?.(one);
    } catch (err) {
      hookError ??= new Error(`scheduler: the finished hook threw for ${one.name}: `
        + `${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const start = (step: Step) => {
    running += 1;
    take(step, 1);
    const at = clock();
    live.set(step.name, at);
    void (async () => {
      await null;
      let outcome: Outcome;
      try {
        outcome = known(await step.run());
      } catch (err) {
        outcome = {
          status: 'fail',
          note: `the step threw rather than finishing: ${err instanceof Error ? err.message : String(err)}`,
        };
      } finally {
        take(step, -1);
      }
      if (!live.delete(step.name)) return;
      done.add(step.name);
      running -= 1;
      report({ name: step.name, ...outcome, ms: clock() - at });
      wake();
    })();
  };

  const onAbort = () => {
    timer ??= setTimeout(() => { abandoned = true; wake(); }, grace.ms);
    wake();
  };
  if (hooks.signal?.aborted) onAbort();
  else hooks.signal?.addEventListener('abort', onAbort, { once: true });

  try {
    while (pending.length > 0 || running > 0) {
      if (!hooks.signal?.aborted && hookError === undefined) {
        const candidates = slots.total > 1
          ? [...pending].sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))
          : [...pending];
        for (const step of candidates) {
          if ((step.after ?? []).every((name) => done.has(name)) && fits(step)) {
            pending.splice(pending.indexOf(step), 1);
            start(step);
          }
        }
      }
      if (abandoned) {
        for (const [name, at] of live) {
          report({
            name,
            status: 'fail',
            note: `did not end within ${grace.ms} ms of the abort and is left running`,
            ms: clock() - at,
          });
        }
        live.clear();
        running = 0;
        break;
      }
      if (running === 0) {
        if (pending.length === 0 || hooks.signal?.aborted || hookError !== undefined) break;
        throw new Error(`scheduler: ${pending.map((step) => step.name).join(', ')} can never start: nothing `
          + 'is running, so no slot frees and no step they wait for finishes');
      }
      await new Promise<void>((resolve) => { wake = resolve; });
    }
  } finally {
    clearTimeout(timer);
    hooks.signal?.removeEventListener('abort', onAbort);
  }
  if (hookError !== undefined) throw hookError;
  return { finished, notStarted: pending.map((step) => step.name) };
}

export function interruptOn(signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM']) {
  const controller = new AbortController();
  for (const one of signals) process.once(one, () => { controller.abort(one); });
  return controller.signal;
}
