import { test } from 'node:test';
import { spawn } from 'node:child_process';
const t0 = Date.now();
test('promise that never settles, timer keeps loop alive', { timeout: 500 }, async () => {
  setInterval(() => {}, 1000);
  await new Promise(() => {});
});
test('awaits a child that never exits', { timeout: 500 }, async () => {
  const c = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)']);
  await new Promise((r) => c.once('exit', r));
});
test('after', () => { console.log('elapsed', Date.now() - t0); });
