/* Finds and launches a headless browser for the four gates that need one, and decides for all
 * of them what its absence costs. CHROME_PATH stays terminal -- set and pointing at nothing, it
 * says so instead of falling back -- but it is no longer declared: laying a default under the
 * environment left the candidate list unreachable and its macOS entries dead from the day they
 * were written. The list is keyed by platform and built from the environment on Windows, where a
 * program directory is no path anyone can hardcode. `browserOrExit` is the single spelling of
 * the strict-or-skip decision, since the four gates had drifted into three. Teardown asks the
 * parent, reaps the GROUP whatever the parent did, then waits for it to empty before removing
 * the profile: the polite exit is the leaky one, leaving a zygote and a renderer, and a
 * directory one still writes to fails with EBUSY. The grace is short: TERM may go unanswered. */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { arenaEnv, cannotRun } from './arena-scripts-vars.ts';
import { hostBinary } from './host-binary.ts';
import { platform, type Platform } from './platform.ts';
import { deadline, type Deadline } from './deadline.ts';

export const LINUX_CANDIDATES = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/snap/bin/chromium',
  '/usr/bin/microsoft-edge',
];

export const DARWIN_APPS = [
  'Google Chrome.app/Contents/MacOS/Google Chrome',
  'Chromium.app/Contents/MacOS/Chromium',
  'Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

export const WINDOWS_APPS = [
  'Google\\Chrome\\Application\\chrome.exe',
  'Chromium\\Application\\chrome.exe',
  'Microsoft\\Edge\\Application\\msedge.exe',
];

export const WINDOWS_ROOTS = ['ProgramFiles', 'ProgramW6432', 'ProgramFiles(x86)', 'LOCALAPPDATA'];

type Env = Record<string, string | undefined>;

function lookup(env: Env, key: string) {
  const lower = key.toLowerCase();
  const found = Object.keys(env).find((name) => name.toLowerCase() === lower);
  return found === undefined ? undefined : env[found];
}

export function candidates(env: Env = arenaEnv(), on: Platform = platform): string[] {
  if (on === 'win32') {
    const roots = [...new Set(WINDOWS_ROOTS.map((key) => lookup(env, key)).filter((v) => Boolean(v)))];
    return WINDOWS_APPS.flatMap((app) => roots.map((root) => `${root}\\${app}`));
  }
  if (on === 'darwin') {
    const home = lookup(env, 'HOME');
    const roots = home ? ['/Applications', `${home}/Applications`] : ['/Applications'];
    return DARWIN_APPS.flatMap((app) => roots.map((root) => `${root}/${app}`));
  }
  return LINUX_CANDIDATES;
}

export type Chromium = { path: string; reason?: undefined } | { path: null; reason: string };

function nothingFound(looked: string[], env: Env, on: Platform) {
  const lines = [
    `no Chromium-family browser found on ${on}. Arena drives a headless Chrome, Chromium or Edge`,
    'over CDP, and looked at:',
    ...looked.map((path) => `  ${path}`),
    'Install one, or set CHROME_PATH to the executable.',
  ];
  if (on === 'linux' && lookup(env, 'WSL_DISTRO_NAME')) {
    lines.push(
      'This is WSL, so a Windows browser under /mnt/c will not do either: the gates serve their',
      'pages on the WSL loopback, which a Windows-side browser resolves to Windows\'s own and',
      'never reaches. Install a Linux build inside the distribution.',
    );
  }
  return lines.join('\n');
}

export function findChromium(env: Env = arenaEnv(), exists = existsSync, on: Platform = platform): Chromium {
  const named = env.CHROME_PATH;
  if (named) {
    return exists(named)
      ? { path: named }
      : { path: null, reason: `CHROME_PATH is set to ${named}, but nothing is there` };
  }
  const looked = candidates(env, on);
  const found = looked.find(exists);
  if (found) return { path: found };
  return { path: null, reason: nothingFound(looked, env, on) };
}

export function browserOrExit(gate: string, env: Env = arenaEnv(), on: Platform = platform): string {
  const found = findChromium(env, existsSync, on);
  return found.path ?? cannotRun(gate, found.reason, env);
}

export const DEVTOOLS: Deadline = deadline('chromium:devtools', 60_000,
  'a runner that has not launched this browser before pages the binary in from disk before it '
  + 'prints its endpoint, and a first launch against a cold page cache is the slowest this is');

export const GRACE: Deadline = deadline('chromium:grace', 1_000,
  'short by intent rather than by measurement: a browser signalled as it reports its endpoint '
  + 'may not answer the signal at all, and waiting longer for an answer that is not coming is '
  + 'what stalls a gate four times a sweep');

export const REAP: Deadline = deadline('chromium:reap', 5_000,
  'the span a signalled process group has to empty before the wait is a hang rather than a '
  + 'teardown, measured against a browser that forks a zygote and a renderer of its own');

export const GROUP_POLL_MS = 50;

export function browserFlags(profile: string, on: Platform = platform) {
  const container = on === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [];
  return [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    ...container,
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ];
}

export async function launchChromium(exePath: string, on: Platform = platform): Promise<{ wsUrl: string; kill: () => Promise<void> }> {
  const profile = mkdtempSync(join(tmpdir(), 'arena-chromium-'));

  const child = spawn(exePath, browserFlags(profile, on), {
    stdio: ['ignore', 'ignore', 'pipe'],
    detached: on !== 'win32',
  });

  let exited = child.exitCode !== null;
  const hasExited = new Promise<void>((done) => {
    if (exited) { done(); return; }
    const settle = () => { exited = true; done(); };
    child.once('exit', settle);
    child.once('error', settle);
  });

  const reapGroup = () => {
    const pid = child.pid;
    if (typeof pid !== 'number') return;
    if (on === 'win32') {
      const why = 'to reap a browser process tree, which a signal cannot do on Windows';
      try { spawnSync(hostBinary('taskkill', why, { on }), ['/pid', String(pid), '/T', '/F']); } catch {  }
      return;
    }
    try { process.kill(-pid, 'SIGKILL'); } catch {  }
  };

  const groupGone = () => {
    const pid = child.pid;
    if (typeof pid !== 'number' || on === 'win32') return true;
    try { process.kill(-pid, 0); return false; } catch { return true; }
  };

  const settledWithin = (ms: number) => Promise.race([
    hasExited,
    new Promise<void>((done) => { setTimeout(done, ms).unref?.(); }),
  ]);

  const emptyWithin = async (ms: number) => {
    const until = Date.now() + ms;
    while (!groupGone() && Date.now() < until) {
      await new Promise<void>((done) => { setTimeout(done, GROUP_POLL_MS).unref?.(); });
    }
  };

  const kill = async () => {
    if (!exited) {
      try { child.kill(); } catch {  }
      await settledWithin(GRACE.ms);
    }
    reapGroup();
    await emptyWithin(REAP.ms);
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); } catch {  }
  };

  const wsUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(
      `Chromium did not report a DevTools endpoint within ${DEVTOOLS.ms}ms, which is that size `
      + `because ${DEVTOOLS.why}`)), DEVTOOLS.ms);
    let buffered = '';
    child.stderr.on('data', (chunk) => {
      buffered += String(chunk);
      const m = /DevTools listening on (ws:\/\/\S+)/.exec(buffered);
      if (m) { clearTimeout(timer); resolve(m[1]); }
    });
    child.on('exit', (code) => { clearTimeout(timer); reject(new Error(`Chromium exited with code ${code} before listening`)); });

    child.on('error', (err) => { clearTimeout(timer); reject(err); });
  }).catch(async (err) => { await kill(); throw err; });

  return { wsUrl: wsUrl as string, kill };
}
