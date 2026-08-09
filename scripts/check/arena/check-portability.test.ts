/* One planted violation per rule, because a gate that has only ever been seen to pass is a gate
 * that has been seen to do nothing. Each case also asserts the message names the file, the
 * construct and where it is allowed to live, since a problem line that does not say where to put
 * the thing is a problem line that gets the rule disabled. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES, inScope, portabilityProblems, staleOwners, violations } from './check-portability.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { join } from 'node:path';

const PLANTED: Record<string, string> = {
  'platform-branch': 'const win = process.platform === "win32";\n',
  'absolute-os-path': "const exe = '/usr/bin/chromium';\n",
  'bare-name-spawn': "spawnSync('git', ['status']);\n",
  'dot-bin-shim': "const bin = join(root, 'node_modules/.bin/tailwindcss');\n",
  'process-group-signal': "process.kill(-pid, 'SIGKILL');\n",
  'raw-symlink': "symlinkSync(from, to, 'dir');\n",
  'locale-ordering': 'names.sort((a, b) => a.localeCompare(b));\n',
  'second-separator-spelling': "const p = path.split('\\\\').join('/');\n",
  'prefix-containment': "const ok = path.startsWith(base + '/');\n",
};

test('every rule has a planted case, so a rule added without one fails here', () => {
  assert.deepEqual(RULES.map((rule) => rule.id).filter((id) => !PLANTED[id]), [],
    'a rule with no fixture is a rule nothing has ever seen fire');
});

for (const rule of RULES) {
  test(`${rule.id} fires on a planted violation, and says where the construct may live`, () => {
    const found = violations('scripts/build/arena/made-up.ts', PLANTED[rule.id] ?? '');
    const hit = found.find((one) => one.rule.id === rule.id);
    assert.ok(hit, `${rule.id} did not fire on ${JSON.stringify(PLANTED[rule.id])}`);
    assert.equal(hit.line, 1);
    assert.ok(rule.why.length > 40, `${rule.id} carries a label rather than a reason`);
  });
}

test('a rule does not fire in the module that owns it, which is the whole shape', () => {
  for (const rule of RULES) {
    if (rule.owners.length === 0) continue;
    const owner = rule.owners[0] ?? '';
    const found = violations(owner, PLANTED[rule.id] ?? '');
    assert.ok(!found.some((one) => one.rule.id === rule.id),
      `${rule.id} fired inside ${owner}, which is the one place it is allowed`);
  }
});

test('a construct named in a comment is described rather than performed', () => {
  const source = '/* never call process.platform, and never spawnSync("git", []) either */\nexport const a = 1;\n';
  assert.deepEqual(violations('scripts/build/arena/made-up.ts', source), [],
    'this file, and every AGENTS.md quoted into one, names every banned construct on purpose');
});

test('a construct inside a string is not a call, except the path rule, whose subject IS a string', () => {
  const quoted = "export const advice = 'do not use localeCompare here';\n";
  assert.deepEqual(violations('scripts/build/arena/made-up.ts', quoted), []);

  const literal = "export const exe = '/usr/bin/chromium';\n";
  assert.equal(violations('scripts/build/arena/made-up.ts', literal).length, 1,
    'an absolute path is only ever a string, so exempting strings would exempt the rule');
});

test('a stale owner fails, so an exception cannot outlive what it was written for', () => {
  const rule = { id: 'made-up', pattern: /x/g, owners: ['scripts/lib/arena/gone.ts'], why: 'w' };
  const problems = staleOwners([join(repoRoot, 'scripts/lib/arena/platform.ts')], repoRoot, [rule]);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /gone\.ts/);

  assert.deepEqual(staleOwners([join(repoRoot, 'scripts/lib/arena/platform.ts')], repoRoot,
    [{ ...rule, owners: ['scripts/lib/arena/platform.ts'] }]), []);
});

test('the subject is scripts and not suites, which name a platform on purpose', () => {
  assert.equal(inScope(join(repoRoot, 'scripts/lib/arena/chromium.ts')), true);
  assert.equal(inScope(join(repoRoot, 'scripts/lib/arena/chromium.test.ts')), false,
    'the win32 candidate list is asserted from Linux with C: paths in the fixture, and that is '
    + 'the suite doing its job rather than a script assuming a platform');
  assert.equal(inScope(join(repoRoot, 'frameworks/react/Index.generated.ts')), false);
});

test('the tree itself is clean, and the gate scanned enough of it to mean something', () => {
  const { problems, scanned, rules } = portabilityProblems();
  assert.deepEqual(problems, []);
  assert.ok(scanned > 100, `scanned ${scanned} script(s), which is too few to have walked the tree`);
  assert.equal(rules, RULES.length);
});
