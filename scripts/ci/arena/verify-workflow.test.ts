import test from 'node:test';
import assert from 'node:assert/strict';
import { callerSelections, runCommands, verifySelection } from './verify-workflow.ts';

const VERIFY = `name: Arena verify

on:
  workflow_call:
    inputs:
      domains:
        type: string
        required: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: bun run build:release
  gates:
    needs: [build]
    runs-on: ubuntu-latest
    steps:
      - name: every gate of the selected domains
        env:
          DOMAINS: \${{ inputs.domains }}
        run: bun scripts/check/arena/check-all.ts --no-tests --domain="$DOMAINS"
  audit:
    needs: [build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v8
        with:
          name: arena-build-\${{ github.run_id }}
      - name: every traced node opens only what it declares
        run: bun scripts/check/arena/check-graph.ts --audit
      - name: the audit rewrote nothing tracked
        run: git diff --exit-code
  suites-scripts:
    needs: [build]
    runs-on: ubuntu-latest
    steps:
      - run: bun run ci:summarize --suite=scripts
  suites-react:
    needs: [build]
    if: contains(format(',{0},', inputs.domains), ',react,')
    runs-on: ubuntu-latest
    steps:
      - run: bun run ci:summarize --suite=react
      - if: \${{ !cancelled() }}
        run: bun run ci:summarize --suite=react-dom
  summarize:
    needs: [suites-scripts, suites-react]
    if: \${{ !cancelled() }}
    runs-on: ubuntu-latest
    env:
      DOMAINS: \${{ inputs.domains }}
    steps:
      - uses: actions/download-artifact@v8
        with:
          pattern: junit-*
          path: .cache/junit
          merge-multiple: true
      - run: bun run ci:summarize --join --domains="$DOMAINS"
`;

const A = '      - name: every traced node opens only what it declares\n        run: bun scripts/check/arena/check-graph.ts --audit\n';
const D = '      - name: the audit rewrote nothing tracked\n        run: git diff --exit-code\n';

const only = (text: string) => verifySelection(text).problems;

test('a run: is read on one line and as a block, and a block ends where its indent does', () => {
  assert.deepEqual(runCommands('    steps:\n      - run: a\n      - run: |\n          b\n          c\n      - name: d\n'),
    ['a', 'b\nc']);
  assert.deepEqual(runCommands('      - name: e\n        run: >-\n          f\n        env:\n          X: y\n'), ['f']);
});

test('a quoted suite name is read without its quotes, and one with an unbalanced quote is a problem', () => {
  for (const quoted of ['"scripts"', "'scripts'"]) {
    const selection = verifySelection(VERIFY.replace('--suite=scripts', `--suite=${quoted}`));
    assert.deepEqual(selection.problems, [], quoted);
    assert.equal(selection.suites.get('scripts')?.job, 'suites-scripts', quoted);
  }
  assert.match(only(VERIFY.replace('--suite=scripts', '--suite="scripts')).join('\n'), /names the suite .* with a quote this reader cannot follow/);
});

test('the gates job, each suite and its domain, and the join are read off the workflow', () => {
  const selection = verifySelection(VERIFY);
  assert.deepEqual(selection.problems, []);
  assert.deepEqual(selection.gates, ['gates']);
  assert.deepEqual(selection.joins, ['summarize']);
  assert.deepEqual(selection.audits, ['audit']);
  assert.deepEqual([...selection.suites], [
    ['scripts', { job: 'suites-scripts', domain: null }],
    ['react', { job: 'suites-react', domain: 'react' }],
    ['react-dom', { job: 'suites-react', domain: 'react' }],
  ]);
});

