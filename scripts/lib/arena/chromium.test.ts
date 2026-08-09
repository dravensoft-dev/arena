/* KILL_BUDGET_MS is DERIVED from what teardown allows itself, never a round number, because the
 * two have to move together: every case here that launches a browser can spend the grace, the
 * exit timeout and a settle wait, which already exceeds the 5s default. A test that can outrun
 * its own deadline by construction is worse than a slow one -- bun abandons the callback with
 * its child processes still pending, and the next file to call test() reports an error that
 * names neither. These passed here at 145ms and timed out at 5001ms on a runner, where Chrome
 * had been signalled the instant it reported its endpoint. The stand-in that ignores TERM needs
 * no browser at all, so the escalation is covered on every machine. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  DARWIN_APPS, EXIT_TIMEOUT_MS, GRACE_MS, LINUX_CANDIDATES, WINDOWS_APPS, browserFlags,
  candidates, findChromium, launchChromium,
} from './chromium.ts';

const SETTLE_TIMEOUT_MS = 5_000;

const KILL_BUDGET_MS = (GRACE_MS + EXIT_TIMEOUT_MS + SETTLE_TIMEOUT_MS) * 2;
import { createDispatcher } from './cdp.ts';
import { platform } from './platform.ts';

function chromiumTempDirs() {
  return new Set(readdirSync(tmpdir()).filter((n) => n.startsWith('arena-chromium-')));
}

function processesNaming(profilePath: string) {
  try {
    return execFileSync('pgrep', ['-f', `user-data-dir=${profilePath}`], { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

async function waitUntil(predicate: () => boolean, { timeoutMs = SETTLE_TIMEOUT_MS, intervalMs = 100 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (predicate()) return true;
    if (Date.now() >= deadline) return false;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

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
  { timeout: KILL_BUDGET_MS }, async () => {
  const before = chromiumTempDirs();
  await assert.rejects(() => launchChromium('/this/path/does/not/exist'));
  const after = chromiumTempDirs();
  assert.deepEqual(after, before, 'a temp profile dir was left behind by the rejected launch');
});

test('kill() reaps the whole tree: no descendant survives it and no temp profile outlives it',
  { timeout: KILL_BUDGET_MS }, async (t) => {
  const found = findChromium();
  if (!found.path) { t.skip(`no Chromium available to test against: ${found.reason}`); return; }

  const before = chromiumTempDirs();
  const { kill } = await launchChromium(found.path);
  const created = [...chromiumTempDirs()].filter((d) => !before.has(d));
  assert.equal(created.length, 1, 'launchChromium should have made exactly one new temp profile dir');
  const profilePath = join(tmpdir(), created[0] ?? '');

  const beforeKill = processesNaming(profilePath);
  assert.ok(beforeKill.length > 1,
    `expected Chromium to have forked at least one subprocess sharing ${profilePath}, found ${beforeKill.length}`);

  await kill();

  const settled = await waitUntil(() => !existsSync(profilePath) && processesNaming(profilePath).length === 0);
  assert.ok(settled,
    `outlived kill(): dir exists=${existsSync(profilePath)}, processes=${JSON.stringify(processesNaming(profilePath))}`);
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
  { timeout: KILL_BUDGET_MS }, async (t) => {
    const found = findChromium();
    if (!found.path) { t.skip(`no Chromium available to test against: ${found.reason}`); return; }

    const before = chromiumTempDirs();
    const { kill } = await launchChromium(found.path);
    const created = [...chromiumTempDirs()].filter((d) => !before.has(d));
    const profilePath = join(tmpdir(), created[0] ?? '');

    await kill();

    assert.equal(existsSync(profilePath), false,
      'no polling: the profile is gone the instant kill() resolves, because the removal happens '
      + 'after the exit rather than on the line after the signal, which is the race that fails '
      + 'with EBUSY on Windows and succeeds by luck here');
    assert.deepEqual(processesNaming(profilePath), []);
  });

test('teardown is bounded even where the browser ignores the signal, which is what CI showed',
  { timeout: KILL_BUDGET_MS }, async (t) => {
    const found = findChromium();
    if (!found.path) { t.skip(`no Chromium available to test against: ${found.reason}`); return; }

    const { kill } = await launchChromium(found.path);
    const started = Date.now();
    await kill();
    const took = Date.now() - started;

    assert.ok(took < GRACE_MS + EXIT_TIMEOUT_MS, `kill() took ${took}ms, past its own bound`);
    assert.ok(GRACE_MS + EXIT_TIMEOUT_MS < KILL_BUDGET_MS,
      'the budget has to exceed the worst case, or this suite measures how fast a browser dies '
      + 'rather than whether teardown finished, which is how it failed on a runner and not here');
  });

test('a browser that IGNORES the signal is still reaped, and inside the bound',
  { timeout: KILL_BUDGET_MS }, async (t) => {
    if (platform === 'win32') {
      t.skip('the stand-in is a shell script, and the Windows escalation is taskkill /T /F');
      return;
    }

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

      assert.ok(took >= GRACE_MS, `took ${took}ms, so the grace was never spent and TERM was heard`);
      assert.ok(took < GRACE_MS * 2,
        `took ${took}ms. Once the grace is spent the reap is immediate, so anything near a second `
        + 'grace means teardown waited instead of escalating. That is what stalls a gate finally '
        + `block four times a sweep, and at ${EXIT_TIMEOUT_MS}ms it is what timed out on a runner.`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
