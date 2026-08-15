import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { arenaTokens } from '../../lib/core/arena-tokens.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { MANIFESTS, PRESET } from '../../build/tailwind/build-tailwind.ts';

export const node = {
  name: 'check:coverage',
  reads: [...PRESET, MANIFESTS],
  writes: [],
  feeds: [],
};
import { captured } from '../../utils/captures.ts';

export const EXCLUDED = new Map([
  ['sp-0', 'p-0 compiles to a literal 0px in v4 regardless of the theme'],
  ['lh-root', 'the floor every element inherits, set once on html in contracts/design/reset.css and '
    + 'never picked per element. A leading-root utility would invite a component to restate the '
    + 'inherited value, which is the one thing that makes a floor stop being one; the three roles '
    + 'beside it, tight, snug and body, are what a component reaches for on purpose'],
  ['bp-sm', 'reaches the utility surface as --breakpoint-sm, a literal Breakpoints.generated.css emits from this token, because a media query condition holds no var()'],
  ['bp-md', 'the same, as --breakpoint-md'],
  ['bp-lg', 'the same, as --breakpoint-lg'],
  ['dur-fast', 'v4 has no duration namespace; wired as --default-transition-duration'],
  ['dur-mid', 'v4 has no duration namespace; reached as duration-[var(--dur-mid)]'],
  ['dur-slow', 'v4 has no duration namespace; no consumer today, available as duration-[var(--dur-slow)]'],
  ['loop-spin', 'v4 has no duration namespace; reached as duration-[var(--loop-spin)]'],
  ['loop-sweep', 'v4 has no duration namespace; reached as duration-[var(--loop-sweep)]'],
  ['loop-shimmer', 'v4 has no duration namespace; reached as duration-[var(--loop-shimmer)]'],
  ['loop-brand', 'v4 has no duration namespace; reached as duration-[var(--loop-brand)]'],
  ['loop-reduced', 'v4 has no duration namespace; the reduced-motion step, set inside a media query rather than by a utility'],
  ['loop-brand-reduced', 'v4 has no duration namespace; the reduced-motion step, set inside a media query rather than by a utility'],
  ['tt-eyebrow', 'v4 has no text-transform namespace, and its uppercase/lowercase/capitalize are static '
    + 'utilities naming a value, which is the shape of a scale rather than of a role. Reached through '
    + '.case-eyebrow in frameworks/tailwind/Case.css, hand-authored for exactly that reason'],
  ['tt-label', 'the same, through .case-label'],
  ['fit-media', 'v4 has no object-fit namespace, and its object-cover/object-contain and the rest are '
    + 'static utilities naming a value, which is the shape of a scale rather than of a role. Reached '
    + 'through .fit-media in frameworks/tailwind/Media.css, hand-authored for exactly that reason'],
  ['aspect-media', 'the shape of a media frame, which a member carries and ArenaFigure writes inline the '
    + 'way ArenaGrid writes its track list, because a consumer pinning a video to sixteen by nine is '
    + 'answering about one figure and not about the appearance. A theme key would also have collided with '
    + 'the token: v4 emits aspect-<key> from --aspect-*, and the role is already spelt --aspect-media'],
  ['grid-min', 'the narrowest column of an auto-fitting grid, which lands inside a repeat(auto-fit, '
    + 'minmax(min(...), 1fr)) track list rather than on any property a utility sets. Reached as '
    + 'grid-cols-[repeat(auto-fit,minmax(min(var(--grid-min),100%),1fr))]'],
  ['bw', 'v4 has no border-width namespace; reached as border-[length:var(--bw)]'],
  ['bw-strong', 'v4 has no border-width namespace; no consumer today, available as border-[length:var(--bw-strong)]'],
  ['bw-surface', 'v4 has no border-width namespace, so a border role cannot become a named utility the way a radius role does; reached as border-[length:var(--bw-surface)]'],
  ['bw-control', 'the same, as border-[length:var(--bw-control)]'],
  ['bw-field', 'the same, as border-[length:var(--bw-field)]'],
  ['bw-separator', 'the same, as border-t-[length:var(--bw-separator)] and its per-side siblings, which is the only shape a separator takes'],
  ['bw-marker', 'the same, as border-[length:var(--bw-marker)]'],
  ['lift-control', 'a travel distance rather than a length on the spacing grid, so no @theme namespace owns it; reached as hover:-translate-y-[var(--lift-control)], the shape check:arbitrary accepts for a value with no namespace'],
  ['dur-hover', 'v4 has no duration namespace, the same wall dur-mid meets; reached as duration-[var(--dur-hover)]'],
  ['dur-state', 'the same, as duration-[var(--dur-state)]'],
  ['focus-width', 'no namespace — the focus ring is composed, not a single utility'],
  ['focus-offset', 'no namespace — the focus ring is composed, not a single utility'],
  ['tint-area', 'script-readable: a ratio JS interpolates into a color-mix() string, and v4 has no namespace for one'],
  ['tint-soft', 'the same, for the surface of an identity colour'],
  ['tint-edge', 'the same, for its hairline'],
  ['chart-height', 'script-readable: JS computes SVG positions from it, never a utility'],
  ['chart-pad-top', 'script-readable: JS computes SVG positions from it, never a utility'],
  ['chart-pad-right', 'script-readable: JS computes SVG positions from it, never a utility'],
  ['chart-pad-bottom', 'script-readable: JS computes SVG positions from it, never a utility'],
  ['chart-pad-left', 'script-readable: JS computes SVG positions from it, never a utility'],
  ['chart-bar-radius', 'script-readable: passed to arenaBarPath(), which builds an SVG path string'],
  ['chart-bar-gap', 'script-readable: subtracted from the per-bar step width'],
  ['chart-series-gap', 'script-readable: subtracted from a sub-band width to place one grouped bar'],
  ['chart-point-r', 'script-readable: an SVG circle r attribute computed per point'],
  ['chart-bubble-r-min', 'script-readable: one end of a radius range JS interpolates by AREA to size a bubble, so no utility could carry either end alone'],
  ['chart-bubble-r-max', 'script-readable: the other end, and the same interpolation. It also sizes the size key\'s sample circles, which are SVG r attributes computed per sample'],
  ['chart-point-r-hover', 'script-readable: an SVG circle r attribute computed per point'],
  ['chart-tooltip-offset', 'read inside a calc() beside a runtime px projection of the hovered datum, so the whole expression is inline and no utility could carry it'],
  ['chart-legend-min', 'script-readable: a clamp bound compared against a measured width'],
  ['chart-legend-max', 'script-readable: a clamp bound compared against a measured width'],
  ['chart-legend-gap', 'script-readable: subtracted from a measured width to size the plot'],
  ['chart-pad-category', 'script-readable: subtracted from the measured width to size a horizontal chart\'s plot, and the same number places the category label at its right edge'],
  ['chart-legend-strip', 'script-readable: subtracted from the chart height to size the plot, and the same number is the strip\'s own height, so one utility could carry at most half of it'],
  ['chart-label-gap', 'script-readable: subtracted from a pad or a height in JS to place an SVG text x/y, never a utility'],
  ['chart-ring-inset', 'script-readable: subtracted from half the plot box in JS to size the doughnut\'s outer radius, never a utility'],
  ['calendar-hour-h', 'script-readable in both layers: JS projects a minute-of-day onto a pixel offset from it, and the chip and the hour cell it sits over must agree to the pixel, which only one shared number gives them'],
  ['calendar-gutter-w', 'script-readable: JS subtracts it from the measured container width to get the grid\'s width. Also rendered directly as var(--calendar-gutter-w) in both layers — React inline, Angular through the shared manifest\'s w-[var(--calendar-gutter-w)] and pl-[var(--calendar-gutter-w)] — for the hour-label column\'s width and the header strip\'s padding-left, never through the @theme spacing scale this gate checks'],
  ['calendar-time-min-h', 'script-readable in both layers: compared in JS against a chip\'s projected pixel height to decide whether its time label fits vertically. Never rendered as a length'],
  ['calendar-time-min-w', 'script-readable in both layers: compared in JS against a chip\'s column share to decide whether its time label fits horizontally. Never rendered as a length'],
  ['calendar-actions-below-min-h', 'script-readable in both layers: compared in JS against a chip\'s projected pixel height to decide whether its kebab can sit below its title instead of beside it. Never rendered as a length'],
  ['onboarding-height-reserve', 'script-readable: subtracted from window.innerHeight in JS to decide how far the coachmark follows its anchor. Unlike onboarding-width it is never rendered as a length either, so no utility could carry it'],
  ['press-scale', 'a transform scale rather than a length, so no @theme namespace owns it -- both layers read it out of the shared ArenaButton manifest as active:scale-[var(--press-scale)]. This gate checks theme keys, and a bracket referencing the custom property directly is the correct shape for a value with no namespace. A role since the motion tier was completed, and the same wall lift-control meets one line up: a role reaches a manifest through whatever shape the property takes, and having a namespace is not one of the things that makes it a role'],
  ['onboarding-width', 'script-readable: compared against window.innerWidth by Math.min/Math.max. Rendered directly as var(--onboarding-width) in both layers — React inline, Angular via the shared manifest\'s w-[var(--onboarding-width)] — never through the @theme spacing scale this gate checks'],
  ['delay-open', 'script-readable: a setTimeout argument for pointer intent, never a utility'],
  ['delay-close', 'script-readable: a setTimeout argument for pointer intent, never a utility'],
  ['dismiss-default', 'script-readable: the host runs the toast clock in JS, never a utility'],
  ['dismiss-actionable', 'script-readable: the host runs the toast clock in JS, never a utility'],
  ['limit-pagination-siblings', 'script-readable: an array bound, and the elision threshold derives from it in JS'],
]);

