/* The scheduler is held with steps that resolve on the next turn of the event loop rather than
 * after a span, so every assertion is about order and concurrency and none about time. Each case
 * counts what ran against what is listed, and the peaks are asserted equal where the slots allow
 * them, so a scheduler that ran one step at a time cannot pass the concurrency cases. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { deadline } from '../lib/arena/deadline.ts';
import { TERM_GRACE } from '../lib/arena/child-output.ts';
import {
  ABORT_GRACE, GIB, parseJobs, schedule, scheduleProblems, slotsFor, type Outcome, type Pool, type Slots, type Step,
} from './scheduler.ts';

const tick = () => new Promise<void>((resolve) => { setImmediate(resolve); });

function recorder() {
  const events: string[] = [];
  const live = { total: 0, heavy: 0, browser: 0 };
  const peak = { total: 0, heavy: 0, browser: 0 };
  let calls = 0;
  const step = (name: string, over: { pool?: Pool; after?: string[] } = {}, outcome: Outcome = { status: 'pass' }): Step => ({
    name,
    ...over,
    run: async () => {
      calls += 1;
      live.total += 1;
      if (over.pool) live.heavy += 1;
      if (over.pool === 'browser') live.browser += 1;
      for (const key of ['total', 'heavy', 'browser'] as const) peak[key] = Math.max(peak[key], live[key]);
      events.push(`start ${name}`);
      await tick();
      await tick();
      events.push(`end ${name}`);
      live.total -= 1;
      if (over.pool) live.heavy -= 1;
      if (over.pool === 'browser') live.browser -= 1;
      return outcome;
    },
  });
  return { events, peak, step, calls: () => calls };
}

const WIDE: Slots = { total: 4, heavy: 2, browser: 1 };

function mixed(step: ReturnType<typeof recorder>['step']) {
  return [
    ...Array.from({ length: 12 }, (_, i) => step(`light-${i}`)),
    step('compiler-a', { pool: 'compiler' }),
    step('compiler-b', { pool: 'compiler' }),
    step('compiler-c', { pool: 'compiler' }),
    step('browser-a', { pool: 'browser' }),
    step('browser-b', { pool: 'browser' }),
  ];
}

test('every listed step runs exactly once and is reported once', async () => {
  const r = recorder();
  const steps = mixed(r.step);
  const { finished, notStarted } = await schedule(steps, WIDE);
  assert.equal(steps.length, 17);
  assert.equal(r.calls(), steps.length);
  assert.equal(finished.length, steps.length);
  assert.deepEqual(finished.map((one) => one.name).sort(), steps.map((one) => one.name).sort());
  assert.deepEqual(notStarted, []);
  for (const one of steps) {
    assert.equal(r.events.filter((event) => event === `start ${one.name}`).length, 1, `${one.name} started once`);
  }
});

test('no pool holds more than its slots, and a pool with room fills it', async () => {
  const r = recorder();
  await schedule(mixed(r.step), WIDE);
  assert.equal(r.peak.total, WIDE.total, 'a scheduler that ran fewer at once than the slots allow is not running them side by side');
  assert.equal(r.peak.heavy, WIDE.heavy);
  assert.equal(r.peak.browser, WIDE.browser);
});

test('a step starts only after every step it waits for has finished', async () => {
  const r = recorder();
  await schedule([
    r.step('a'),
    r.step('b', { after: ['a'] }),
    r.step('c', { after: ['a', 'b'] }),
    r.step('d'),
  ], WIDE);
  const at = (event: string) => r.events.indexOf(event);
  assert.ok(at('end a') < at('start b'));
  assert.ok(at('end a') < at('start c') && at('end b') < at('start c'));
  assert.ok(at('start d') < at('end a'), 'd waits for nothing, so it runs beside a');
});

test('one slot replays the order the steps are listed in, one at a time', async () => {
  const r = recorder();
  const steps = [
    r.step('emit', { pool: 'compiler' }),
    r.step('lint'),
    r.step('page', { pool: 'browser' }),
    r.step('suite', { pool: 'compiler', after: ['emit'] }),
    r.step('docs'),
  ];
  await schedule(steps, { total: 1, heavy: 1, browser: 1 });
  assert.deepEqual(r.events, steps.flatMap((one) => [`start ${one.name}`, `end ${one.name}`]));
});

test('a step whose predecessor failed still runs, as it does in the serial sweep', async () => {
  const r = recorder();
  const { finished } = await schedule([r.step('a', {}, { status: 'fail' }), r.step('b', { after: ['a'] })], WIDE);
  assert.deepEqual(finished.map((one) => [one.name, one.status]).sort(), [['a', 'fail'], ['b', 'pass']]);
});

test('a step that throws is a failure naming the throw, and its heavy slot comes back', async () => {
  const r = recorder();
  const steps: Step[] = [
    { name: 'throws', pool: 'compiler', run: () => { throw new Error('spawn exploded'); } },
    { name: 'rejects', pool: 'compiler', run: async () => { throw new Error('spawn rejected'); } },
    r.step('after-both', { pool: 'compiler' }),
  ];
  const { finished } = await schedule(steps, { total: 2, heavy: 1, browser: 1 });
  const by = new Map(finished.map((one) => [one.name, one]));
  assert.equal(finished.length, 3);
  assert.equal(by.get('throws')?.status, 'fail');
  assert.match(by.get('throws')?.note ?? '', /spawn exploded/);
  assert.equal(by.get('rejects')?.status, 'fail');
  assert.match(by.get('rejects')?.note ?? '', /spawn rejected/);
  assert.equal(by.get('after-both')?.status, 'pass', 'a slot held by a step that threw would leave this one unstarted');
});

test('a status the runner does not know is a failure that says so', async () => {
  const { finished } = await schedule(
    [{ name: 'odd', run: async () => ({ status: 'green' } as unknown as Outcome) }], WIDE);
  assert.equal(finished[0]?.status, 'fail');
  assert.match(finished[0]?.note ?? '', /"green", which is none of pass, fail, skip/);
});

test('a list that cannot run is refused before any step starts', async () => {
  const cases: [Step[], Slots, RegExp][] = [];
  const r = recorder();
  cases.push([[r.step('a'), r.step('a')], WIDE, /a is listed twice/]);
  cases.push([[r.step('a', { after: ['ghost'] })], WIDE, /a waits for ghost, which is not listed before it/]);
  cases.push([[r.step('a', { after: ['b'] }), r.step('b')], WIDE, /a waits for b, which is not listed before it/]);
  cases.push([[r.step('a', { after: ['a'] })], WIDE, /a waits for a, which is not listed before it/]);
  cases.push([[{ ...r.step('a'), pool: 'gpu' as Pool }], WIDE, /a declares pool "gpu", which is none of browser, compiler/]);
  cases.push([[r.step('a')], { total: 0, heavy: 1, browser: 1 }, /total slots are 0/]);
  cases.push([[r.step('a')], { total: 2, heavy: 1.5, browser: 1 }, /heavy slots are 1.5/]);
  for (const [steps, slots, problem] of cases) {
    await assert.rejects(schedule(steps, slots), problem);
  }
  assert.equal(cases.length, 7);
  assert.equal(r.calls(), 0, 'a refused list ran a step');
  assert.deepEqual(scheduleProblems(mixed(recorder().step), WIDE), []);
});

test('an abort starts nothing further and lets what runs finish', async () => {
  const stop = new AbortController();
  const r = recorder();
  const steps: Step[] = [
    { name: 'a', run: async () => { stop.abort(); await tick(); return { status: 'pass' }; } },
    r.step('b'),
    r.step('c'),
  ];
  const { finished, notStarted } = await schedule(steps, { total: 1, heavy: 1, browser: 1 }, { signal: stop.signal });
  assert.deepEqual(finished.map((one) => one.name), ['a']);
  assert.deepEqual(notStarted, ['b', 'c']);
  assert.equal(r.calls(), 0);
});

test('an abort does not wait for ever on a step that never settles, and that step is a failure naming the wait', async () => {
  const stop = new AbortController();
  const brief = deadline('scheduler.test:abandon', 200,
    'the bound only has to end a step that never settles, so it is far shorter than the real grace');
  let release = () => {};
  const reported: string[] = [];
  const r = recorder();
  const steps: Step[] = [
    { name: 'stuck', run: () => new Promise<Outcome>((resolve) => { release = () => { resolve({ status: 'pass' }); }; }) },
    r.step('later'),
  ];
  const ended = schedule(steps, { total: 1, heavy: 1, browser: 1 },
    { signal: stop.signal, abandonAfter: brief, finished: (one) => { reported.push(one.name); } });
  await tick();
  stop.abort();
  const { finished, notStarted } = await ended;
  assert.equal(finished.length, 1);
  assert.equal(finished[0]?.name, 'stuck');
  assert.equal(finished[0]?.status, 'fail');
  assert.match(finished[0]?.note ?? '', /did not end within 200 ms of the abort and is left running/);
  assert.deepEqual(notStarted, ['later']);
  release();
  await tick();
  await tick();
  assert.deepEqual(reported, ['stuck'], 'a step abandoned and then settling reported itself a second time');
  assert.equal(r.calls(), 0);
  assert.ok(ABORT_GRACE.ms > TERM_GRACE.ms, 'the scheduler gives up on a step before the child under it has had its own grace');
});

test('a finished hook that throws ends the run with a sentence naming the step, once nothing runs', async () => {
  const r = recorder();
  const steps = [r.step('a'), r.step('b'), r.step('c')];
  await assert.rejects(
    schedule(steps, { total: 1, heavy: 1, browser: 1 },
      { finished: () => { throw new Error('record failed'); } }),
    /scheduler: the finished hook threw for a: record failed/);
  assert.deepEqual(r.events, ['start a', 'end a'], 'a run whose hook failed started a further step');
});

test('each finished step carries what it took, from the clock it is handed', async () => {
  let elapsed = 0;
  const r = recorder();
  const steps = mixed(r.step);
  const { finished } = await schedule(steps, WIDE, { clock: () => { elapsed += 1000; return elapsed; } });
  assert.equal(finished.length, steps.length);
  for (const one of finished) assert.ok(Number.isFinite(one.ms) && one.ms > 0, `${one.name} took ${one.ms}`);
});

test('the slots follow the cores and the free memory, and --jobs caps every pool', () => {
  const rows: [number | null, number, number, Slots][] = [
    [null, 8, 16 * GIB, { total: 8, heavy: 8, browser: 2 }],
    [null, 4, 7.4 * GIB, { total: 4, heavy: 4, browser: 2 }],
    [null, 8, 3.5 * GIB, { total: 8, heavy: 1, browser: 1 }],
    [null, 8, 0.5 * GIB, { total: 8, heavy: 1, browser: 1 }],
    [1, 8, 16 * GIB, { total: 1, heavy: 1, browser: 1 }],
    [3, 8, 16 * GIB, { total: 3, heavy: 3, browser: 2 }],
    [64, 8, 16 * GIB, { total: 8, heavy: 8, browser: 2 }],
  ];
  for (const [jobs, cores, free, slots] of rows) {
    assert.deepEqual(slotsFor(jobs, cores, free), slots, `jobs ${jobs}, ${cores} cores, ${free / GIB} GiB free`);
  }
  assert.equal(rows.length, 7);
});

test('--jobs takes a whole number of at least one and refuses every other shape with a sentence', () => {
  assert.equal(parseJobs('1', 'check-all'), 1);
  assert.equal(parseJobs('12', 'check-all'), 12);
  const refused = ['0', '', 'abc', '1.5', '-1', '01', ' 2', '2 '];
  for (const value of refused) {
    assert.throws(() => parseJobs(value, 'check-all'),
      new RegExp(`check-all: --jobs=${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} is not a whole number of at least 1 written without a leading zero`));
  }
  assert.equal(refused.length, 8);
});