test('each rule fails on its own mutation, naming what it found', () => {
  const mutations: Record<string, [string, RegExp]> = {
    'suites in the gates job': [VERIFY.replace(' --no-tests', ''), /without --no-tests/],
    'a domain list of its own': [VERIFY.replace('--domain="$DOMAINS"', '--domain=core,arena'), /domains other than the ones its caller/],
    'no DOMAINS from the input': [VERIFY.replace('          DOMAINS: ${{ inputs.domains }}\n', ''), /runs check-all on domains other/],
    'check-all twice': [VERIFY.replace('bun run build:release', 'bun scripts/check/arena/check-all.ts --no-tests'), /2 job\(s\) run check-all/],
    'no gates job': [VERIFY.replace(/ {6}- name: every gate[\s\S]*?--domain="\$DOMAINS"\n/, '      - run: echo none\n'), /0 job\(s\) run check-all/],
    'a suite twice': [VERIFY.replace('--suite=react-dom', '--suite=react'), /the react suite runs in suites-react and in suites-react/],
    'a suite through test:': [VERIFY.replace('bun run ci:summarize --suite=scripts', 'bun run test:scripts'), /runs "bun run test:scripts"/],
    'an if it cannot follow': [VERIFY.replace("if: contains(format(',{0},', inputs.domains), ',react,')", 'if: inputs.react'), /job suites-react has an if: this reader cannot follow/],
    'no join': [VERIFY.replace('bun run ci:summarize --join --domains="$DOMAINS"', 'echo done'), /0 job\(s\) join/],
    'a join on its own domains': [VERIFY.replace('--domains="$DOMAINS"', '--domains=core,arena'), /joins the reports against domains other/],
    'no suite at all': [VERIFY.replace(/bun run ci:summarize --suite=\S+/g, 'echo none'), /no job runs a suite/],
    'gates gated by a domain': [VERIFY.replace('  gates:\n    needs: [build]\n', "  gates:\n    needs: [build]\n    if: contains(format(',{0},', inputs.domains), ',react,')\n"), /job gates carries an if:/],
    'build gated by a domain': [VERIFY.replace('  build:\n', "  build:\n    if: contains(format(',{0},', inputs.domains), ',react,')\n"), /job build carries an if:/],
    'a join with no if': [VERIFY.replace('    if: ${{ !cancelled() }}\n', ''), /join job summarize/],
    'a join gated by a domain': [VERIFY.replace('    if: ${{ !cancelled() }}\n    runs-on', "    if: contains(format(',{0},', inputs.domains), ',react,')\n    runs-on"), /join job summarize/],
    'DOMAINS on another step': [VERIFY.replace('      - name: every gate of the selected domains\n        env:\n          DOMAINS: ${{ inputs.domains }}\n        run:', '      - name: other\n        env:\n          DOMAINS: ${{ inputs.domains }}\n        run: echo other\n      - run:'), /runs check-all on domains other/],
    'a suite step with an if of its own': [VERIFY.replace('      - run: bun run ci:summarize --suite=scripts', "      - name: scripts\n        if: github.event_name == 'push'\n        run: bun run ci:summarize --suite=scripts"), /step of suites-scripts carries an if:/],
    'a join that merges nothing': [VERIFY.replace('          merge-multiple: true\n', ''), /downloads the reports without merge-multiple: true/],
    'a join that reads another pattern': [VERIFY.replace('pattern: junit-*', 'pattern: reports-*'), /downloads the reports without pattern: junit-\*/],
    'a join that downloads nothing': [VERIFY.replaceAll('actions/download-artifact@v8', 'actions/checkout@v7'), /downloads the reports without/],
    'a second suite that a red first one skips': [VERIFY.replace('      - if: ${{ !cancelled() }}\n        run: bun run ci:summarize --suite=react-dom', '      - run: bun run ci:summarize --suite=react-dom'), /suite react-dom of suites-react runs after another suite/],
    'two suites in one step': [VERIFY.replace('      - if: ${{ !cancelled() }}\n        run: bun run ci:summarize --suite=react-dom', '        run: bun run ci:summarize --suite=react-dom'), /two suites in one step/],
    'no audit job': [VERIFY.replace('bun scripts/check/arena/check-graph.ts --audit', 'echo none'), /0 job\(s\) run the graph audit/],
    'two audit jobs': [VERIFY.replace('bun run build:release', 'bun scripts/check/arena/check-graph.ts --audit'), /2 job\(s\) run the graph audit/],
    'an audit with an if': [VERIFY.replace('  audit:\n', "  audit:\n    if: contains(format(',{0},', inputs.domains), ',react,')\n"), /job audit carries an if:/],
    'an audit that needs nothing': [VERIFY.replace('  audit:\n    needs: [build]\n', '  audit:\n'), /job audit does not need build/],
    'an audit that needs more than build': [VERIFY.replace('  audit:\n    needs: [build]\n', '  audit:\n    needs: [build, gates]\n'), /job audit does not need build/],
    'an audit that cannot be read for needs': [VERIFY.replace('  audit:\n    needs: [build]\n', '  audit:\n    needs: [build, "x"]\n'), /job audit has a needs this reader cannot follow/],
    'an audit before the download': [VERIFY.replace('      - uses: actions/download-artifact@v8\n        with:\n          name: arena-build-${{ github.run_id }}\n', '').replace('        run: bun scripts/check/arena/check-graph.ts --audit\n', '        run: bun scripts/check/arena/check-graph.ts --audit\n      - uses: actions/download-artifact@v8\n        with:\n          name: arena-build-${{ github.run_id }}\n'), /runs the graph audit before it downloads/],
    'an audit with no download': [VERIFY.replace('name: arena-build-${{ github.run_id }}', 'name: other'), /runs the graph audit before it downloads/],
    'an audit with no diff step': [VERIFY.replace('        run: git diff --exit-code\n', '        run: echo done\n'), /no git diff --exit-code step after it/],
    'an audit with extra flags': [VERIFY.replace('check-graph.ts --audit', 'check-graph.ts --json --audit'), /runs the graph audit as .* a shape this reader cannot follow/],
    'an audit through the package script': [VERIFY.replace('bun scripts/check/arena/check-graph.ts --audit', 'bun run check:graph -- --audit'), /runs the graph audit as .* a shape this reader cannot follow/],
    'an audit on a later line of a block': [VERIFY.replace('        run: bun scripts/check/arena/check-graph.ts --audit\n', '        run: |\n          echo start\n          bun scripts/check/arena/check-graph.ts --audit --json\n'), /runs the graph audit as "bun scripts\/check\/arena\/check-graph\.ts --audit --json"/],
    'a second audit through the package script': [VERIFY.replace('bun run build:release', 'bun run check:graph -- --audit'), /2 job\(s\) run the graph audit/],
    'an audit and check-all on one line': [VERIFY.replace('bun scripts/check/arena/check-graph.ts --audit', 'bun scripts/check/arena/check-graph.ts --audit && bun scripts/check/arena/check-all.ts'), /job audit runs check-all without --no-tests/],
    'an audit step with an if': [VERIFY.replace('      - name: every traced node opens only what it declares\n', "      - name: every traced node opens only what it declares\n        if: github.event_name == 'push'\n"), /audit step of audit carries an if: or continue-on-error:/],
    'an audit step that continues on error': [VERIFY.replace('      - name: every traced node opens only what it declares\n', '      - name: every traced node opens only what it declares\n        continue-on-error: true\n'), /audit step of audit carries an if: or continue-on-error:/],
    'a download step that continues on error': [VERIFY.replace('      - uses: actions/download-artifact@v8\n        with:\n          name: arena-build', '      - uses: actions/download-artifact@v8\n        continue-on-error: true\n        with:\n          name: arena-build'), /download step of audit carries an if: or continue-on-error:/],
    'a diff step that continues on error': [VERIFY.replace('      - name: the audit rewrote nothing tracked\n', '      - name: the audit rewrote nothing tracked\n        continue-on-error: true\n'), /diff step of audit carries an if: or continue-on-error:/],
    'a diff step with an if': [VERIFY.replace('      - name: the audit rewrote nothing tracked\n', '      - name: the audit rewrote nothing tracked\n        if: ${{ always() }}\n'), /diff step of audit carries an if: or continue-on-error:/],
    'an audit job that continues on error': [VERIFY.replace('  audit:\n', '  audit:\n    continue-on-error: true\n'), /job audit sets continue-on-error: at the job/],
    'a gates job that continues on error': [VERIFY.replace('  gates:\n', '  gates:\n    continue-on-error: true\n'), /job gates sets continue-on-error: at the job/],
    'a suite job that continues on error': [VERIFY.replace('  suites-scripts:\n', '  suites-scripts:\n    continue-on-error: ${{ true }}\n'), /job suites-scripts sets continue-on-error: at the job/],
    'a step whose first key is continue-on-error': [VERIFY.replace('      - name: the audit rewrote nothing tracked\n        run: git diff --exit-code\n', '      - continue-on-error: true\n        name: the audit rewrote nothing tracked\n        run: git diff --exit-code\n'), /diff step of audit carries an if: or continue-on-error:/],
    'a diff step before the audit': [VERIFY.replace('', '').replace(A, '__A__').replace(D, '').replace('__A__', D + A), /no git diff --exit-code step after it audits/],
    'a diff step that tolerates a difference': [VERIFY.replace('run: git diff --exit-code', 'run: git diff --exit-code || true'), /no git diff --exit-code step after it audits/],
    'a download named for the build whose artifact is another': [VERIFY.replace('        with:\n          name: arena-build-${{ github.run_id }}\n', '        with:\n          name: other\n').replace('      - uses: actions/download-artifact@v8\n        with:\n          name: other', '      - name: arena-build-${{ github.run_id }}\n        uses: actions/download-artifact@v8\n        with:\n          name: other'), /before it downloads/],
    'a job it cannot read': [VERIFY.replace('  suites-scripts:', '  "suites-scripts":'), /sits where a job key goes/],
  };
  for (const [name, [text, pattern]] of Object.entries(mutations)) {
    assert.match(only(text).join('\n'), pattern, name);
  }
});

