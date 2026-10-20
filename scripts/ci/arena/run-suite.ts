/* What `bun run test` and its four narrower siblings spawn, taken from `check-all.ts` rather than
 * restated in package.json. The two had already drifted: the manifest wrapped both the ignore
 * glob and the positional filter in single quotes, and check-all spelled them bare, because its
 * argv goes to spawnSync with no shell in between. Which of them is right depends on
 * the shell, and cmd.exe leaves a single quote in the argument rather than stripping it, so the
 * pair could disagree on Windows while agreeing here. Making the manifest CONSUME the authority
 * ends the question instead of answering it, and every quote character leaves package.json with
 * the same edit. It stays a runner and holds no list. A step whose temp root holds anything when it
 * ends fails, naming the entries, whatever the step's own result was. */

import { spawnSync } from 'node:child_process';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { leftoverLine, suiteTmp } from '../../lib/arena/suite-tmp.ts';
import { suiteSteps } from '../../check/arena/check-all.ts';

export function runSuite(name: string, steps: { name: string; args: string[] }[] = suiteSteps(name)) {
  for (const step of steps) {
    console.log(`\n> ${step.name}\n`);
    const scratch = suiteTmp();
    let r;
    let left: string[] = [];
    try {
      r = spawnSync(process.execPath, step.args, { stdio: 'inherit', cwd: repoRoot, env: scratch.env });
      left = scratch.left();
    } finally {
      scratch.remove();
    }
    if (left.length > 0) console.error(`run-suite: ${leftoverLine(step.name, left)}`);
    if (r.error) {
      console.error(`run-suite: failed to spawn: ${r.error.message || r.error}`);
      return 1;
    }
    if (r.status !== 0) return r.status ?? 1;
    if (left.length > 0) return 1;
  }
  return 0;
}

function main() {
  const [name] = process.argv.slice(2);
  if (!name) {
    console.error('run-suite: name a suite, as `bun scripts/ci/arena/run-suite.ts all`');
    process.exit(1);
  }
  try {
    process.exit(runSuite(name));
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}

if (isMainModule(import.meta.url)) main();
