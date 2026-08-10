# Arena design specification

> **For whoever needs to know what a value MEANS, on either branch.** Only the value itself?
> The DTCG JSON beside this file is the machine-readable form and is cheaper to read.
> Authoring a token? [`TokenTypes.md`](./TokenTypes.md) is the shape it has to arrive in.

**Normative.** This is the source of truth for every design decision in Arena: voice,
type, color, spacing, motion, the danger convention, iconography and theming. A layer
that disagrees with this document is wrong.

It is also the contract a new platform target reads first. Consume these values; do not
re-derive them. This document states what the values MEAN;
[`TokenTypes.md`](./TokenTypes.md) beside it states the DTCG `$type` of every group and
the shape each value arrives in.

## Content fundamentals (voice and copy)
- **Language:** English (en-US neutral).
- **Register:** formal and direct in enterprise product and formal documentation; a closer, more casual register only in marketing material. Never mix registers on the same surface.
- **Tone:** confident and direct, never boastful. State capability without empty adjectives. E.g.: *"Delivery ready for review"* > *"Amazing delivery completed!"*.
- **Casing:** titles in **UPPERCASE with tracking** only for eyebrows/mono labels (`.22em`); section headings in Archivo weight 800–900 in normal case (Sentence case). Buttons in Sentence case, not Title Case.
- **Data/status labels:** mono, uppercase ("IN PROGRESS", "DEPLOYED").
- **Numbers:** always in mono. Metrics with a unit ("14 ms", "99.98%").
- **No emoji** in product or documentation. Expressiveness comes from color and typography, not decorative icons.
- **Microcopy:** concrete action verbs ("Deploy", "Approve delivery", "Roll back"). Errors are helpful and blame-free ("We couldn't connect to the server. Retry.").

## Visual foundations
- **Color, token architecture (daisyUI structure):** the source of truth is a set of `--color-*` tokens paired with their `-content` counterpart (the legible color on top), defined per theme in `contracts/design/palette.dark.json` and `contracts/design/palette.light.json`, from which `contracts/design-generated/palette.generated.css` is generated. On top of them, a **compatibility layer** in `contracts/design/colors.css` maps Arena's legacy aliases (`--bg`, `--surface-card`, `--crimson`, `--gold`, `--danger`, `--mute`…) to the daisyUI tokens, so existing components don't break. Muted text levels (`--bone-dim`, `--mute`) and `--status-offline` are derived from `--color-base-content` with `color-mix`, not fixed hex values.
  - **One token breaks the pairing, on purpose: `--color-error-fill`** (alias `--danger-fill`). It has no `-content` of its own, because it *is* a second fill for `--color-error`'s content, because danger is worn two ways and one hex cannot do both. See [Danger convention](#danger-convention-destructive-actions-and-risk-indicators). Pinning it is **optional**: `--danger-fill` falls back to `color-mix(in oklab, var(--color-error) 85%, black)`, so a palette copied without it still gets a filled danger dark enough for white text. Pin it to override the derived tone (the Dravensoft skin pins `#ce3838`); `check-text-contrast.ts` gates both the pin and the fallback.
