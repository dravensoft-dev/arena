# Arena token type map (DTCG 2025.10, plus `keyword`)

**Normative, and for whoever authors a token or targets a new platform.** What the values
MEAN is [`AGENTS.md`](./AGENTS.md) beside this file; this document states what shape they
arrive in. A consumer reading a value out of the JSON needs neither: the JSON is the value.

Every type here is a 2025.10 type but one. `keyword` is Arena's single addition, it is stated
below with the reason it was worth making, and nothing else in this repository departs from the
specification.

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
| Spacing scale (`sp-0..24`) | `spacing.json` | `dimension` | px; `sp-0` renders as `0px` |
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
| Durations (the `dur` group) | `effects.json` | `duration` | ms |
| Loop durations (`loop-spin/sweep/shimmer/brand/reduced/brand-reduced`) | `effects.json` | `duration` | ms; cyclical motion, deliberately separate from `dur`'s transition range |
| Easings (`ease-*`) | `effects.json` | `cubicBezier` | `[x1,y1,x2,y2]` |
| Roles (`r-surface/control/field`, `bw-surface/control/field`, `shadow-surface-rest`, `dur-hover/state`, `ease-hover/state`, `press-scale`) | `roles.json` | the type of the scale each one names, and its own where it names none | Authored as **aliases** wherever a scale exists to alias, on the same footing as `rhythm`: those `$value`s are `{r.lg}`, `{bw}`, `{shadow.2}`, `{dur.fast}` or `{ease.out}`, so a role cannot drift off the scale it names and the emitted line is a literal exactly as `rhythm`'s is. **A role is a literal only where it names a question no scale ever answered**, and each of those says which: `shadow-surface-rest` and `shadow-control-rest` are fully transparent shadows, because DTCG types a shadow as offsets, blur, spread and a colour and cannot spell the absence of one; `lift-control` is `0px`, a travel distance with no ladder of travels behind it; `press-scale` is `0.98`, the compression under a press, and nothing else in Arena compresses. A scale says how round, how thick, how deep or how long; a role says WHICH corner, border, depth or transition is being asked about, and only a question can be answered differently by one scope than by another. Resolved against `effects.json` through `RESOLVES_AGAINST` in `scripts/generate/arena/generate-tokens.ts`, and emitted into `effects.generated.css` beside the scales they alias rather than into a file of their own, because `scripts/lib/core/arena-tokens.ts` reads a fixed list of four generated files and a fifth would be invisible to `check:coverage`. `r-control` and `r-field` are both `r.sm` today, and `bw-surface`, `bw-control` and `bw-field` are all `bw`: same length, different question, the cut `rhythm-group` and `dz-stack` already make at 12px |
| Layering (`z-*`) | `layering.json` | `number` | unitless integers; the family declares the order, the values only preserve it |
| Chart geometry (`chart-*`) | `chart.json` | `dimension` | px; **script-readable**, emitted to `frameworks/*/Tokens.generated.*` as bare numbers as well as to CSS, because JS arithmetic computes SVG positions from them. Does not re-densify: a value bound at import time cannot respond to `.arena-compact` |
| Component geometry (`calendar-*`, `onboarding-width`) | `component.json` | `dimension` | px; **script-readable**. Named after a component rather than a role, like `avatar-*` and `logo-*`. Count them rather than trusting a list here, with `grep -c '"script": true' contracts/design/component.json`. Two of them also replace a value the component rendered as a `calc()`, so it existed in two idioms with nothing holding them in step: `onboarding-width` and `calendar-gutter-w` |
| Behaviour (`delay-*`, `dismiss-*`, `limit-*`) | `behaviour.json` | `duration`, except `limit-*` | ms, and `limit-*` is a bare `number` like `z-*`. **Script-readable**, since the consumer is a `setTimeout` argument or an array bound, so these are read as numbers in JS as well as emitted to CSS. Behaviour VALUES only; the behaviour CONTRACT (which keys, which roles, where focus goes) is not a token and lives outside `contracts/design/` and `contracts/design-generated/` |

### Value formats are strict

