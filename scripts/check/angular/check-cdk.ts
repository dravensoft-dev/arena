/* The CDK overlay bridge fails silently three ways: a sheet it stops importing, an import that resolves to nothing, and a published copy that drifts from the installed CDK. Every pane the pinned CDK opens sits in the top layer, where no z-index reaches, so a rule in the bridge orders nothing. What the gate cannot check is how a pane paints. */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { parseDecls } from '../../lib/arena/css-decls.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { captured } from '../../utils/captures.ts';
import { arenaEnv, refuseWhen, unassembledReason } from '../../lib/arena/arena-scripts-vars.ts';
import { cdkVersion, inlineCdkPrebuilt } from '../../lib/arena/package-assembly.ts';

const BRIDGE = 'frameworks/angular/theme/arena-cdk.css';
const PREBUILT = 'node_modules/@angular/cdk/overlay-prebuilt.css';
const PUBLISHED = 'frameworks/angular/dist/css/arena-cdk.css';

export const node = {
  name: 'check:cdk',
  reads: [BRIDGE,
    'package.json', 'bun.lock', PUBLISHED],
  writes: [],
  feeds: [],
};

export function bridgeSelectors(css: string) {
  const out = new Set<string>();
  const noAtRules = css.replace(/@[a-z-]+[^;{}]*;/gi, '');
  for (const selector of parseDecls(noAtRules).keys())
    for (const one of selector.split(',')) if (one.trim()) out.add(one.trim());
  return out;
}

export function importedSheets(css: string) {
  const out = new Set<string>();
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of stripped.matchAll(/@import\s+['"]([^'"]+)['"]/g)) out.add(captured(m));
  return out;
}

export function checkBridge(bridgeCss: string, resolveSheet: (sheet: string) => boolean) {
  const errs = [];
  const selectors = [...bridgeSelectors(bridgeCss)].sort();
  const imported = importedSheets(bridgeCss);

  if (selectors.length)
    errs.push(`${BRIDGE} declares ${selectors.join(', ')}, and every pane the pinned @angular/cdk opens sits in the top layer, where a rule of the bridge orders nothing`);
  if (imported.size === 0)
    errs.push(`${BRIDGE} imports no stylesheet — the CDK overlay needs its prebuilt structural CSS in scope, and without it every overlay renders unpositioned`);

  for (const sheet of [...imported].sort())
    if (!resolveSheet(sheet))
      errs.push(`@import '${sheet}' resolves to no file under node_modules — the import is silently dropped and every overlay renders unpositioned`);

  return errs;
}

export function publishedBridgeProblems(published: string, bridgeSource: string, prebuilt: string, version: string) {
  const errs: string[] = [];
  const stripped = published.replace(/\/\*[\s\S]*?\*\//g, '');
  const bare = [...stripped.matchAll(/@import\s+(?:url\(\s*)?['"]([^'"]+)['"]/g)].map((m) => captured(m)).filter((spec) => !/^\.{1,2}\//.test(spec));
  if (bare.length) errs.push(`${PUBLISHED} has an @import of ${bare.map((b) => `'${b}'`).join(', ')} — a bare specifier needs the resolver to know the CDK's style condition, and esbuild without it cannot`);
  if (published !== inlineCdkPrebuilt(bridgeSource, prebuilt, version))
    errs.push(`${PUBLISHED} is not the bridge with the installed @angular/cdk ${version} overlay-prebuilt.css inlined in place of its import, byte for byte — the overlay renders unpositioned, with rules the installed CDK no longer has, or with a rule ahead of the CDK's own`);
  return errs;
}

function main() {
  const prebuilt = join(repoRoot, PREBUILT);
  if (!existsSync(prebuilt)) {
    console.error(`check-cdk: ${PREBUILT} not found. @angular/cdk is a devDependency of this repo and the bridge cannot be verified without it — run bun install.`);
    process.exit(1);
  }
  const css = readFileSync(join(repoRoot, BRIDGE), 'utf8');
  const errs = checkBridge(css, (sheet: string) => existsSync(join(repoRoot, 'node_modules', sheet)));

  if (errs.length) {
    console.error(`check-cdk: ${errs.length} problem${errs.length === 1 ? '' : 's'} in ${BRIDGE}\n`);
    for (const e of errs) console.error(`  ${e}`);
    process.exit(1);
  }
  const published = join(repoRoot, PUBLISHED);
  refuseWhen('check:cdk', existsSync(published) ? null : unassembledReason(['frameworks/angular/dist']), arenaEnv());
  const bad = publishedBridgeProblems(readFileSync(published, 'utf8'), css, readFileSync(prebuilt, 'utf8'), cdkVersion(repoRoot));
  if (bad.length) {
    console.error(`check-cdk: ${bad.length} problem${bad.length === 1 ? '' : 's'} in ${PUBLISHED}\n`);
    for (const e of bad) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log(`check-cdk: ${PUBLISHED} carries the CDK overlay rules inline`);
  console.log('check-cdk: the bridge imports the installed sheet and declares no rule');
}

if (isMainModule(import.meta.url)) main();
