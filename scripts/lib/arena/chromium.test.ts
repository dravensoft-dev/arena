/* Reading the process tree is keyed by platform, pgrep answering by command line where
 * Win32_Process is the only thing that holds one on Windows; the query is built by a pure
 * function, so the branch neither host runs is asserted from both. A skip is DECLARED and
 * never called: bun implements no t.skip(). */

import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, win32 } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  DARWIN_APPS, DEVTOOLS, GRACE, LINUX_CANDIDATES, PROFILE_PREFIX, REAP, WINDOWS_APPS, browserFlags,
  candidates, findChromium, launchChromium, observerFor, orphanProfiles, ownerOf, processesNaming,
  profileNeedle, running, sweepOrphans,
} from './chromium.ts';
import { budgetFor, deadline, type Deadline } from './deadline.ts';
import { waitFor } from './wait-for.ts';

const SETTLE: Deadline = deadline('chromium:settle', 5_000,
  'the span this suite gives a reaped tree to disappear from the process table before it '
  + 'calls the disappearance a failure rather than a delay');

const OBSERVE: Deadline = deadline('chromium:observe', 30_000,
  'the span a host takes to answer which processes name a profile at all. pgrep answers in '
  + 'milliseconds and PowerShell must start a runtime and walk Win32_Process, the only thing on '
  + 'Windows that holds a command line, so the same question costs two orders of magnitude more '
  + 'there. A case that asks it and declares no bound of its own inherits the runner default, '
  + 'which is a number nobody in this tree chose and which the Windows leg exceeded.');

const BUDGET_MS = budgetFor(DEVTOOLS, GRACE, REAP, SETTLE, OBSERVE);
import { createDispatcher } from './cdp.ts';
import { platform, type Platform } from './platform.ts';
import { hostBinary } from './host-binary.ts';

function chromiumTempDirs() {
  return new Set(readdirSync(tmpdir()).filter((n) => n.startsWith('arena-chromium-')));
}

function pidsNaming(profilePath: string, where: Parameters<typeof hostBinary>[2] = {}) {
  const seen = processesNaming(profilePath, where);
  if (!seen.looked) {
    assert.fail(`the process tree cannot be observed on this host: ${seen.why} This suite could not `
      + 'look, which is a different fact from the browser not having forked, and reporting the '
      + 'second in place of the first sends whoever reads it into a teardown that is fine.');
  }
  return seen.pids;
}

const BROWSER = findChromium();

const BROWSER_PATH = BROWSER.path ?? '';

const NEEDS_A_BROWSER = BROWSER.path
  ? false
  : `no Chromium available to test against: ${BROWSER.reason}`;

const NEEDS_A_SIGNAL = platform === 'win32'
  ? 'the stand-in is a shell script and Windows has no TERM to ignore: the escalation there is '
    + 'taskkill /T /F, which the reap cases above exercise against a real browser'
  : false;

test('CHROME_PATH wins over the candidate list when it exists', () => {
  const found = findChromium({ CHROME_PATH: '/opt/my-chrome' }, (p) => p === '/opt/my-chrome');
  assert.deepEqual(found, { path: '/opt/my-chrome' });
});

test('CHROME_PATH pointing at nothing is an explicit reason, not a silent fallback', () => {
  const found = findChromium({ CHROME_PATH: '/opt/gone' }, () => false);
  assert.equal(found.path, null);
  assert.match(found.reason, /CHROME_PATH/);
  assert.match(found.reason, /\/opt\/gone/);
});

test('with no CHROME_PATH the first existing candidate wins, in list order', () => {
  const second = LINUX_CANDIDATES[1];
  const found = findChromium({}, (p) => p === second, 'linux');
  assert.deepEqual(found, { path: second });
});

