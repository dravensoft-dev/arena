/* Finds and launches a headless browser for the four gates that need one, and decides for all
 * of them what its absence costs. CHROME_PATH stays terminal -- set and pointing at nothing, it
 * says so instead of falling back -- but it is no longer declared: laying a default under the
 * environment left the candidate list unreachable and its macOS entries dead from the day they
 * were written. The list is keyed by platform and, on Windows, built from the environment,
 * because a program directory is not a path anyone can hardcode. `browserOrExit` is the single
 * spelling of the strict-or-skip decision, since the four gates had drifted into three.
 * Teardown asks, then insists, then removes: a signal, a bounded wait for the exit, a forced
 * reap of the tree, and only then the profile, because removing a directory a browser is still
 * writing succeeds by luck on Linux and fails with EBUSY on Windows. */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { arenaEnv, cannotRun } from './arena-scripts-vars.ts';
import { platform, type Platform } from './platform.ts';

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

export const DEVTOOLS_TIMEOUT_MS = 60_000;

export const EXIT_TIMEOUT_MS = 5_000;

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

  const force = () => {
    const pid = child.pid;
    if (typeof pid !== 'number' || exited) return;
    if (on === 'win32') {
      try { spawnSync('taskkill', ['/pid', String(pid), '/T', '/F']); } catch {  }
      return;
    }
    try { process.kill(-pid, 'SIGKILL'); } catch {  }
  };

  const kill = async () => {
    if (!exited) {
      try { child.kill(); } catch {  }
      await Promise.race([hasExited, new Promise((r) => { setTimeout(r, EXIT_TIMEOUT_MS).unref?.(); })]);
      force();
      await Promise.race([hasExited, new Promise((r) => { setTimeout(r, EXIT_TIMEOUT_MS).unref?.(); })]);
    }
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); } catch {  }
  };

  const wsUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(
      `Chromium did not report a DevTools endpoint within ${DEVTOOLS_TIMEOUT_MS / 1000}s`)), DEVTOOLS_TIMEOUT_MS);
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
