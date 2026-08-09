# Arena token type map (DTCG 2025.10)

**Normative, and for whoever authors a token or targets a new platform.** What the values
MEAN is [`AGENTS.md`](./AGENTS.md) beside this file; this document states what shape they
arrive in. A consumer reading a value out of the JSON needs neither: the JSON is the value.

The table states the DTCG `$type` of every token group in `contracts/design/`. Consume these
values; do not re-derive them.

| Token group | Source file | DTCG `$type` | Notes |
|---|---|---|---|
| Base neutrals, brand, status, `error-fill`, `cat-1..8` | `palette.dark.json` / `palette.light.json` | `color` | per-theme (dark on `:root`, light on `.arena-light`) |
| Font families (`font-display/body/mono`) | `typography.json` | `fontFamily` | comma stacks preserved; generics stay unquoted |
| Font weights (`fw-*`) | `typography.json` | `fontWeight` | numeric 400-900 |
| Font sizes (`fs-*`) | `typography.json` | `dimension` | px; `fs.mega` (150px) and `fs.hero` (96px) extend the scale above `display` (64px), extrapolating its accelerating ratio; `fs.hero` has no consumer today by design, so do not delete it as dead API |
| Line heights (`lh-*`) | `typography.json` | `number` | unitless |
| Letter spacing (`ls-*`) | `typography.json` | `number` | `em` is not a DTCG dimension unit, so tracking is a unitless `number` (a font-size multiplier) with an `$extensions.com.dravensoft.arena.cssUnit: "em"` render hint |
| Spacing scale (`sp-0..24`) | `spacing.json` | `dimension` | px; `sp-0` renders as bare `0` |
| Page rhythm (`rhythm-group/component/section`) | `spacing.json` | `dimension` | px, and the one group authored entirely as **aliases**: each `$value` is `{sp.N}` rather than a length, so a rhythm step cannot drift off the 4px grid. Style Dictionary resolves an alias at generation, so the emitted line is a literal (`--rhythm-group:12px`) exactly as `chart.json`'s `{sp.4}` emits `--chart-legend-gap:16px`; the alias binds the source and not the runtime. Deliberately outside `dz`, so `density.compact.json` does not override it |
| `container-max`, `gutter` | `spacing.json` | `dimension` | px |
| Breakpoints (`bp-sm/md/lg`) | `spacing.json` | `dimension` | px; read by JS via `getComputedStyle`, never a media query |
| Density (`dz-*`) | `spacing.json` / `density.compact.json` | `dimension`, except `dz-lh` | px; base on `:root` + `.arena-compact` override. `dz.lh` carries a token-level `$type: "number"` override, because a line height is unitless, so the group's `dimension` default does not fit that one member; DTCG 2025.10 allows a leaf's own `$type` to win over its ancestor's, and `scripts/check/core/check-dtcg.ts` accepts it. `dz.lh` is the control counterpart to `lh` below: `1`, the glyph-tight reset that keeps an icon's line box from throwing its control out of alignment |
| ArenaAvatar diameters (`avatar-xs/sm/md/lg`) | `spacing.json` | `dimension` | px; named after a component rather than a role, because ArenaAvatar derives the initials' `fontSize` (× 0.4) and the presence dot's diameter (× 0.28) from its own diameter, so the two ratios need a diameter to derive from |
| Brand lock-up (`logo-mark-*`, `logo-text-*`) | `spacing.json` | `dimension` | px; the mark's square slot and the wordmark's font size, paired at four steps. Authored together in `spacing.json` because the pairing is the token, since a lock-up's mark and text are one decision, even though the wordmark half reaches Tailwind through the `--text-*` namespace |
| Icon size (`icon-sm/md/lg/xl`) | `icon.json` | `dimension` | px; a glyph rendered as a webfont is an icon, not type, so these stay out of `fs` |
| Radius (`r-xs..pill`) | `effects.json` | `dimension` | px; `r-xs/sm/md/lg/xl/2xl` = `4/6/10/14/22/34px`, `r-pill` = `999px` |
| Border widths (`bw`, `bw-strong`) | `effects.json` | `dimension` | px |
| Shadows (`shadow-1..3`) | `effects.json` | `shadow` | composite, incl. negative spread and rgba color |
| `scrim` | `effects.json` | `color` | structured srgb with `alpha`, rendered as `rgba()` |
| `scrim-blur`, `focus-width`, `focus-offset` | `effects.json` | `dimension` | px |
| Durations (`dur-fast/mid/slow`) | `effects.json` | `duration` | ms |
| Loop durations (`loop-spin/sweep/shimmer/brand/reduced/brand-reduced`) | `effects.json` | `duration` | ms; cyclical motion, deliberately separate from `dur`'s transition range |
| Easings (`ease-*`) | `effects.json` | `cubicBezier` | `[x1,y1,x2,y2]` |
| Layering (`z-*`) | `layering.json` | `number` | unitless integers; the family declares the order, the values only preserve it |
| Chart geometry (`chart-*`) | `chart.json` | `dimension` | px; **script-readable**, emitted to `frameworks/*/Tokens.generated.*` as bare numbers as well as to CSS, because JS arithmetic computes SVG positions from them. Does not re-densify: a value bound at import time cannot respond to `.arena-compact` |
| Component geometry (`calendar-*`, `onboarding-width`) | `component.json` | `dimension` | px; **script-readable**. Named after a component rather than a role, like `avatar-*` and `logo-*`. Count them rather than trusting a list here, with `grep -c '"script": true' contracts/design/component.json`. Two of them also replace a value the component rendered as a `calc()`, so it existed in two idioms with nothing holding them in step: `onboarding-width` and `calendar-gutter-w` |
| Behaviour (`delay-*`, `dismiss-*`, `limit-*`) | `behaviour.json` | `duration`, except `limit-*` | ms, and `limit-*` is a bare `number` like `z-*`. **Script-readable**, since the consumer is a `setTimeout` argument or an array bound, so these are read as numbers in JS as well as emitted to CSS. Behaviour VALUES only; the behaviour CONTRACT (which keys, which roles, where focus goes) is not a token and lives outside `contracts/design/` and `contracts/design-generated/` |