- **The muted text scale**, every level AA on both surfaces in both themes: `--text-strong` (100%, 15.23:1 dark / 15.86:1 light on the card), `--text-body` (82%, 10.46 / 9.28), `--text-muted` (62%, 6.52 / 4.71). `--text-muted` in light is the tightest of the three: it clears AA, and it is the reason nothing fits below it. A fainter level cannot be added, because clearing AA in light needs 61% while `--text-muted` already sits at 62%.
- **`--status-offline`** (52%, 4.93:1 dark / 3.46:1 light on the card) is **presence only**, meaning `ArenaAvatar`'s offline dot. It clears WCAG 1.4.11's 3:1 for graphical objects. It is *not* `--mute-2-disabled` (40%), which dresses disabled controls: that one is low **by design** and exempt under 1.4.3/1.4.11's inactive-component carve-out. Do not raise it, and do not reach for it to render presence.
- **Verifying it:** `bun scripts/check/core/check-text-contrast.ts` measures every level against the real surfaces in both themes and exits non-zero on failure. Run it after touching `contracts/design/colors.css`, or after rebuilding a change to `contracts/design/palette.dark.json` / `palette.light.json`. The claim above is machine-checkable, which is the point: a contrast figure nothing measures can be false for a whole theme with nothing to say so.
- **Themes:** the language is **dark-first** but supports two switchable themes, **dark** (`:root`, default) and **light** (`.arena-light`, warm inverse). The same tokens change value per theme; components are never rewritten. (The Overview includes the toggle in its header.)
- **Key values:** a warm black background (`--color-base-100`) under elevated surfaces (`--color-base-200` for cards, `--color-base-300` for panels and borders) and bone text (`--color-base-content`). A single primary accent (crimson, `--color-primary`) per view; gold (`--color-secondary`) reserved for focus, distinction and highlighted data. At most one dominant accent per screen. The literal values live in `contracts/design/palette.dark.json` and `contracts/design/palette.light.json`, from which `contracts/design-generated/palette.generated.css` is generated. See [Theming](#theming): the scale is the language, the hexes are the skin.
- **Typography:** Archivo (display/headlines, 800–900), Familjen Grotesk (body, 400–600), Spline Sans Mono (data, labels, code). Negative tracking on display (`-0.02em`), wide tracking on mono labels (`0.22em`).
- **Spacing, and the difference between a length and a rhythm:** the 4px grid (`sp`) is the repertoire of lengths a value may take, and it decides nothing on its own. What separates two components is `rhythm`, three named steps aliased off that grid: `--rhythm-group` (12px) inside one group of related things, `--rhythm-component` (16px) between two peers, `--rhythm-section` (24px) between two sections of a page. **Arena draws none of this itself**, because every component is an inner box with no outer margin, so the family exists for the reason `--z-nav` and `--layout-bar` do: the space between components is part of the system, and the alternative is every consumer picking a number. It is not density. `.arena-compact` re-densifies `dz` and leaves `rhythm` alone, which is why `--rhythm-group` and `--dz-stack` can share a length and not a meaning. The step table, and what each one is for, is [`Scales.md`](./Scales.md).

### Danger convention (destructive actions and risk indicators)
To tell **destructive / risk actions and indicators** apart from the primary action, Arena distinguishes them by **shape, not weight**: **transparent background** with the **border and all its content** (text and icons) in the semantic token **`--error`** (alias `--danger`). This way danger reads through color and never visually competes with the filled crimson primary button.
- **Applies to** every risk trigger or indicator: buttons (`.btn.danger`), icon buttons (`.iconbtn.danger`), menu items (`.mitem.danger`) and equivalents in lists, cards and toolbars. Hover: lightens with `--danger-soft`. Focus: `--error` ring.
- **Rule:** a **filled** danger button never appears as a trigger in the UI (lists, cards, toolbars). The solid fill is reserved by visual weight for the primary action (crimson).
- **Only exception, the final irreversible confirmation:** inside an `ArenaConfirmDialog`, the button for the final "point of no return" **is** filled, in `--danger-fill` (`--color-error-fill`) over `--color-error-content` and **not** in `--danger`. It's the only surface where danger is filled, precisely because it must not be confused with an ordinary action.
- **Danger is two reds, and they cannot be one.** `--danger` is read *as text* on the base surfaces, so it is tuned against them (lighter in dark, darker in light). That leaves it too light to carry white text, which is exactly what the filled confirmation needs, so the fill is its own token, tuned in the opposite direction. Collapsing them puts one of the two roles under WCAG AA; `bun scripts/check/core/check-text-contrast.ts` gates both.
- **Specimen:** `intro/guidelines/components-danger.html` (all three states side by side: filled primary · outline danger · filled final confirmation).
- **"Danger is outline" governs controls and surfaces, not presence or identity marks.** `ArenaAvatar`'s presence dot (online/busy/away/offline) is a different semantic family, a status taxonomy like the chart `tone` colors rather than a destructive affordance, and it is filled: `--color-success`, `--color-warning` and `--color-error` for the three live states, `--status-offline` for the fourth. An outline dot at that size (`max(8px, diameter * 0.28)`) would not read at all. The same carve-out covers any other small identifying dot at that size, filled via `currentColor` from a `tone`/status token: `ArenaTag`'s leading dot and `ArenaActivityFeed`'s per-row tone dot are both `bg-current`, and both fill with `text-error` for their danger tone. A tag or a feed row is naming *what kind of thing this is*, the same taxonomy ArenaAvatar's presence is, not asking to be read as a risk trigger. Nothing here contradicts the rule above: the rule is about *danger*, and a dot filled in `--color-error` at this size is identity/status borrowing the error hue for "this one," not a risk indicator.

## Iconography
- **Official set: [Phosphor Icons](https://phosphoricons.com)** (MIT license, free commercial use, no attribution). Chosen for aligning with Dravensoft's bold identity: it's the open-source family with the widest style range (1,500+ icons in 6 weights) and its **Bold** weight has the presence and high contrast the brand calls for, the icon equivalent of Archivo Black.
- **Weights and use:**
  - **Bold** (`.ph-bold`): default weight across the UI. Presence and legibility at high contrast.
  - **Fill** (`.ph-fill`): active/selected state (e.g. the active navigation item, a toggle that's on).
  - **Duotone** (`.ph-duotone`): only to highlight features/onboarding, with the crimson accent on the primary layer. Premium two-tone effect; use sparingly.
- **Loading (the default is to install the package):** install `@phosphor-icons/web` and import its weight stylesheets, or `@phosphor-icons/react` (`<Rocket weight="bold"/>`), then apply the weight class plus the icon class: `<i class="ph-bold ph-rocket-launch"></i>`. **Prototype-only:** the CDN, e.g. `https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.2/src/bold/style.css`.
- **Sizes** are a token family, `icon` (`contracts/design/icon.json`, generated into `contracts/design-generated/spacing.generated.css`), applied via `fontSize` since Phosphor renders as a webfont:

  | Token | Value | Role |
  |---|---|---|
  | `--icon-sm` | 14px | compact inline glyph: a remove/status icon beside dense chrome |
  | `--icon-md` | 16px | default inline control icon: close buttons, chevrons, list-item icons |
  | `--icon-lg` | 18px | prominent standalone icon: a tone icon, a search glyph |
  | `--icon-xl` | 34px | illustration-scale icon: `ArenaEmptyState`, `ArenaErrorState` |

  A glyph rendered as a webfont is still an icon rather than type, since an icon at 15px beside a label at 15px is not the same design decision as an icon at 16px, so these stay out of the `fs` scale. Exposed in the Tailwind layer under `--size-*`, not `--text-*`: `.size-icon-md` sets both width and height, since an icon is a size, not a font size. Color: inherits `currentColor`; accent only when interactive/active.
- **Do not** override `font-family/weight/style` on `.ph-*` classes (breaks the glyphs).
- **No emoji.** No arbitrary unicode as an icon. The **Rotor** (`assets/rotor-*.svg`) is brand, not a UI icon: don't use it as a functional glyph, and Arena ships no component that wraps it. The lock-up is `ArenaAppLogo`, which takes the mark as its `mark` node.
- The `console/Icon.tsx` UI kit draws its own stroke-style SVGs; the official reference for product work is Phosphor.

---

## Theming

Arena's identity lives in **shape**, not in its hexes. Crimson and gold are Dravensoft's skin; a different product can wear a different one and still be unmistakably Arena.

**The public swap surface is `contracts/design/palette.dark.json` and `contracts/design/palette.light.json`: the `--color-*` set plus `--color-cat-*`.** Everything else derives. Swap those two files, run `bun run generate:tokens`, and the whole system follows: the generated `contracts/design-generated/palette.generated.css` re-emits, the aliases in `contracts/design/colors.css` (`--bg`, `--crimson`, `--danger`, `--mute`…) re-point, the muted text levels re-derive through `color-mix`, and every component re-colors, because components read tokens and never hold a value of their own.

### The layer contract

**Standardized (the DTCG layer).** Every token *value* (colors, dimensions, font
attributes, durations, easings, shadows) is authored once in `contracts/design/**/*.json` as
strictly-conformant DTCG 2025.10, the platform-neutral contract. A new framework target
consumes that JSON directly, or through a Style Dictionary platform emitting CSS, JS,
iOS, Android or SCSS. Nothing in it is Arena-specific, and
`bun scripts/check/core/check-dtcg.ts` proves it conforms.

**Per-platform (the composition layer).** Three things DTCG deliberately does not model,
and that therefore live in each platform's own idiom:

1. **Runtime color derivations**: the muted-text levels and `*-soft` accents, expressed
   in CSS as `color-mix(in oklab, var(--…) N%, transparent)` so they re-derive when the
   skin swaps. In CSS they live in the hand-authored `contracts/design/colors.css`. A new framework
   rebuilds this thin layer in its idiom (Tailwind `color-mix` utilities, a JS token
   helper) **on top of the same standard values**, and never re-defines a value.
2. **`@font-face` bundling**, generated by `scripts/generate/core/fetch-fonts.ts` into
   `contracts/design-generated/fonts.generated.css`, pointing at the self-hosted `assets/fonts/` binaries.
3. **The device's own geometry**, meaning the safe-area insets a browser resolves per device
   at paint. `env(safe-area-inset-*)` is a value and a unit to nobody: it has no value until
   there is a screen, so there is nothing for DTCG to hold. `contracts/design/environment.css`
   composes each one with the token that applies when the device reports no inset, as
   `--pad-safe-bottom: max(var(--sp-3), env(safe-area-inset-bottom))`, so a phone shell reaches
   one custom property instead of writing the fallback four times and differently.
   **Arena draws nothing that needs them**, and they are declared for the reason `--z-nav` and
   `--layout-bar` are: the frame a consumer builds around Arena is part of the system, and the
   alternative is every consumer inventing the same expression.

The dividing line: **DTCG owns values; the composition layer owns how values are combined
at runtime.** `contracts/design/colors.css` therefore holds no skin value, only references
(`var(--color-primary)`) and `color-mix` compositions, and `environment.css` holds no length,
only a token and what the device reports. The full `$type` table is
`contracts/design/AGENTS.md`.

**A swap is not done until it is measured**, and two scripts measure it. `bun scripts/check/core/check-ramp.ts` holds the categorical ramp; `bun scripts/check/core/check-text-contrast.ts` holds the text: the levels derived from `--color-base-content`, every `--color-*` / `--color-*-content` pair (all seven, at 4.5:1, because the pair is the contract a skin defines, so an illegible one fails before a component can inherit it), and the accents painted straight onto the base surfaces (`--color-error` as the danger outline). Both read the values out of `palette.generated.css` and hardcode nothing, so a new skin is one edit and two commands away from a real answer.

Two of these numbers the scripts **report without gating**: crimson as text sits at 2.80:1 on the dark card, gold as text at 2.24:1 on the light one. Both are below AA and both are deliberate: they are the brand, and a gate there would not tighten a token but repaint Dravensoft. Use them as fills or on the theme that carries them, and reach for `--text-strong` when the job is reading text.

**Three tiers, and each has exactly one party who may move it.** The full statement is
[`Extensions.md`](./Extensions.md); this is the table.

| Floor, nobody moves it | Extension, Arena moves it | Skin, the consumer moves it |
|---|---|---|
| Danger is outline, never filled (one exception: `ArenaConfirmDialog`'s final confirmation) | The grouping signal: the hairline, or elevation and air instead | Crimson (`--color-primary`) |
| No gradients on any surface (one exception: `ArenaSkeleton`'s shimmer). An extension buys its expression with shape, depth and motion, never with a fill whose contrast is a range | | The status hues |
| WCAG contrast, and the 3:1 a control's boundary and the focus ring carry | The radius roles, and the border roles other than a control's and a field's | Gold (`--color-secondary`) |
| An extension authors no colour | Which of the skin's colours a surface takes: `fill-surface` and `fill-surface-floating`, split so flattening a card never flattens an overlay | |
| Target size, which is density's axis rather than an extension's | Resting and raised depth | The warm-black base values |
| The reduced-motion policy, answered per animation | The motion roles, meaning how much energy a response has | |
| The `base-100`→`base-200`→`base-300` surface scale | | The 8 categorical slots |
| The three families, and the uppercase-microlabel rule | | |
| Identity vs meaning; one axis in charts; the ramp is never cycled | | |

An extension may not lower a floor, and the floor gates run against every scope Arena ships rather
than against `:root` alone.

**Two voices differ by mechanism or they do not differ.** Every extension declares in its own file
which Gestalt principle answers "what belongs together" for it, and `bun run check:extensions`
holds the claim against the resolved values: `common-region` draws the region, `figure-ground`
removes the line and arrives with the depth, `proximity` draws neither. **Two extensions declaring
the same principle fail the build.** Without that, a second voice can only be the first one taken
further, and a catalogue of those is one voice with a dial on it. Every other decision a voice
makes, the corner, the air, the depth, the motion, the type, is derived from the principle rather
than chosen beside it, which is why the principle is the thing declared and the values are not.

### The categorical ramp

Eight slots for colouring N arbitrary entities: chart series, calendar events, any set where the color answers *which thing*. Authored per theme, **fixed order, never cycled**. A ninth entity folds to "Other", small multiples, or direct labels, never a generated hue. The slots carry **identity only**; when a series *is* a state, a chart's `tone` prop uses the status colors instead.

The ramp is one system with one entry point: `arenaCatColor(slot)`, which every layer carries in its own `DataVisuals` module. `ArenaCalendar` reads it from there rather than keeping its own copy: two clamps over one ramp is how a ramp stops being a ramp.

Where a component has no `tone` escape hatch, **state goes on a non-chromatic channel**, never by turning an identity-coloured entity `--danger`. An entity painted a status color while its neighbours carry identity colors makes the palette mean two things at once, and the reader cannot tell which. `ArenaCalendar` is the strict case: it draws every event chip itself, so a consumer has no chromatic channel *and* no non-chromatic one, and a cancelled class says so in its title or does not appear on the schedule. That is a real capability the API contract removed, and `ArenaCalendar.prompt.md` records it.

| Slot | Name | Hue | Dark | Light |
|---|---|---|---|---|
| 1 | forest | 136° | `#3c7b0a` | `#397804` |
| 2 | indigo | 264° | `#3b63be` | `#264ba4` |
| 3 | green | 152° | `#0a924b` | `#0a924b` |
| 4 | violet | 288° | `#6a59bc` | `#523e9f` |
| 5 | cyan | 216° | `#00a3c0` | `#008fa9` |
| 6 | purple | 312° | `#884da9` | `#6e328d` |
| 7 | teal | 184° | `#00a99a` | `#009487` |
| 8 | orchid | 328° | `#984697` | `#7c2b7b` |

It was derived by enumeration against the validator, not chosen by eye: candidate hues were filtered to those clearing the chroma floor *and* 3:1 against the real chart surface (`--color-base-200`) in both themes, the whole crimson→gold warm arc was banned, and the order was enumerated against the gates. Chroma is capped at OKLCH C ≤ 0.15 so the ramp sits in Arena's register (crimson 0.177, gold 0.100) rather than reading as neon.

**Measured: both themes clear every hard gate, with no relief rule.**

| Gate | Dark | Light | Bar |
|---|---|---|---|
| CVD separation (adjacent, OKLab ΔE×100) | 13.3 | 16.4 | target ≥ 8 |
| Normal-vision floor | 20.5 | 22.1 | hard floor ≥ 15 |
| Contrast vs surface | all 8 ≥ 3:1 | all 8 ≥ 3:1 | ≥ 3:1 |
| Lightness band | all inside | all inside | per-mode band |
| Chroma floor | all ≥ 0.1 | all ≥ 0.1 | ≥ 0.10 |

**Brand clearance** (ΔE to the ramp's closest slot): crimson 17.0, gold 18.0, error 19.6, warning 26.3, all above the 15 bar. That is the requirement: the ramp cannot be mistaken for the brand or for an error.

**Accepted collision:** success 6.0, info 7.8. This is structural. Eight slots need ~126° of arc; banning the red family leaves green, cyan, blue and violet, which is exactly where success (156°) and info (250°) live, and guarding those as hard as the brand leaves only ~76°. **A ramp can be clear of the brand or clear of status, not both.** Clear of the brand is the right choice: brand colors carry identity everywhere, while status colors always ship with an icon and a label (`ArenaAlert`, `ArenaToast`, `ArenaBadge`) and never appear as a bare fill.

### Re-check after you swap

The promise above is only worth the validator that backs it. After changing anything in `contracts/design/`, rebuild (`bun run generate:tokens`) and then:

```bash
bun scripts/check/core/check-ramp.ts
```

It reads the ramp straight out of `palette.generated.css`, which the build regenerates from the DTCG source, measures both themes against their real surfaces, and exits non-zero on any failure, **including** the warnings the upstream validator tolerates, because Arena's shipped ramp needs no relief rule and neither should yours. Do not trust your eye here; nobody's eye simulates deuteranopia.

## Two documents live beside this one, and the split is by audience

All three are normative, and none is a summary of another.

**[`Scales.md`](./Scales.md)** carries every scale step by step: type, layering, quantity
invariants, control density, tracking, line height, motion and behaviour timing. What a table
there adds to the JSON is **which role a step plays**, which is what a reader choosing between
two steps needs and the one thing the JSON cannot say.

**[`TokenTypes.md`](./TokenTypes.md)** carries the DTCG `$type` of every group, the strict
2025.10 value formats, the `script: true` flag and what the map deliberately leaves out. It is
the second thing a new platform target reads.

**This document states what a value MEANS**, which is what anyone choosing a colour needs; that
one states what shape it arrives in, which only somebody authoring a token or targeting a new
platform needs. **And the values themselves are the DTCG JSON in this directory**, which is
machine-readable and cheaper to read than any of the three.
