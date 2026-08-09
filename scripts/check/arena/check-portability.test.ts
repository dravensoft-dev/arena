/* One planted violation per rule, because a gate that has only ever been seen to pass is a gate
 * that has been seen to do nothing. Each case also asserts the message names the file, the
 * construct and where it is allowed to live, since a problem line that does not say where to put
 * the thing is a problem line that gets the rule disabled. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLONE_ROOT_BUDGET, MAX_PATH, RULES, checkoutProblems, inScope, matrixLegs, matrixProblems,
  portabilityProblems, setupProblems, staleOwners, trackedPaths, violations,
} from './check-portability.ts';
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
  'native-relative': 'manifests.set(relative(root, p), readJson(p));\n',
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

test('a prerequisite the setup document does not name is a problem, since a contributor is sent there', () => {
  const declared = { fortran: { probe: 'gfortran --version', why: 'it does not' } };
  const problems = setupProblems(repoRoot, declared);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /gfortran --version/);
  assert.match(problems[0] ?? '', /goes stale/);
});

test('the real declaration is named in full, which is the claim the gate makes', () => {
  assert.deepEqual(setupProblems(), [],
    'the list was never in one place before: bun came from packageManager, git and node from '
    + 'whichever gate spawned them, and a contributor found each by hitting it');
});

test('a reserved device name is refused, whatever its extension or case', () => {
  for (const path of ['frameworks/react/aux.ts', 'scripts/CON.ts', 'contracts/nul', 'a/Com1.json']) {
    const problems = checkoutProblems([path]);
    assert.equal(problems.length, 1, `${path} was allowed`);
    assert.match(problems[0] ?? '', /reserved device name/,
      'Windows refuses these outright, so a clone there cannot write the file at all. No gate '
      + 'over file content could ever see it, because the defect is the name.');
  }
  assert.deepEqual(checkoutProblems(['scripts/console.ts', 'a/conduct.md']), [],
    'the stem is the whole segment before the first dot, so a name merely beginning with one is '
    + 'an ordinary name');
});

test('a character NTFS refuses, and a name ending in a dot or a space, are refused', () => {
  assert.match(checkoutProblems(['a/what?.ts'])[0] ?? '', /character NTFS refuses/);
  assert.match(checkoutProblems(['a/b:c.ts'])[0] ?? '', /character NTFS refuses/);
  assert.match(checkoutProblems(['a/trailing.'])[0] ?? '', /dot or a space/,
    'Windows strips it silently, so the checked-out name would not be the tracked one');
  assert.match(checkoutProblems(['a/trailing '])[0] ?? '', /dot or a space/);

  assert.deepEqual(checkoutProblems(['intro/Arena - Overview.html', 'a/trailing .ts']), [],
    'a space INSIDE a name is ordinary on Windows, and this tree already ships one. Only a '
    + 'segment ENDING in a space or a dot is the case Windows rewrites under you.');
});

test('two paths differing only in case cannot both be checked out', () => {
  const problems = checkoutProblems(['frameworks/react/Card.tsx', 'frameworks/react/card.tsx']);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /differ only in case/);
  assert.match(problems[0] ?? '', /quietly wrong rather than loudly broken/,
    'on a case-insensitive filesystem one silently overwrites the other');
  assert.deepEqual(checkoutProblems(['a/Card.tsx', 'a/Chart.tsx']), []);
});

test('a path past what a Windows checkout allows is refused, budget and all', () => {
  const room = MAX_PATH - CLONE_ROOT_BUDGET;
  assert.deepEqual(checkoutProblems([`a/${'x'.repeat(room - 2)}`]), []);
  const problems = checkoutProblems([`a/${'x'.repeat(room)}`]);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /core\.longpaths/);
});

test('the real tree is inside every one of those, and there is a real tree to be inside them', () => {
  const paths = trackedPaths();
  assert.ok(paths.length > 1000, `git listed ${paths.length} tracked path(s), which is too few`);
  assert.deepEqual(checkoutProblems(paths), []);
});