### Value formats are strict 2025.10

- Every `color`, including each `shadow`'s color slot and `scrim`, is a
  structured object: `{ "colorSpace": "srgb", "components": [r,g,b], "alpha"?: a,
  "hex"?: "#rrggbb" }`. Never a bare hex or `rgba()` string. When `hex` is
  present it must round-trip `components`; `scripts/check/core/check-dtcg.ts` enforces it,
  so the two representations cannot drift.
- Every `dimension` and `duration` is `{ "value": N, "unit": "px" | "ms" }`, and the
  unit is required even when `N` is 0.
- `number`, `fontWeight` values are bare numbers; `cubicBezier` is an array of 4.

### Script-readable tokens

A token carrying `$extensions["com.dravensoft.arena"].script: true` is emitted
**twice**: as the CSS custom property it would have had anyway, and as a bare
number exported from each framework layer's generated module
(`frameworks/react/Tokens.generated.js`, `frameworks/angular/Tokens.generated.ts`).

The flag lives in the source, not in a list inside the build script, because a
second list is a second thing to keep in sync.

Flag a token only when **JS arithmetic must consume it to produce a position**.
A value the browser can apply directly stays CSS-only. Two consequences follow
and neither is negotiable: a script-readable value is bound at import time, so
it **cannot re-theme and cannot re-densify**; and only `dimension`, `duration`
and `number` are flaggable, because those are the only types whose value is a
number.

### What is not in this map

Tokens absent from this table are, by definition, part of the per-platform
composition layer: they live in `contracts/design/colors.css` (aliases and `color-mix`
derivations) or `contracts/design-generated/fonts.generated.css` (`@font-face`), never in the DTCG
`*.json` sources this table covers.
DTCG owns values; the composition layer owns how values are combined at runtime.