export function presetTokens(css: string) {
  const out = new Set<string>();
  const m = css.match(/@theme\s*\{([\s\S]*)\}/);
  if (!m) return out;

  const body = captured(m).replace(/\/\*[\s\S]*?\*\//g, '');
  for (const line of body.split(';')) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();

    if (!key.startsWith('--') || key.startsWith('--default-')) continue;
    const ref = line.slice(i + 1).match(/^\s*var\(--([a-z0-9-]+)\)\s*$/);
    if (ref) out.add(captured(ref));
  }
  return out;
}

export function checkCoverage(
  tokens: Set<string>, exposed: Set<string>, excluded: Map<string, string>,
) {
  const errs = [];
  for (const t of [...tokens].sort()) {
    const isExposed = exposed.has(t);
    const isExcluded = excluded.has(t);
    if (isExposed && isExcluded) errs.push(`--${t} is both exposed and excluded — drop the exclusion`);
    else if (!isExposed && !isExcluded)
      errs.push(`--${t} reaches no Tailwind utility — expose it in frameworks/tailwind/Theme.css or add it to EXCLUDED with a reason`);
  }
  for (const t of [...excluded.keys()].sort())
    if (!tokens.has(t)) errs.push(`--${t} is excluded but no such token exists — drop the exclusion`);
  for (const t of [...exposed].sort())
    if (!tokens.has(t)) errs.push(`the preset references --${t} — no such token in contracts/design-generated/`);
  return errs;
}

function main() {
  const tokens = arenaTokens();
  const preset = readFileSync(join(repoRoot, 'frameworks/tailwind/Theme.css'), 'utf8');
  const exposed = presetTokens(preset);
  const errs = checkCoverage(tokens, exposed, EXCLUDED);
  if (errs.length) {
    console.error(`check-tailwind-coverage: ${errs.length} token(s) undeclared\n`);
    for (const e of errs) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log(`check-tailwind-coverage: ${tokens.size} token(s) — ${exposed.size} exposed, ${EXCLUDED.size} excluded on the record`);
}

if (isMainModule(import.meta.url)) main();