const caller = (job: string, uses: string, domains: string | null) => ({
  file: `${job}.yml`,
  text: `name: x\njobs:\n  ${job}:\n    uses: ${uses}\n${domains === null ? '' : `    with:\n      domains: ${domains}\n`}`,
});

test('a caller is a job that uses verify.yml, and it says which domains it selects', () => {
  const { callers, problems } = callerSelections([
    caller('develop', './.github/workflows/verify.yml', 'core,react,angular,tailwind,arena'),
    caller('pr', './.github/workflows/verify.yml', '${{ needs.changes.outputs.domains }}'),
    { file: 'other.yml', text: 'name: y\njobs:\n  a:\n    runs-on: x\n' },
  ]);
  assert.deepEqual(problems, []);
  assert.deepEqual(callers, [
    { file: 'develop.yml', job: 'develop', domains: 'core,react,angular,tailwind,arena' },
    { file: 'pr.yml', job: 'pr', domains: '${{ needs.changes.outputs.domains }}' },
  ]);
});

test('a caller with no domains, one naming verify.yml another way, and no caller at all are each a problem', () => {
  assert.match(callerSelections([caller('main', './.github/workflows/verify.yml', null)]).problems.join('\n'),
    /job main calls verify\.yml with no domains:/);
  assert.match(callerSelections([caller('main', 'dravensoft-dev/arena/.github/workflows/verify.yml@main', 'core')]).problems.join('\n'),
    /job main names verify\.yml in a shape this reader cannot follow/);
  assert.match(callerSelections([{ file: 'a.yml', text: 'jobs:\n  a:\n    runs-on: x\n' }]).problems.join('\n'),
    /no workflow calls/);
});