- Every `color`, including each `shadow`'s color slot and `scrim`, is a
  structured object: `{ "colorSpace": "srgb", "components": [r,g,b], "alpha"?: a,
  "hex"?: "#rrggbb" }`. Never a bare hex or `rgba()` string. When `hex` is
  present it must round-trip `components`; `scripts/check/core/check-dtcg.ts` enforces it,
  so the two representations cannot drift.
- Every `dimension` and `duration` is `{ "value": N, "unit": "px" | "ms" }`, and the
  unit is required even when `N` is 0.
- `number`, `fontWeight` values are bare numbers; `cubicBezier` is an array of 4. A `number` that
  becomes a CSS length carries `$extensions["com.dravensoft.arena"].cssUnit`, which is how every
  `ls` step emits `em`. A tracking token that forgets it emits a bare number, which is not a valid
  `letter-spacing` and resolves silently to `normal`, so the page looks like a design that chose no
  tracking rather than like a broken one. A test beside the theme namespaces holds it.
- A `$description` is prose, and Style Dictionary still reads `{...}` in it as a token reference.
  Writing a CSS snippet with braces into one fails the build with a broken-reference error that
  names the description rather than the snippet.
- A `shadow` may carry `"inset": true`, which 2025.10 §9.6 defines as the way to spell an inner
  shadow, and which serialises to CSS's leading `inset` keyword. Arena uses it for exactly one
  thing: a rim light, the lit top edge that pays for figure and ground in dark, where a drop shadow
  is a darkening on an already dark page and separates nothing. Note that a colour carrying both
  `hex` and an `alpha` below 1 loses the alpha on the way out, so an `rgba` shadow colour is
  authored as `components` with no `hex`, the way every shadow in `effects.json` already is.

### `keyword`, the one type Arena adds

A `keyword` is a single bare CSS word, and it carries the set of words it may take:

```json
"tt-eyebrow": {
  "$type": "keyword",
  "$value": "uppercase",
  "$extensions": { "com.dravensoft.arena": { "values": ["none", "uppercase", "lowercase", "capitalize"] } }
}
```

**Why it exists.** Some CSS properties take a word rather than a measurement, and `text-transform`
is the one that asked: whether a label is set in capitals is a decision about register, so a style
plugin for a shop and one for a console want opposite answers. 2025.10 types a length, a colour, a
weight, a duration and a curve, and has no type for a word. The alternative to adding one was to
leave the property out of the token tier, which freezes it into every manifest that paints it, and
that is exactly the defect the role tier exists to prevent.

**Why not `string`.** A `string` type would have carried the same value and given up the property
that makes a type worth having: with no closed set, `smallcaps` is as valid as `uppercase` and no
gate can tell them apart. A keyword names its words, so `check:dtcg` refuses any other, and the
error names the set.

**Where the set is declared, and where it is enforced.** Once, on the role in
[`roles.json`](./roles.json). A style plugin re-values a role it did not declare and repeats
nothing, so `values` is optional on the answer and
`scripts/generate/core/arena-to-prod/style-plugin-rules.ts:valueProblems(where, key, token, role)`
is what holds a moved keyword to its role's set. Two gates, one set: the alternative is a copy of
the enum in every plugin, which is a copy that can drift.

**What it does not buy.** A keyword is a word, so it cannot alias a scale and cannot carry a
`cssUnit`. A value that is a measurement stays a `dimension` or a `number`, and a value that is a
list of words, which is to say a shorthand, is not a token at all.

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

### What a platform that is not CSS cannot derive

Three shapes in this map read one way on the web and another way everywhere else, and each is a
place a target would otherwise guess:

- **`keyword` inherits no transform.** It is Arena's one departure from 2025.10, so no DTCG tool
  knows what to do with it. The value is a bare word and the closed set beside it is the whole of
  what a target has to map: `ContentScale` on Compose takes five, `ContentMode` on SwiftUI takes
  two, and the gap is the target's to record rather than to resolve silently.
- **A `fontFamily` value is an ordered fallback list whose tail is a web idiom.** `system-ui`,
  `ui-monospace`, `sans-serif` and `monospace` are CSS generic families and name nothing on a
  platform that resolves a font by file or by system style. A target takes the head of the list and
  drops the tail rather than mapping it.
- **A `number` carrying a `cssUnit` hint is a render instruction for one platform.** Off the web it
  is a bare multiplier and the hint is what says of what: `em` multiplies the element's own font
  size, so tracking is `letterSpacing` in `em` on Compose and a kerning in points on SwiftUI, which
  is the same number applied two different ways.

