import test from 'node:test';
import assert from 'node:assert/strict';
import { DECLARED, arenaEnv, cannotRun, skipExitCode } from './arena-scripts-vars.ts';

test('a declared value fills a variable the environment does not carry', () => {
  assert.equal(arenaEnv({}).ARENA_CHECK_STRICT, DECLARED.ARENA_CHECK_STRICT);
  assert.equal(arenaEnv({}).PORT, DECLARED.PORT);
});

test('a real environment variable wins over the declared one', () => {
  assert.equal(arenaEnv({ ARENA_CHECK_STRICT: '0' }).ARENA_CHECK_STRICT, '0');
});

test('CHROME_PATH is recognised and never declared, so the candidate list stays reachable', () => {
  assert.equal(Object.hasOwn(DECLARED, 'CHROME_PATH'), false,
    'a default laid under the environment made every machine look like one where a person had '
    + 'named a browser, which left findChromium unable to reach its own candidate list');
  assert.equal(arenaEnv({}).CHROME_PATH, undefined);
  assert.equal(arenaEnv({ CHROME_PATH: '/opt/other' }).CHROME_PATH, '/opt/other');
});

test('ARENA_BENCHES is recognised and never declared, so a run with no benches looks like one', () => {
  assert.equal(Object.hasOwn(DECLARED, 'ARENA_BENCHES'), false,
    'a declared directory would not be an override but a claim that sixteen built applications sit '
    + 'on this machine, and the site without benches is what every clone builds');
  assert.equal(arenaEnv({}).ARENA_BENCHES, undefined);
  assert.equal(arenaEnv({ ARENA_BENCHES: '/tmp/benches' }).ARENA_BENCHES, '/tmp/benches');
});

test('a variable the repository does not declare passes through untouched', () => {
  assert.equal(arenaEnv({ CI: 'true' }).CI, 'true');
  assert.equal(arenaEnv({}).CI, undefined);
});

test('arenaEnv copies rather than mutating what it was handed', () => {
  const env = {};
  arenaEnv(env);
  assert.deepEqual(env, {});
});

test('skipExitCode is 2 normally and 1 under strict', () => {
  assert.equal(skipExitCode({}), 2);
  assert.equal(skipExitCode({ ARENA_CHECK_STRICT: '1' }), 1);
  assert.equal(skipExitCode({ CI: 'true' }), 1);
});

test('only the exact strings count, so a truthy-looking value does not turn strict on', () => {
  assert.equal(skipExitCode({ ARENA_CHECK_STRICT: 'true' }), 2);
  assert.equal(skipExitCode({ CI: '1' }), 2);
});

test('the repository declares itself strict, so a gate that cannot run fails rather than skips', () => {
  assert.equal(DECLARED.ARENA_CHECK_STRICT, '1');
  assert.equal(skipExitCode(arenaEnv({})), 1);
});

test('called with nothing it reads arenaEnv, which is what makes a declared value reach a gate', () => {
  assert.equal(skipExitCode(), skipExitCode(arenaEnv()));
});

test('an exported ARENA_CHECK_STRICT=0 buys the soft skip back', () => {
  assert.equal(skipExitCode(arenaEnv({ ARENA_CHECK_STRICT: '0' })), 2);
});

function captureExit(run: () => void) {
  const exit = process.exit;
  const error = console.error;
  const said: string[] = [];
  let code: number | undefined;
  try {
    console.error = (...parts: unknown[]) => { said.push(parts.join(' ')); };
    (process as { exit: unknown }).exit = (n?: number) => { code = n; throw new Error('exited'); };
    try { run(); } catch (err) { if ((err as Error).message !== 'exited') throw err; }
  } finally {
    process.exit = exit;
    console.error = error;
  }
  return { code, said: said.join('\n') };
}

test('cannotRun fails under the declared strictness, and names the gate and the reason', () => {
  const { code, said } = captureExit(() => cannotRun('check-cards', 'no browser', arenaEnv({})));
  assert.equal(code, 1);
  assert.match(said, /check-cards/);
  assert.match(said, /FAILED \(strict\)/);
  assert.match(said, /no browser/);
});

test('cannotRun skips where an environment has asked for it, and says what that costs', () => {
  const { code, said } = captureExit(() => cannotRun('check-cards', 'no browser', arenaEnv({ ARENA_CHECK_STRICT: '0' })));
  assert.equal(code, 2);
  assert.match(said, /SKIPPED/);
  assert.match(said, /INCOMPLETE/,
    'a soft skip that does not say the run proves less than it looks like is the failure the '
    + 'strict default exists to prevent');
});
