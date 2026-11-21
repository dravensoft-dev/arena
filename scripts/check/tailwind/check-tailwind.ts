import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { compileLayer, manifestClasses, escapeClass } from '../../lib/tailwind/tailwind-compile.ts';
import { node as tailwindNode } from '../../build/tailwind/build-tailwind.ts';
import { themeDeclarations } from '../../lib/tailwind/theme-sheet.ts';

export const node = {
  name: 'check:tailwind',
  reads: [...tailwindNode.reads, 'contracts/design/colors.css'],
  writes: [],
  feeds: [],
};
import { arenaTokenNames } from '../../lib/core/arena-tokens.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
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

export function inlineThemeKeys(themeCss: string) {
  return new Map(themeDeclarations(themeCss, true).map(([name, value]) => [name.slice(2), value]));
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

const FOCUS_VARIANT = /^(?:(?:group|peer|in)-)?focus(?:-visible|-within)?(?:\/[\w-]+)?$|^has-\[[^\]]*focus[^\]]*\]$|^\[[^\]]*:focus(?:-visible|-within)?(?![\w-])[^\]]*\]$/;

const SHADOW_PAINT = /^(?:inset-)?(?:shadow|ring)(?:-|$)/;
const OUTLINE_PAINT = /^outline-/;

function slotClasses(manifest: ManifestClassSource) {
  const bySlot = new Map<string, string[]>();
  const add = (slot: string, cls: unknown) => {
    if (typeof cls !== 'string') return;
    if (!bySlot.has(slot)) bySlot.set(slot, []);
    bySlot.get(slot)?.push(...cls.split(/\s+/).filter(Boolean));
  };
  for (const [slot, cls] of Object.entries(manifest.slots || {})) add(slot, cls);
  for (const group of Object.values(manifest.variants || {}))
    for (const branch of Object.values(group || {}))
      for (const [slot, cls] of Object.entries(branch || {})) add(slot, cls);
  for (const compound of manifest.compoundVariants || [])
    for (const [slot, cls] of Object.entries(compound.class || {})) add(slot, cls);
  return bySlot;
}

const AMBIENT_VARIANT = /^(?:(?:sm|md|lg|xl|2xl|dark|light|print|portrait|landscape|rtl|ltr|noscript|starting|forced-colors|not-forced-colors|inverted-colors|contrast-more|contrast-less|motion-safe|motion-reduce|(?:max|min)-[\w\[\]./-]+|supports-[\w\[\]:()-]+|not-supports-[\w\[\]:()-]+)|@[\w\[\]./-]+)$/;

export function focusOutlineProblems(manifest: ManifestClassSource) {
  const problems = [];
  for (const [slot, classes] of slotClasses(manifest)) {
    for (const cls of new Set(classes)) {
      const parts = cls.replace(/!$/, '').split(/:(?![^[]*\])/);
      const utility = parts.pop() ?? '';
      if (utility === 'outline-hidden' && parts.length === 0) {
        problems.push(
          `${manifest.component}:${slot} writes a bare \`outline-hidden\`, which hides the outline in every state. `
          + `Write it under the slot's own focus variant (\`focus-visible:outline-hidden\`), so the forced palette paints the focus ring.`,
        );
        continue;
      }
      if (utility !== 'outline-none') continue;
      const focusVariants = parts.filter((variant) => FOCUS_VARIANT.test(variant));
      const ambient = parts.length > 0 && parts.every((variant) => AMBIENT_VARIANT.test(variant));
      if (parts.length && !focusVariants.length && !ambient) continue;
      const fix = focusVariants.length ? [...parts, 'outline-hidden'].join(':') : [...parts, 'focus-visible:outline-hidden'].join(':');
      problems.push(
        `${manifest.component}:${slot} writes \`${cls}\`${focusVariants.length ? ' in a focus state' : ', which also applies when the slot is focused'}. `
        + `Forced-colours mode drops box-shadow and borders, and Tailwind 4's outline-none is outline-style: none, `
        + `so a ring or border drawn for focus shows no focus there: write \`${fix}\` (the slot's own focus variant), `
        + `a transparent outline the forced palette paints, and never a bare outline-hidden.`,
      );
    }
    for (const cls of new Set(classes)) {
      const parts = cls.replace(/!$/, '').split(/:(?![^[]*\])/);
      const utility = parts.pop() ?? '';
      if (!SHADOW_PAINT.test(utility) || !parts.some((variant) => FOCUS_VARIANT.test(variant))) continue;
      const drawsOutline = classes.some((other) => {
        const otherParts = other.replace(/!$/, '').split(/:(?![^[]*\])/);
        const otherUtility = otherParts.pop() ?? '';
        return OUTLINE_PAINT.test(otherUtility) && otherParts.join(':') === parts.join(':');
      });
      if (!drawsOutline)
        problems.push(
          `${manifest.component}:${slot} draws a focus state as \`${cls}\` alone. Forced-colours mode drops box-shadow, `
          + `so no focus shows: add \`${[...parts, 'outline-hidden'].join(':')}\`, a transparent outline the forced palette paints.`,
        );
    }
  }
  return problems;
}

export function checkCompiled(
  css: string, manifests: Map<string, ManifestClassSource>, tokens: Set<string>, inline = new Map<string, string>(),
) {
  const errs = [];

  if (manifests.size === 0)
    errs.push('found 0 manifests — an empty result set is a failure, not a clean pass; check the discovery path');

  for (const [file, manifest] of manifests)
    for (const cls of manifestClasses(manifest))
      if (!css.includes(`.${escapeClass(cls)}`))
        errs.push(`${file}: \`${cls}\` produced no rule — the utility does not exist`);

  for (const [key, value] of [...themeKeys(css), ...inline]) {
    if (key.startsWith('tw-') || key.startsWith('default-')) continue;
    const calc = value.match(/^calc\((.*)\)$/);
    if (calc) {
      const vars = [...calc[1].matchAll(/var\(--([a-z0-9-]+)\)/g)].map((m) => m[1]);
      const rest = calc[1].replace(/var\(--[a-z0-9-]+\)/g, '');
      if (!vars.length || !/^[\s\d.*/+()-]*$/.test(rest)) { errs.push(`--${key}: not a derivation of Arena tokens — emits \`${value}\``); continue; }
      for (const name of vars) if (!tokens.has(name)) errs.push(`--${key}: --${name} is no such Arena token`);
      continue;
    }
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
  const inline = inlineThemeKeys(readFileSync(join(repoRoot, 'frameworks/tailwind/Theme.css'), 'utf8'));
  const errs = checkCompiled(css, manifests, arenaTokenNames(repoRoot), inline);
  for (const m of manifests.values()) { errs.push(...transitionProblems(m)); errs.push(...focusOutlineProblems(m)); }
  if (errs.length) {
    console.error(`check-tailwind: ${errs.length} violation(s) in the compiled Tailwind layer\n`);
    for (const e of errs) console.error(`  ${e}`);
    process.exit(1);
  }
  const classes = [...manifests.values()].reduce((n, m) => n + manifestClasses(m).length, 0);
  console.log(`check-tailwind: ${manifests.size} manifest(s), ${classes} class(es), ${themeKeys(css).size + inline.size} theme key(s) — all resolve to Arena tokens`);
}

if (isMainModule(import.meta.url)) main();