**A script-readable token emits twice, and a target reads that the other way round.** Here the
second emission exists because JS arithmetic needs a number where CSS would have taken a length. A
target that computes its own layout needs only the number, so what is a duplicate on the web is the
single useful form off it, and the `script` flag reads as "this value is arithmetic" rather than as
"this value is emitted twice".

### `userScale`, what the user's text setting does to a value

Every `dimension` in this directory declares what happens to it when the reader asks their device
for larger text, as `$extensions["com.dravensoft.arena"].userScale`, from a closed set of three.
`check:user-scale` holds it: a dimension resolving no axis fails, a word outside the set fails, and
an axis no token takes fails so the set cannot outlive its cases.

**A group declares for the leaves under it and a leaf overrides its group.** DTCG 2025.10 admits
`$extensions` on a group in §6.3.2 and defines no inheritance for it, so that inheritance is
Arena's rule and is stated here rather than assumed from the specification. It is why the answer
is nineteen declarations and not a hundred and thirty-two: a scale is one decision, and the
`dz` ladders are the only groups where a leaf disagrees with the group it sits in.

| Axis | What it obliges a target to do | Android | iOS |
|---|---|---|---|
| `scales` | re-emit the value multiplied by the platform's own text scale | `sp` rather than `dp` | a Dynamic Type text style, or a `CGFloat` scaled through `UIFontMetrics` |
| `follows` | nothing: it is a multiplier of a size that already scales | a `TextUnit` in `em`, or a plain ratio | a ratio applied to the scaled size |
| `fixed` | leave it where it is, and let the box around it grow instead | `dp` | points |

**Every one of these is authored in px and emitted in px, and the axis changes nothing about a
rendered page here.** That is deliberate rather than unfinished. A CSS platform could honour the
axis by emitting `rem` for the `scales` set, and every gate would survive it: `check:dtcg` already
admits `rem`, the serializer concatenates whatever unit it is handed, the reading floors read no
font size, and `check:pixel-parity` holds no stored baseline and moves both layers together. What
would not survive is the charts. `chart-tick-char` and `chart-label-gap` are px numbers JS reads to
reserve room for text set at `--dz-text-2xs`, and this document already says a script-readable
value is bound at import time and cannot re-densify. A user's text size is a third runtime axis
with exactly that property, so scaling the text while the reserved room stays put clips every
label with nothing reporting it. That is why every script-readable dimension takes `fixed` and why
the emission is a separate question from the declaration.

**What `fixed` does not mean is that the control never grows.** `dz-ctl-h` is a floor the content
grows past, never a height the text is fitted into: a target that honours the axis lets a button
containing scaled text become taller than 40px and never lets it become shorter. The same reading
applies to `dz-row-py` and `dz-stack`.

**Two families take an answer worth arguing.** `icon-*` scales, although this table's own row for
it says a glyph rendered as a webfont is an icon and not type: that says it is off the `fs` ladder,
not that it ignores the reader, and an icon set beside a label that does not grow with it becomes a
dot at the largest accessibility size. `logo-text-*` is fixed, although it is a font size, because
a wordmark is a mark rather than prose and a brand that resizes with a system setting is not the
same brand.

**The cap is the target's to state and Arena does not hold one.** Both platforms will scale text
several times over at their accessibility sizes, and a control that grows without bound stops
fitting a phone before an auditor ever sees it. What Arena states is which values move; how far
they may move before a layout changes shape is a decision that belongs where the layout is.

**`userScale` is orthogonal to the style-plugin tier**, which already owns the `fs` scale:
`keyProblems()` in the shipped audit makes that scale one of only two a plugin may re-value. A
plugin decides how big a step is; the axis decides what the reader's setting does to whatever size
the plugin chose. Reading one for the other is the mistake this paragraph exists to stop.

### What is not in this map

Tokens absent from this table are, by definition, part of the per-platform
composition layer: they live in `contracts/design/colors.css` (aliases and `color-mix`
derivations) or `contracts/design-generated/fonts.generated.css` (`@font-face`), never in the DTCG
`*.json` sources this table covers.
DTCG owns values; the composition layer owns how values are combined at runtime.
