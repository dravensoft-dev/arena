import { isMainModule } from '../../utils/main-module.ts';
import { compileLayer, manifestClasses, escapeClass } from '../../lib/tailwind/tailwind-compile.ts';
import { node as tailwindNode } from '../../build/tailwind/build-tailwind.ts';

export const node = {
  name: 'check:tailwind',
  reads: tailwindNode.reads,
  writes: [],
  feeds: [],
};
import { arenaTokens } from '../../lib/core/arena-tokens.ts';
import type { ManifestClassSource } from '../../lib/tailwind/manifest-shapes.ts';
import { captured } from '../../utils/captures.ts';

export function themeKeys(css: string) {
  const out = new Map();
  const m = css.match(/@layer theme\s*\{\s*:root[^{]*\{([\s\S]*?)\n\s*\}/);
  if (!m) return out;
  for (const line of captured(m).split(';')) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    const name = line.slice(0, i).trim();
    if (!name.startsWith('--')) continue;
    out.set(name.slice(2), line.slice(i + 1).trim());
  }
  return out;
}

const TRANSFORM_PROPS = ['translate', 'scale', 'rotate'];

export function transitionProblems(manifest: ManifestClassSource) {
  const bySlot = new Map<string, string[]>();
  const add = (slot: string, cls: unknown) => {
    if (typeof cls !== 'string') return;
    if (!bySlot.has(slot)) bySlot.set(slot, []);
    bySlot.get(slot)?.push(cls);
  };
  for (const [slot, cls] of Object.entries(manifest.slots || {})) add(slot, cls);
  for (const group of Object.values(manifest.variants || {}))
    for (const branch of Object.values(group || {}))
      for (const [slot, cls] of Object.entries(branch || {})) add(slot, cls);

  const problems = [];
  for (const [slot, classList] of bySlot) {
    const all = classList.join(' ');
    if (!/(?<![\w-])transition[-[:]/.test(all)) continue;
    const transitioned = /(?<![\w-])transition-\[([^\]]*)\]|\[transition:([^\]]*)\]/.exec(all);
    if (!transitioned) continue;
    const named = `${transitioned[1] ?? ''}${transitioned[2] ?? ''}`;
    if (!/(?<![\w-])transform(?![\w-])/.test(named)) continue;
    const painted = TRANSFORM_PROPS.filter(
      (p) => new RegExp(`(?<![\\w-])-?${p}-[\\w[\\]/.%-]+`).test(all),
    );
    if (painted.length)
      problems.push(
        `${manifest.component}:${slot} transitions transform while it paints ${painted.join(' and ')}. `
        + `Tailwind v4 emits the individual property, which transform does not cover, so the change does not animate: `
        + `name ${painted.join(' and ')} in the transition instead.`,
      );
  }
  return problems;
}

export function checkCompiled(css: string, manifests: Map<string, ManifestClassSource>, tokens: Set<string>) {
  const errs = [];

  if (manifests.size === 0)
    errs.push('found 0 manifests — an empty result set is a failure, not a clean pass; check the discovery path');

  for (const [file, manifest] of manifests)
    for (const cls of manifestClasses(manifest))
      if (!css.includes(`.${escapeClass(cls)}`))
        errs.push(`${file}: \`${cls}\` produced no rule — the utility does not exist`);

  for (const [key, value] of themeKeys(css)) {
    if (key.startsWith('tw-') || key.startsWith('default-')) continue;
    const ref = value.match(/^var\(--([a-z0-9-]+)\)$/);
    if (!ref) { errs.push(`--${key}: not a var() into an Arena token — emits \`${value}\``); continue; }
    if (!tokens.has(ref[1])) errs.push(`--${key}: --${ref[1]} is no such Arena token`);
  }

  if (css.includes('0.25rem'))
    errs.push("the compiled layer contains `0.25rem` — Tailwind's default --spacing is reachable; set `--spacing: var(--sp-1)`");

  return errs;
}

function main() {
  const { css, manifests } = compileLayer();
  const errs = checkCompiled(css, manifests, arenaTokens());
  for (const m of manifests.values()) errs.push(...transitionProblems(m));
  if (errs.length) {
    console.error(`check-tailwind: ${errs.length} violation(s) in the compiled Tailwind layer\n`);
    for (const e of errs) console.error(`  ${e}`);
    process.exit(1);
  }
  const classes = [...manifests.values()].reduce((n, m) => n + manifestClasses(m).length, 0);
  console.log(`check-tailwind: ${manifests.size} manifest(s), ${classes} class(es), ${themeKeys(css).size} theme key(s) — all resolve to Arena tokens`);
}

if (isMainModule(import.meta.url)) main();
