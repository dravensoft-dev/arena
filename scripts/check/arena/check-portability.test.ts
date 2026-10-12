/* One planted violation per rule, because a gate that has only ever been seen to pass is a gate
 * that has been seen to do nothing. Each case also asserts the message names the file, the
 * construct and where it is allowed to live, since a problem line that does not say where to put
 * the thing is a problem line that gets the rule disabled. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLONE_ROOT_BUDGET, MATRIX_WORKFLOW, MAX_PATH, PR_WORKFLOW, REQUIRED_JOB, RULES, SUITE_RULES,
  WORKFLOWS, browserNamingProblems, browserPathProblems, browserWorkflows, checkoutProblems, declaredNeeds, gateProblems,
  inScope, inSuiteScope, jobBlocks, jobShapeProblems, matrixLegs, matrixProblems, needsProblems,
  portabilityProblems, setupProblems, staleOwners, trackedPaths, violations,
} from './check-portability.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';

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
  'called-skip': "test('x', (t) => { t.skip('no browser here'); });\n",
  'host-separator': "import { join, sep } from 'node:path';\n",
  'sliced-relative': 'const rel = path.slice(root.length + 1);\n',
  'slash-index': "const dir = path.slice(0, path.lastIndexOf('/'));\n",
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

test('the separator rules read a suite as well, and the rest still leave one alone', () => {
  assert.equal(inSuiteScope(join(repoRoot, 'scripts/lib/arena/chromium.test.ts')), true);
  assert.equal(inSuiteScope(join(repoRoot, 'scripts/lib/arena/chromium.ts')), false);
  assert.equal(inSuiteScope(join(repoRoot, 'frameworks/react/Index.test.ts')), false);

  assert.ok(SUITE_RULES.length > 0 && SUITE_RULES.length < RULES.length,
    'a set that is empty scans nothing and one that is every rule makes the distinction dead');

  const suite = 'scripts/lib/arena/made-up.test.ts';
  assert.deepEqual(violations(suite, PLANTED['bare-name-spawn'] ?? '', SUITE_RULES), [],
    'a suite spawning a bare name in a fixture is describing a platform, which is what it is for');
  assert.equal(violations(suite, PLANTED['native-relative'] ?? '', SUITE_RULES).length, 1,
    'a native path in a suite becomes an expected value spelled for one operating system, and '
    + 'the assertion then passes on the machine that wrote it and nowhere else');
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

const WORKFLOW = `name: Arena PR

on:
  pull_request:
    branches: [main]

jobs:
  changes:
    runs-on: ubuntu-latest
  build:
    needs: [changes]
    runs-on: ubuntu-latest
  portable:
    runs-on: \${{ matrix.os }}
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            blocking: true
  pr-gate:
    needs: [changes, build, portable]
    runs-on: ubuntu-latest
`;

test('a job key is found and a trigger above it is not, so the block map is the job list', () => {
  assert.deepEqual([...jobBlocks(WORKFLOW).keys()], ['changes', 'build', 'portable', 'pr-gate'],
    'pull_request sits at two spaces as well, and it is above jobs: rather than inside it');
  assert.equal(jobBlocks('name: nothing\n').size, 0);
});

test('needs is read in both spellings, since either is valid YAML and one is easier to append to', () => {
  assert.deepEqual(declaredNeeds('  pr-gate:\n    needs: [a, b]\n'), ['a', 'b']);
  assert.deepEqual(declaredNeeds('  pr-gate:\n    needs:\n      - a\n      - b\n'), ['a', 'b']);
  assert.deepEqual(declaredNeeds('  pr-gate:\n    runs-on: ubuntu-latest\n'), []);
});

test('a job the gate does not name is the whole failure, and the message says what it costs', () => {
  const problems = needsProblems(WORKFLOW.replace('[changes, build, portable]', '[changes, build]'));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /does not name portable/,
    'this is the exact shape the tree was in: portability ran, and the one required check was '
    + 'green whatever it answered');
  assert.match(problems[0] ?? '', /green gate over a red job/);
});

test('a name in needs that is no job is the same rule read the other way', () => {
  const problems = needsProblems(WORKFLOW.replace('portable]', 'portability]'));
  assert.equal(problems.length, 2, 'portable is unnamed and portability is nothing');
  assert.match(problems.join('\n'), /waits for nothing and says it waited/);
});

test('a workflow with no gate at all fails rather than passing for lack of anything to check', () => {
  const problems = needsProblems(WORKFLOW.replace('  pr-gate:', '  something-else:'));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /declares no pr-gate/);
});

test('the real pr.yml holds, and the matrix is deliberately not a name it waits for', () => {
  assert.deepEqual(gateProblems(), []);
  const gate = jobBlocks(readFileSync(join(repoRoot, WORKFLOWS, PR_WORKFLOW), 'utf8'))
    .get(REQUIRED_JOB) ?? '';
  assert.ok(!(declaredNeeds(gate) ?? []).includes('portable'),
    'needs cannot cross workflows, so a matrix in develop.yml is one pr-gate cannot read, and a '
    + 'name here for a job that is not in this file would make the gate wait for nothing');
  assert.ok(matrixLegs(readFileSync(join(repoRoot, WORKFLOWS, MATRIX_WORKFLOW), 'utf8')).size > 0,
    'so the branch is what carries the answer instead: the matrix runs on the merge into develop '
    + 'and a merge request to main is opened on a green develop');
});

test('a matrix that disagrees with the declaration fails, whichever way it disagrees', () => {
  const lying = { 'ubuntu-latest': { blocking: false, why: 'it is, and this says otherwise' } };
  assert.match(matrixProblems(repoRoot, lying).join('\n'), /says ubuntu-latest is not blocking/);

  const absent = { solaris: { blocking: true, why: 'no runner offers it' } };
  assert.match(matrixProblems(repoRoot, absent).join('\n'), /the matrix does not run it/);
});


const CALLER = `name: Arena PR

on:
  pull_request:
    branches: [main]

jobs:
  changes:
    runs-on: ubuntu-latest
  verify:
    needs: [changes]
    uses: ./.github/workflows/verify.yml
    with:
      domains: \${{ needs.changes.outputs.domains }}
  pr-gate:
    needs: [changes, verify]
    runs-on: ubuntu-latest
`;

test('a job that calls a workflow has uses: and no steps:, and it is a job like any other', () => {
  assert.deepEqual([...jobBlocks(CALLER).keys()], ['changes', 'verify', 'pr-gate']);
  assert.deepEqual(jobShapeProblems('pr.yml', CALLER), []);
  assert.deepEqual(needsProblems(CALLER), []);
  assert.match(needsProblems(CALLER.replace('[changes, verify]', '[changes]')).join('\n'), /does not name verify/);
});

test('a top-level key after jobs: is no job, the bound jobShapeProblems stops at as well', () => {
  const after = `${CALLER}\nconcurrency:\n  group: x\non:\n  workflow_dispatch:\n`;
  assert.deepEqual([...jobBlocks(after).keys()], ['changes', 'verify', 'pr-gate']);
  assert.deepEqual(jobShapeProblems('pr.yml', after), []);
});

test('needs is read as one name and with a comment after it, and a shape it cannot read is refused', () => {
  assert.deepEqual(declaredNeeds('  pr-gate:\n    needs: changes\n'), ['changes']);
  assert.deepEqual(declaredNeeds('  pr-gate:\n    needs: [a, b] # both\n'), ['a', 'b']);
  assert.deepEqual(declaredNeeds('  pr-gate:\n    needs: # both\n      - a\n      - b\n'), ['a', 'b']);
  for (const shape of ['    needs: >-\n      a\n', '    needs: [a, b\n', '    needs: *all\n', '    needs:\n        - a\n']) {
    assert.equal(declaredNeeds(`  pr-gate:\n${shape}`), null, shape);
  }
  assert.deepEqual(declaredNeeds('  pr-gate:\n    needs:\n      - changes\n      - verify # the call\n    runs-on: x\n'), ['changes', 'verify']);
  assert.deepEqual(declaredNeeds('  pr-gate:\n    needs:\n      - a # first\n      # between\n      - b\n'), ['a', 'b']);
  for (const shape of ['    needs: [\'a\', b]\n', '    needs:\n      - a\n      - "b"\n', '    needs:\n      - a\n        - b\n', '    needs:\n      - a b\n']) {
    assert.equal(declaredNeeds(`  pr-gate:\n${shape}`), null, shape);
  }
  const problems = needsProblems(CALLER.replace('needs: [changes, verify]', 'needs: >-\n      changes'));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /pr-gate's needs is in a shape this gate cannot read/);
});

test('a job layout the gate cannot read is a problem naming the line, and never a job it skipped', () => {
  const shapes: Record<string, [string, RegExp]> = {
    'a job four spaces in': [CALLER.replace('  changes:\n', '    changes:\n'), /no job this gate can read|sits where a job key goes/],
    'a quoted job key': [CALLER.replace('  changes:', '  "changes":'), /:8: "\\"changes\\":" sits where a job key goes/],
    'a job as a flow mapping': [CALLER.replace('  pr-gate:\n    needs: [changes, verify]\n    runs-on: ubuntu-latest\n',
      '  pr-gate: { runs-on: ubuntu-latest }\n'), /"pr-gate: \{ runs-on: ubuntu-latest \}" sits where a job key goes/],
    'a key one space in': [CALLER.replace('  verify:', ' verify:'), /" verify:"|"verify:" sits where a job key goes/],
    'no jobs line': [CALLER.replace('jobs:', 'job:'), /has no top-level jobs: line/],
    'jobs with nothing in it': ['name: x\njobs:\n', /declares no job this gate can read/],
  };
  for (const [name, [text, pattern]] of Object.entries(shapes)) {
    const problems = jobShapeProblems('pr.yml', text);
    assert.ok(problems.length >= 1, name);
    assert.match(problems.join('\n'), pattern, name);
  }
  assert.deepEqual(jobShapeProblems('pr.yml', CALLER.replace('jobs:', 'jobs: # the graph')), [],
    'a comment after jobs: is still the jobs line');
});

const realWorkflows = () => readdirSync(join(repoRoot, WORKFLOWS)).filter((file) => file.endsWith('.yml')).sort();

test('the real pr.yml reads whole, and so does every workflow the gate opens', () => {
  const files = realWorkflows();
  assert.ok(files.length > 1);
  for (const file of files) {
    const text = readFileSync(join(repoRoot, WORKFLOWS, file), 'utf8');
    assert.deepEqual(jobShapeProblems(file, text), [], file);
    assert.ok(jobBlocks(text).size > 0, `${file} reads as no job at all`);
  }
});

const named = (file: string, line: string) => ({ file, text: `name: x\nenv:\n${line}\njobs:\n  a:\n    runs-on: x\n` });

test('exactly one workflow names a browser, by its own CHROME_PATH or by the chrome-path it passes', () => {
  assert.deepEqual(browserNamingProblems([named('main.yml', '  CHROME_PATH: /usr/bin/google-chrome'), named('pr.yml', '')]), []);
  assert.deepEqual(browserNamingProblems([
    named('main.yml', '      chrome-path: /usr/bin/google-chrome'),
    named('verify.yml', '  CHROME_PATH: ${{ inputs.chrome-path }}'),
    named('pr.yml', ''),
  ]), [], 'the workflow that hands the input on as CHROME_PATH names no browser of its own');
  assert.match(browserNamingProblems([named('pr.yml', '')]).join('\n'), /no workflow names a browser/);
  assert.match(browserNamingProblems([named('verify.yml', '  CHROME_PATH: ${{ inputs.chrome-path }}')]).join('\n'),
    /no workflow names a browser/);
  assert.match(browserNamingProblems([
    named('main.yml', '      chrome-path: /usr/bin/google-chrome'),
    named('pages.yml', '  CHROME_PATH: /usr/bin/chromium'),
    named('verify.yml', '  CHROME_PATH: ${{ inputs.chrome-path }}'),
  ]).join('\n'), /main\.yml, pages\.yml all name a browser/);
});

test('an empty chrome-path names nothing, and one passed with no workflow handing it on reaches no gate', () => {
  for (const empty of ["      chrome-path: ''", '      chrome-path:', '      chrome-path: # none']) {
    assert.match(browserNamingProblems([named('pr.yml', empty), named('verify.yml', '  CHROME_PATH: ${{ inputs.chrome-path }}')])
      .join('\n'), /no workflow names a browser/, empty);
  }
  const lost = browserNamingProblems([named('main.yml', '      chrome-path: /usr/bin/google-chrome')]);
  assert.equal(lost.length, 1);
  assert.match(lost[0] ?? '', /main\.yml pass chrome-path and no workflow hands it on as CHROME_PATH/);
});

test('a browser named by an input default, or in a shape the gate cannot read, is not a skipped line', () => {
  const conduit = named('verify.yml', '  CHROME_PATH: ${{ inputs.chrome-path }}');
  const declared = (value: string) => ({
    file: 'verify.yml',
    text: `name: x\non:\n  workflow_call:\n    inputs:\n      chrome-path:\n        type: string\n        default: ${value}\n`
      + 'env:\n  CHROME_PATH: ${{ inputs.chrome-path }}\njobs:\n  a:\n    runs-on: x\n',
  });
  const main = named('main.yml', '      chrome-path: /usr/bin/google-chrome');
  assert.deepEqual(browserNamingProblems([main, declared("''"), named('pr.yml', '')]), []);
  assert.match(browserNamingProblems([main, declared('/usr/bin/chromium')]).join('\n'), /main\.yml, verify\.yml all name a browser/);
  assert.match(browserNamingProblems([declared('"/usr/bin/chromium"'), main]).join('\n'), /all name a browser/);
  const shapes: Record<string, string> = {
    'a flow with:': '    with: { chrome-path: /usr/bin/google-chrome }',
    'a quoted input key': '      "chrome-path": /usr/bin/google-chrome',
    'a quoted env key': '  "CHROME_PATH": /usr/bin/google-chrome',
    'a use in an expression': '    if: inputs.chrome-path != \'\'',
  };
  for (const [name, line] of Object.entries(shapes)) {
    assert.match(browserNamingProblems([named('main.yml', '      chrome-path: /usr/bin/google-chrome'), conduit, named('pr.yml', line)])
      .join('\n'), /pr\.yml:3: .* names the browser in a shape this gate cannot read/, name);
  }
  assert.deepEqual(browserNamingProblems([named('main.yml', '      chrome-path: /usr/bin/google-chrome'), conduit,
    named('pr.yml', '  # CHROME_PATH is not exported here\n      - name: a browser, and CHROME_PATH is deliberately not exported')]), []);
});

test('the real workflows name one browser between them, and the gate read every one of them', () => {
  assert.deepEqual(browserPathProblems(), []);
  assert.deepEqual(browserWorkflows().map((one) => one.file.split('/').pop()).sort(), realWorkflows());
});
