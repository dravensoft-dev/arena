/* Proves the emitted per-component CSS paints what the manifest's own class string paints.
 * The oracle is `Utilities.generated.css`, which is why that file survives as a build-time
 * artifact after it stops being published. Both sides are measured in one document, so only
 * the thing under test differs, and reduced motion is measured as a second pass because a
 * `motion-reduce:` variant is hoisted to a sibling `@media` block rather than interleaved
 * the way `@layer utilities` orders it, which is the axis most likely to regress and the one
 * a default `getComputedStyle` cannot reach. * A ParityPass is one run of the page: how many cases it compared, and the ones whose
 * two layers disagreed. */

import { withTimeout } from '../../utils/with-timeout.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { startStaticServer } from '../../lib/arena/static-server.ts';
import { browserOrExit, launchChromium } from '../../lib/arena/chromium.ts';
import { cannotRun } from '../../lib/arena/arena-scripts-vars.ts';
import { connect } from '../../lib/arena/cdp.ts';
import type { Cdp } from '../../lib/arena/cdp.ts';
import { COMPARE_SCRIPT } from '../../lib/tailwind/style-parity.ts';
import { CONSUME, MANIFESTS } from '../../build/tailwind/build-tailwind.ts';
import { PAGE } from '../../build/tailwind/build-style-parity-page.ts';

export { PAGE };

export const node = {
  name: 'check:style-parity',
  reads: [PAGE, MANIFESTS, `${CONSUME}/**/*.css`],
  writes: [],
  feeds: [],
};
const TIMEOUT_MS = 60_000;

export async function measure(cdp: Cdp, url: string, reducedMotion: boolean) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  try {
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }],
    }, sessionId);
    await withTimeout(cdp.send('Page.navigate', { url }, sessionId), TIMEOUT_MS, `${url}: navigate stalled`);
    const { result, exceptionDetails } = await withTimeout(
      cdp.send('Runtime.evaluate', { expression: COMPARE_SCRIPT, awaitPromise: true, returnByValue: true }, sessionId),
      TIMEOUT_MS, `${url}: evaluate stalled`,
    );
    if (exceptionDetails) throw new Error(`${url}: ${exceptionDetails.text} ${exceptionDetails.exception?.description ?? ''}`);
    return result.value;
  } finally {
    try { await cdp.send('Target.closeTarget', { targetId }); } catch {  }
  }
}

type ParityPass = {
  compared: number;
  mismatches: { id: string; differing: string[] }[];
};

export function problemsFrom(pass: ParityPass, label: string) {
  if (pass.compared === 0) {
    return [`${label}: the page mounted no case at all, so this run proves nothing`];
  }
  return pass.mismatches.map(({ id, differing }) =>
    `${label}: ${id} does not match its manifest's own class string: ${differing.join('; ')}`);
}

const skip: (reason: string) => never = (reason) => cannotRun('check-style-parity', reason);

async function main() {
  const exe = browserOrExit('check-style-parity');

  const server = await startStaticServer(root);
  let chrome;
  let cdp;
  try {
    chrome = await launchChromium(exe);
    cdp = await connect(chrome.wsUrl);
  } catch (err) {
    await server.close();
    chrome?.kill();
    skip(`${exe} could not be driven: ${(err as Error).message}`);
  }

  const problems = [];
  let compared = 0;
  try {
    const url = `http://127.0.0.1:${server.port}/${PAGE}`;
    const passes: [string, boolean][] = [['at rest', false], ['under reduced motion', true]];
    for (const [label, reduced] of passes) {
      const pass = await measure(cdp, url, reduced);
      compared += pass.compared;
      problems.push(...problemsFrom(pass, label));
    }
  } finally {
    cdp.close();
    chrome.kill();
    await server.close();
  }

  if (problems.length > 0) {
    for (const problem of problems.slice(0, 40)) console.error(problem);
    if (problems.length > 40) console.error(`...and ${problems.length - 40} more`);
    console.error(`check-style-parity: ${problems.length} mismatch(es) across ${compared} comparison(s)`);
    process.exit(1);
  }
  console.log(`check-style-parity: ${compared} rendered comparison(s) match the manifest they came `
    + 'from, at rest and under reduced motion');
}

if (isMainModule(import.meta.url)) await main();
