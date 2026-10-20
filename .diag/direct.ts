import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
const [exe, lifeMs, ...extra] = [process.argv[2]!, Number(process.argv[3]), ...process.argv.slice(4)];
const tmp = mkdtempSync('/tmp/ag.');
const profile = mkdtempSync('/tmp/ap.');
const t0 = Date.now();
const log: string[] = [];
let prev = new Set<string>();
const look = () => {
  const now = new Set(readdirSync(tmp));
  for (const n of now) if (!prev.has(n)) log.push(`+${n.replace(/\.[A-Za-z0-9]{6}$/, '')}@${Date.now() - t0}`);
  for (const n of prev) if (!now.has(n)) log.push(`-${n.replace(/\.[A-Za-z0-9]{6}$/, '')}@${Date.now() - t0}`);
  prev = now;
};
const timer = setInterval(look, 20);
const child = spawn(exe, ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=0', `--user-data-dir=${profile}`, ...extra, 'about:blank'],
  { stdio: 'ignore', detached: true, env: { ...process.env, TMPDIR: tmp } });
await new Promise((r) => setTimeout(r, lifeMs));
look();
process.kill(-child.pid!, 'SIGKILL');
await new Promise((r) => setTimeout(r, 1000));
look(); clearInterval(timer);
console.log(log.join(' '), '| after SIGKILL:', readdirSync(tmp).map((n) => `${n}[${(() => { try { return readdirSync(join(tmp, n)).length; } catch { return 'f'; } })()}]`).join(' '));
rmSync(tmp, { recursive: true, force: true }); rmSync(profile, { recursive: true, force: true });