test('the candidate list is reachable at all, which it was not while CHROME_PATH was declared', () => {
  const found = findChromium({ ARENA_CHECK_STRICT: '1' }, (p) => p === '/usr/bin/chromium', 'linux');
  assert.deepEqual(found, { path: '/usr/bin/chromium' },
    'arenaEnv laid CHROME_PATH under the environment, so every machine looked like one where a '
    + 'person had named a browser and this branch never ran');
});

test('no browser anywhere yields a reason naming the platform and every path looked at', () => {
  const found = findChromium({}, () => false, 'linux');
  assert.equal(found.path, null);
  assert.match(found.reason, /no Chromium/i);
  assert.match(found.reason, /CHROME_PATH/);
  for (const path of LINUX_CANDIDATES) assert.ok(found.reason.includes(path), `${path} unnamed`);
});

test('a windows candidate list is built from the environment, since no one can hardcode it', () => {
  const env = { 'ProgramFiles': 'C:\\Program Files', 'LOCALAPPDATA': 'C:\\Users\\dev\\AppData\\Local' };
  const list = candidates(env, 'win32');
  assert.ok(list.includes('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'));
  assert.ok(list.includes('C:\\Users\\dev\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
    'Chrome installs per-user by default, so LOCALAPPDATA is not an afterthought');
  assert.ok(list.some((p) => p.endsWith('msedge.exe')),
    'Edge ships on every Windows box and is Chromium, so including it turns "install Chrome '
    + 'first" into "it already works"');
});

test('a windows environment key is read case-insensitively, as Windows spells it', () => {
  assert.deepEqual(candidates({ PROGRAMFILES: 'C:\\PF' }, 'win32'),
    candidates({ ProgramFiles: 'C:\\PF' }, 'win32'),
    'Windows sets ProgramFiles, and arenaEnv spreads process.env into a plain object, which '
    + 'loses the case-insensitive proxy the real one has');
});

test('a windows candidate list with no roots in the environment is empty rather than invented', () => {
  assert.deepEqual(candidates({}, 'win32'), []);
});

test('a darwin candidate list covers both /Applications and the user own', () => {
  const list = candidates({ HOME: '/Users/dev' }, 'darwin');
  assert.ok(list.includes(`/Applications/${DARWIN_APPS[0]}`));
  assert.ok(list.includes(`/Users/dev/Applications/${DARWIN_APPS[0]}`));
  assert.deepEqual(candidates({}, 'darwin'), DARWIN_APPS.map((app) => `/Applications/${app}`));
});

test('every list prefers Chrome, then Chromium, then Edge, whatever the root', () => {
  const order = (list: string[]) => list.map((p) => (
    /msedge|Edge/.test(p) ? 'edge' : /Chromium|chromium/.test(p) ? 'chromium' : 'chrome'));
  for (const [on, env] of [['win32', { ProgramFiles: 'C:\\PF', LOCALAPPDATA: 'C:\\LA' }], ['darwin', { HOME: '/Users/dev' }]] as const) {
    const seen = order(candidates(env, on));
    assert.ok(seen.lastIndexOf('chrome') < seen.indexOf('edge'), `${on} put an Edge before a Chrome`);
  }
  assert.equal(WINDOWS_APPS.length, 3);
});

test('WSL is told that a browser under /mnt/c cannot reach the gate own server', () => {
  const wsl = findChromium({ WSL_DISTRO_NAME: 'Debian' }, () => false, 'linux');
  assert.match(wsl.reason ?? '', /WSL/);
  assert.match(wsl.reason ?? '', /loopback/);

  const plain = findChromium({}, () => false, 'linux');
  assert.ok(!/WSL/.test(plain.reason ?? ''),
    'a message that names WSL on every Linux machine is one a Linux contributor learns to skip');
});

test('the dispatcher numbers requests and resolves the matching reply', async () => {
  const d = createDispatcher();
  const a = d.next('Page.navigate', { url: 'x' });
  const b = d.next('Runtime.evaluate', { expression: '1' }, 'sess-1');

  assert.equal(a.frame.id, 1);
  assert.equal(b.frame.id, 2);
  assert.equal(b.frame.sessionId, 'sess-1');
  assert.equal(a.frame.sessionId, undefined);
  assert.equal(d.pending.size, 2);

  assert.equal(d.settle({ id: 2, result: { ok: true } }), true);
  assert.deepEqual(await b.result, { ok: true });
  assert.equal(d.pending.size, 1);
});

test('an error reply rejects with the protocol message', async () => {
  const d = createDispatcher();
  const a = d.next('Bad.method', {});
  d.settle({ id: 1, error: { code: -32601, message: 'Bad.method wasn\'t found' } });
  await assert.rejects(a.result, /Bad\.method wasn't found/);
});

test('an event (no id) is not a reply and settles nothing', () => {
  const d = createDispatcher();
  d.next('Page.enable', {});
  assert.equal(d.settle({ method: 'Page.loadEventFired', params: {} }), false);
  assert.equal(d.pending.size, 1);
});

test('drain rejects every pending request and clears the map', async () => {
  const d = createDispatcher();
  const a = d.next('Page.enable');
  const b = d.next('Runtime.enable');
  d.drain(new Error('CDP: connection closed'));
  await assert.rejects(a.result, /connection closed/);
  await assert.rejects(b.result, /connection closed/);
  assert.equal(d.pending.size, 0);
});

test('drain on an empty dispatcher is a no-op', () => {
  const d = createDispatcher();
  assert.doesNotThrow(() => d.drain(new Error('unused')));
  assert.equal(d.pending.size, 0);
});

test('a request made after drain still gets its own promise, unaffected by the earlier rejection', async () => {
  const d = createDispatcher();
  const a = d.next('Page.enable');
  d.drain(new Error('closed'));
  await assert.rejects(a.result);
  const b = d.next('Runtime.enable');
  assert.equal(d.settle({ id: b.frame.id, result: { ok: true } }), true);
  assert.deepEqual(await b.result, { ok: true });
});

test('launchChromium rejects instead of crashing when spawn cannot start the binary, and leaves no temp profile behind',
  { timeout: BUDGET_MS }, async () => {
  const before = chromiumTempDirs();
  await assert.rejects(() => launchChromium('/this/path/does/not/exist'));
  const after = chromiumTempDirs();
  assert.deepEqual(after, before, 'a temp profile dir was left behind by the rejected launch');
});

test('each platform observes the tree with the tool it has, and the Windows one is read from here', () => {
  const win = observerFor('win32');
  assert.equal(win.probe, 'powershell', 'there is no pgrep on Windows, and a suite that asks for '
    + 'one there is a suite that cannot see the tree taskkill /T /F was pointed at');
  const asked = win.query('arena-chromium-x');
  assert.match(asked.at(-1) ?? '', /Win32_Process/,
    'the command line is what names the profile, and Win32_Process is the only place Windows '
    + 'keeps one, which is why tasklist cannot answer this at all');
  assert.match(asked.at(-1) ?? '', /arena-chromium-x/);
  assert.ok(asked.includes('-NoProfile'),
    'a contributor profile that prints a banner would arrive as a process id nobody can parse');
  assert.match(asked.at(-1) ?? '', /\$_\.ProcessId -ne \$PID/,
    'the query carries the profile name in its own command line, and Win32_Process lists the '
    + 'shell running it, so without this the observer counts itself: one process would survive '
    + 'every reap and the settle would wait out its whole budget for a tree that is already gone. '
    + 'pgrep never matches its own pid, which is why the POSIX half needs no such clause');
  assert.equal(win.noMatch, null, 'PowerShell exits 0 with nothing to say, so a status other than '
    + '0 is a host that could not look rather than a tree with nothing in it');

  for (const on of ['linux', 'darwin'] as const) {
    assert.deepEqual(observerFor(on).query('arena-chromium-x'), ['-f', 'arena-chromium-x']);
    assert.equal(observerFor(on).noMatch, 1);
  }
});

test('what both are asked for is the profile own name, never the path this host spells', () => {
  assert.equal(profileNeedle(join(tmpdir(), 'arena-chromium-ab12')), 'arena-chromium-ab12');
  assert.equal(profileNeedle('C:\\Users\\RUNNER~1\\AppData\\Local\\Temp\\arena-chromium-ab12',
    win32.basename), 'arena-chromium-ab12',
    'the browser is handed an absolute path and hands its children whatever it makes of one: a '
    + 'short 8.3 root where this process read a long one, and a quoted flag where the path holds '
    + 'a space. mkdtemp already made the last segment unique, so matching on it asks the question '
    + 'the reap actually has, which is whether anything still holds THIS profile');
});

test('a quote in a profile name is escaped rather than closing the query it sits in', () => {
  const asked = observerFor('win32').query("arena-chromium-o'brien");
  assert.match(asked.at(-1) ?? '', /o''brien/,
    'PowerShell doubles a quote to escape it inside one, and a name that ends the literal early '
    + 'is a query that reports no process and says nothing about why');
});

test('a host with no way to look says so, instead of reporting a browser that forked nothing', () => {
  const probe = observerFor().probe;
  const seen = processesNaming(join(tmpdir(), 'arena-chromium-nowhere'), { env: { PATH: '' } });
  assert.equal(seen.looked, false,
    `a host without ${probe} cannot answer this question at all. Answering it anyway with an `
    + 'empty list is how a missing tool arrives as a defect in the thing it was brought in to '
    + 'measure.');
  assert.match(seen.looked ? '' : seen.why, new RegExp(probe),
    'the reason names the probe, since what is missing is what has to be installed');

  assert.throws(() => pidsNaming(join(tmpdir(), 'arena-chromium-nowhere'), { env: { PATH: '' } }),
    /cannot be observed on this host/,
    'every case that reads the tree goes through this, so the sentence a reader gets names the '
    + 'host that cannot answer rather than a browser that did nothing wrong');
});

test('a host that can look and finds none says that, which is the answer the reap wants',
  { timeout: BUDGET_MS }, () => {
  const seen = processesNaming(join(tmpdir(), 'arena-chromium-no-such-profile'));
  assert.deepEqual(seen, { looked: true, pids: [] },
    `${observerFor().probe} reports no match without failing, and reading that as a failure to `
    + 'run would make every clean teardown indistinguishable from a host that cannot observe one');
});

test('kill() reaps the whole tree: no descendant survives it and no temp profile outlives it',
  { timeout: BUDGET_MS, skip: NEEDS_A_BROWSER }, async () => {
  const before = chromiumTempDirs();
  const { kill } = await launchChromium(BROWSER_PATH);
  const created = [...chromiumTempDirs()].filter((d) => !before.has(d));
  assert.equal(created.length, 1, 'launchChromium should have made exactly one new temp profile dir');
  const profilePath = join(tmpdir(), created[0] ?? '');

  const beforeKill = pidsNaming(profilePath);
  assert.ok(beforeKill.length > 1,
    `expected Chromium to have forked at least one subprocess sharing ${profilePath}, found ${beforeKill.length}`);

  await kill();

  const settled = await waitFor(
    () => !existsSync(profilePath) && pidsNaming(profilePath).length === 0, SETTLE);
  const onDisk = existsSync(profilePath);
  assert.ok(settled.seen, settled.seen ? '' : `${settled.why} The profile directory `
    + `${onDisk ? 'is still on disk' : 'is gone'}, so what outlived kill() is `
    + `${onDisk ? 'the directory' : 'a process that still names it'}.`);
});

test('the container flags are linux only, since --no-sandbox is a real weakening elsewhere', () => {
  const linux = browserFlags('/tmp/p', 'linux');
  assert.ok(linux.includes('--no-sandbox'));
  assert.ok(linux.includes('--disable-dev-shm-usage'),
    'a small /dev/shm is what makes Chromium crash under a container, which is where CI runs');
  for (const on of ['darwin', 'win32'] as const) {
    assert.ok(!browserFlags('/tmp/p', on).includes('--no-sandbox'),
      `${on} got --no-sandbox, which is a container idiom and a real weakening on a real desktop`);
  }
});

test('every platform is told not to run its first-run flow, which delays the DevTools line', () => {
  for (const on of ['linux', 'darwin', 'win32'] as const) {
    const flags = browserFlags('/tmp/p', on);
    for (const flag of ['--headless', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0']) {
      assert.ok(flags.includes(flag), `${on} is missing ${flag}`);
    }
    assert.ok(flags.includes('--user-data-dir=/tmp/p'));
  }
});

test('kill() has already finished when it resolves, rather than leaving a wait to the caller',
  { timeout: BUDGET_MS, skip: NEEDS_A_BROWSER }, async () => {
    const before = chromiumTempDirs();
    const { kill } = await launchChromium(BROWSER_PATH);
    const created = [...chromiumTempDirs()].filter((d) => !before.has(d));
    const profilePath = join(tmpdir(), created[0] ?? '');

    await kill();

    assert.equal(existsSync(profilePath), false,
      'no polling: the profile is gone the instant kill() resolves, because the removal happens '
      + 'after the exit rather than on the line after the signal, which is the race that fails '
      + 'with EBUSY on Windows and succeeds by luck here');
    assert.deepEqual(pidsNaming(profilePath), []);
  });

test('teardown is bounded even where the browser ignores the signal, which is what CI showed',
  { timeout: BUDGET_MS, skip: NEEDS_A_BROWSER }, async () => {
    const { kill } = await launchChromium(BROWSER_PATH);
    const started = Date.now();
    await kill();
    const took = Date.now() - started;

    assert.ok(took < GRACE.ms + REAP.ms, `kill() took ${took}ms, past its own bound`);
    assert.ok(GRACE.ms + REAP.ms < BUDGET_MS,
      'the budget has to exceed the worst case, or this suite measures how fast a browser dies '
      + 'rather than whether teardown finished, which is how it failed on a runner and not here');
  });

test('a browser that IGNORES the signal is still reaped, and inside the bound',
  { timeout: BUDGET_MS, skip: NEEDS_A_SIGNAL }, async () => {
    const dir = mkdtempSync(join(tmpdir(), 'arena-deaf-browser-'));
    const exe = join(dir, 'deaf-browser.sh');
    writeFileSync(exe,
      '#!/bin/sh\n'
      + "trap '' TERM\n"
      + 'echo "DevTools listening on ws://127.0.0.1:9/devtools/browser/stand-in" >&2\n'
      + 'sleep 60\n');
    chmodSync(exe, 0o755);

    try {
      const { kill } = await launchChromium(exe);
      const started = Date.now();
      await kill();
      const took = Date.now() - started;

      assert.ok(took >= GRACE.ms, `took ${took}ms, so the grace was never spent and TERM was heard`);
      assert.ok(took < GRACE.ms * 2,
        `took ${took}ms. Once the grace is spent the reap is immediate, so anything near a second `
        + 'grace means teardown waited instead of escalating. That is what stalls a gate finally '
        + `block four times a sweep, and at ${REAP.ms}ms it is what timed out on a runner.`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

test('a parent that dies ON the signal still leaves no descendant behind',
  { timeout: BUDGET_MS, skip: NEEDS_A_SIGNAL }, async () => {
    const dir = mkdtempSync(join(tmpdir(), 'arena-leaky-browser-'));
    const exe = join(dir, 'leaky-browser.sh');
    writeFileSync(exe,
      '#!/bin/sh\n'
      + "sh -c 'sleep 60; :' \"$@\" &\n"
      + 'echo "DevTools listening on ws://127.0.0.1:9/devtools/browser/stand-in" >&2\n'
      + 'sleep 60\n');
    chmodSync(exe, 0o755);

    const before = chromiumTempDirs();
    try {
      const { kill } = await launchChromium(exe);
      const created = [...chromiumTempDirs()].filter((d) => !before.has(d));
      const profilePath = join(tmpdir(), created[0] ?? '');
      assert.ok(pidsNaming(profilePath).length > 1,
        'the backgrounded descendant has to name the profile too, or this case stands in for '
        + 'nothing. It is spawned as a LIST, `cmd; :`, because a shell handed one simple command '
        + 'may exec into it and leave its own argv behind with the profile path in it: bash does, '
        + 'dash does not, and a case that reads the difference is measuring the host rather than '
        + 'the teardown');

      await kill();

      assert.deepEqual(pidsNaming(profilePath), [],
        'the parent heard TERM and exited, so teardown never escalated, and a group nobody reaped '
        + 'outlives the call that claims to have reaped it');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

test('a profile carries the pid of the run that made it, so a sibling run is never mistaken for a leak', () => {
  assert.equal(ownerOf(`${PROFILE_PREFIX}4321-ab12`), 4321);
  assert.equal(ownerOf(`${PROFILE_PREFIX}ab12`), null,
    'a name from before the owner was stamped parses to nothing and is left alone, because a '
    + 'profile nobody claims is not the same fact as a profile whose claimant is gone');
  assert.equal(ownerOf('some-other-temp-dir'), null);
});

test('a profile is an orphan when the run that made it is gone, and never while it is alive', () => {
  const alive = (pid: number) => pid === 7;
  assert.deepEqual(orphanProfiles([
    `${PROFILE_PREFIX}7-live`, `${PROFILE_PREFIX}8-gone`, 'unrelated', `${PROFILE_PREFIX}nopid`,
  ], alive), [`${PROFILE_PREFIX}8-gone`],
  'the live run keeps its browser, the unrelated directory is not ours, and the unstamped one is '
  + 'a question this cannot answer');
});

test('a pid that answers a signal is running, and one that answers nothing is not', () => {
  assert.equal(running(process.pid), true);
  const gone = spawnSync(process.execPath, ['-e', '']);
  assert.equal(running(gone.pid as number), false,
    'a process that has exited and been reaped holds no resources and its profile is collectable');
});

test('a sweep removes an orphan and leaves a live run alone', () => {
  const at = mkdtempSync(join(tmpdir(), 'arena-sweep-'));
  const gone = spawnSync(process.execPath, ['-e', '']);
  const orphan = join(at, `${PROFILE_PREFIX}${gone.pid}-x`);
  const mine = join(at, `${PROFILE_PREFIX}${process.pid}-x`);
  const foreign = join(at, 'not-arenas-x');
  for (const dir of [orphan, mine, foreign]) mkdirSync(dir);

  sweepOrphans(at);

  assert.equal(existsSync(orphan), false, 'the run that made it is gone, so nothing holds it');
  assert.equal(existsSync(mine), true, 'this run is alive and its browser is in use');
  assert.equal(existsSync(foreign), true, 'a directory Arena did not make is not Arena\'s to remove');
  rmSync(at, { recursive: true, force: true });
});

test('a profile whose holders cannot be looked up is kept rather than removed', () => {
  const at = mkdtempSync(join(tmpdir(), 'arena-sweep-'));
  const gone = spawnSync(process.execPath, ['-e', '']);
  const orphan = join(at, `${PROFILE_PREFIX}${gone.pid}-x`);
  mkdirSync(orphan);

  const seen = processesNaming(orphan, { env: { PATH: '' } });
  assert.equal(seen.looked, false,
    'with nothing on PATH the host cannot be asked which processes name a profile');
  assert.equal(existsSync(orphan), true,
    'removing a profile whose holders could not be found would leave a browser running against a '
    + 'directory that is no longer there, which is worse than leaving the directory');
  rmSync(at, { recursive: true, force: true });
});
