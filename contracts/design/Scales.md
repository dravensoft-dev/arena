# Arena's scales, step by step

> **The tables half of the design specification.** [`AGENTS.md`](./AGENTS.md) beside it is what
> DECIDES: the voice, the colour meanings, the danger convention, iconography, theming and the
> layer contract. [`TokenTypes.md`](./TokenTypes.md) is the third audience, the DTCG `$type`
> every group carries and the shape a value is authored in.

Every step of every scale, with what each one is for. **The values themselves are the DTCG
JSON in this directory**, which is machine-readable and cheaper to read than any of the three
documents; what a table here adds is which role a step plays, which is the thing a reader
choosing between two steps actually needs and the one thing the JSON cannot say.

## Type scale (`fs`)
Editorial type, meaning prose and headings and never chrome (see the `dz` table above for the density scale that governs buttons, inputs and labels instead). Closed and semantic: each name is a role, the scale gains no in-between steps, and an off-scale editorial size snaps to its nearest neighbor rather than adding one. The ratio between steps accelerates through the reading range and into display:

| Token | Value | Ratio from previous | Role |
|---|---|---|---|
| `--fs-xs` | 11px | none | mono labels / captions |
| `--fs-sm` | 13px | 1.18 | |
| `--fs-md` | 15px | 1.15 | body copy |
| `--fs-lg` | 17px | 1.13 | |
| `--fs-h4` | 19px | 1.12 | |
| `--fs-h3` | 24px | 1.263 | |
| `--fs-h2` | 32px | 1.333 | |
| `--fs-h1` | 44px | 1.375 | |
| `--fs-display` | 64px | 1.455 | large display heading |
| `--fs-hero` | 96px | 1.5 | extrapolated step continuing the scale's accelerating ratio past `display`; **no consumer today, by design**, since it closes the jump to `mega` so the progression stays coherent, and is not dead API to prune |
| `--fs-mega` | 150px | 1.5625 | the approved brand manual's `.big-glyph` specimen |

Exposed in the Tailwind layer as `.text-xs`/`.text-sm`/`.text-md`/`.text-lg`/`.text-h4`/`.text-h3`/`.text-h2`/`.text-h1`/`.text-display`/`.text-hero`/`.text-mega` (`frameworks/tailwind/Theme.css`, `--text-*`).
- **Spacing:** 4px base grid; generous rhythm in marketing (88px gutter), dense but breathable in product. The grid is the repertoire of lengths; which of them separates two components is the `rhythm` table below, and that is the one a reader choosing between two steps needs.
- **Backgrounds:** **always flat.** Arena **does not use color gradients** on any surface: not heroes, not splash screens, not cards, not accents. Depth is built with the surface scale (`base-100`→`base-200`→`base-300`), the hairline border and the warm shadow, never with color transitions. (The only permitted use of `linear-gradient`: the `ArenaSkeleton`'s neutral *shimmer* animation, which is loading motion, not chromatic decoration.) No generic stock photos; real product imagery or striped placeholders.
- **Borders:** hairline `1px` in `--color-base-300` (alias `--border`); emphasized border in `--line-strong`. The border, not the shadow, is used to separate content on flat surfaces.
- **Shadows:** warm and deep, negative spread (`0 12px 28px -12px rgba(0,0,0,.6)`). There is no tinted glow: elevation is always the neutral warm shadow.
- **Radii:** contained, with buttons/inputs at 6px, cards at 14px and the app tile at 22%. `--r-2xl` (34px) is one step further, following the scale's own ratio (22→34 is ×1.55, in line with the tightest existing step), and it is the brand manual's splash-screen tile, a distinct role from `--r-xl`'s app icon tile. Nothing fully round except avatars and switches. **Floating overlays:** modals (ArenaDialog, ArenaConfirmDialog, ArenaCommandPalette, ArenaOnboarding) use `--r-lg` (14px); minor non-modal floating surfaces (ArenaToast, ArenaMenu, ArenaBulkActionBar) use `--r-md` (10px). The rule: if it captures the whole screen with a scrim, `--r-lg`; if it's a bounded panel over the UI, `--r-md`.
- **Cards:** surface `--surface-card`, hairline border, 14px radius, no shadow in lists (border only) and `--shadow-2` when floating (menus, dialogs).
- **Animation:** `--ease-out` for entrances, `--ease-emphatic` for the "rotor" gesture, the brand's easing character, named for the mark's rotation. Transitions run 120/220/420ms (`dur`); a looping animation (`ArenaSpinner`, `ArenaProgressBar`, `ArenaSkeleton`) runs on its own, slower scale measured in seconds (`loop`; see the motion scale table below), because it reports ongoing work rather than responding to an action. No excessive bounce.
- **`prefers-reduced-motion`:** every animation in the system answers it, and what it answers depends on what the motion *means*. Motion that reports work in progress **slows** (`ArenaSpinner`, `ArenaProgressBar`, `ArenaButton`'s loading ring). Never freeze it: a stopped spinner reads as a hung process, which is the opposite of the truth. Purely decorative motion **stops** (`ArenaSkeleton`'s shimmer falls back to a flat surface). An entrance **keeps its fade and drops its travel** (`ArenaDialog`, `ArenaMenu`): the movement is the vestibular trigger, the fade is the meaning. Opacity-only animations (`ArenaTooltip`) need no clause, because there is nothing to reduce. (`ArenaTooltip` is also a deferred affordance: it waits `--delay-open` before appearing at all, a pointer-intent delay orthogonal to reduced motion; see the behaviour timing table below.)
- **Hover:** lighten the surface one step (`--color-base-300`→`--line-strong`) or raise opacity; on accent buttons, hover raises the general elevation (`--shadow-2`). *Note:* the `--crimson-strong`/`--gold-strong`/`--danger-strong` variants **alias to the base color**, since there is no separate darker "strong" tone; press emphasis is achieved with scale, not a second tone.
- **Press:** `scale(.98)` on small controls.
- **Focus:** gold ring `2px` with `2px` offset, always visible and never `outline:none` without a replacement.
- **Transparency/blur:** blur only on dialog overlays (`backdrop-filter: blur(6px)` over `rgba(20,16,16,.6)`).
- **Uppercase microcopy (H2/H6/H8):** reserve `text-transform:uppercase` + mono for **short microlabels** (≤2 words: eyebrows, field labels, status badges, table headers). **Messages, titles and any reading text go in normal case**, never uppercase sentences. Rule of thumb: if it doesn't fit in a "pill," it goes in normal case.
- **Navigate vs. filter (`ArenaTabs` vs. `ArenaSegmentedControl`):** the two are told apart by **shape and accent, not by size**. `ArenaTabs` changes the view: bare text on a hairline rule, stretched across the content, active marked by the **crimson underline**. `ArenaSegmentedControl` filters *within* the current view: an enclosed track that shrinks to its content, on the `--surface-input` surface that ArenaInput and ArenaSelect wear, selection marked by a **neutral raised thumb** (`--line-strong` + `--shadow-1`) and **no crimson at all**, because a filter does not spend the view's single primary accent, and the solid fill stays reserved for the primary action. They stack on purpose: tabs on top, the control beneath, filtering what the tab opened. A segmented control is **never** `role="tablist"`: it is a real radio group, since its options are mutually exclusive values, not destinations.
- **Single dismiss pattern (H4):** the icon dismiss always uses Phosphor `ph-x` (ArenaTag, ArenaToast). **Modals** (ArenaDialog/ArenaConfirmDialog) are closed with their **explicit button** (Cancel) or a click-outside where appropriate, not the icon; the two affordances are never mixed in the same component.
- **Component documentation (H10):** every `*.prompt.md` includes examples and, where it adds value, a **Do / Don't** section with the most common usage mistakes.

## Layering (stacking order)
What covers what is a system-wide invariant, not a per-component choice, so it is a token family, `z` (`contracts/design/layering.json`, generated into `contracts/design-generated/effects.generated.css`), rather than a literal chosen anew in each overlay component. **The family declares the order; the values only have to preserve it.** From least to most interruptible:

| Token | Value | Carried by |
|---|---|---|
| `--z-nav` | 800 | `ArenaBottomNav`, and the host's own fixed page chrome beside it: a sticky top bar, a second bar of its own. Below dropdown, so an `ArenaMenu` opened from the bar covers it |
| `--z-sheet` | 850 | `ArenaSheet`, and the host's own edge panels beside it: a cart, a filter drawer, a detail pane that leaves the page usable behind it. Above nav, because a sheet that slides over a fixed bar and lands under it is the failure; below dropdown, because an `ArenaMenu` opened from inside the sheet belongs over it |
| `--z-dropdown` | 900 | `ArenaMenu`, `ArenaSelect`'s popover layer |
| `--z-tooltip` | 950 | `ArenaTooltip`, above dropdown, so a tooltip on a menu item wins over the menu itself |
| `--z-modal` | 1000 | `ArenaDialog` |
| `--z-modal-nested` | 1050 | `ArenaConfirmDialog`, which opens *from* an `ArenaDialog` and so must sit above one |
| `--z-palette` | 1100 | `ArenaCommandPalette` |
| `--z-onboarding` | 1200 | `ArenaOnboarding`'s coachmark card |
| `--z-toast` | 1300 | `ArenaToast`, which floats above everything, including onboarding, because a transient notice raised by an action taken inside a dialog must stay visible |

`ArenaOnboarding`'s scrim is not a second token: it is one slot with two uses, and the two are separated by containment rather than by a number. The scrim takes the slot and the coachmark is drawn inside it, so it paints above by DOM order within one stacking context. That keeps "the scrim sits just under the coachmark" true by construction instead of requiring a second magic number nearby, and nothing else on the page can land between them, which is what a single slot means here.

**The family declares the order; the values only preserve it.** Every overlay reads its step from this table rather than declaring a number of its own, which is what makes the relationships above enforceable: a tooltip resolves above a menu item by design rather than by DOM order, and `ArenaConfirmDialog` sits above the `ArenaDialog` it opens from rather than by accident of mount order. A component that hardcodes a `z-index` outside this scale is a defect.

Exposed in the Tailwind layer as `.z-nav` / `.z-sheet` / `.z-dropdown` / `.z-tooltip` / `.z-modal` / `.z-modal-nested` / `.z-palette` / `.z-onboarding` / `.z-toast` (`frameworks/tailwind/Theme.css`, `--z-index-*`). **A consumer embedding Arena inside an app that has its own stacking context should read this table rather than guess at a number**: Arena's overlay components render in place (not one of them uses a React portal), so the global order above governs any of them mounted as siblings. **A slot is not declared for the component that stands on it.** `--z-nav` and `--z-sheet` were both minted while Arena drew nothing at either step, and they were right then for the reason they are right now: the host's own chrome, a sticky header or a second bar, and the host's own edge panels have to interleave with Arena's overlays, and a slot they can name is the difference between an order by design and an order by DOM. `ArenaBottomNav` and `ArenaSheet` stand on them today; a host's own bar stands beside `ArenaBottomNav` on the same step, and that is the arrangement the slot exists to make orderly. `--z-sheet` is now the one step no Arena component would leave empty if it were removed, and it stays for the same reason `--z-nav` did before the bar arrived. **A sheet is not an `ArenaDialog` wearing a different placement**: it is not modal, it carries no scrim and it leaves the page usable behind it, which is why it sits two slots below the one that takes the whole interaction. Any other host `z-index` is chosen against this scale too, not against whatever the host already had lying around. `display/arena-calendar/ArenaCalendar.tsx`'s `zIndex: 1` is not part of this family: it is local stacking inside a positioned container, scoped entirely inside one component, and stays a hand-written literal.

## Quantity invariants (`limit`)
System-wide bounds on how much is shown, the twin of `z`: same `$type` (`number`), same character. `z` declares the stacking order; `limit` declares the invariant, and a component derives its own consequences from it. The source is `contracts/design/behaviour.json`, generated into `contracts/design-generated/effects.generated.css`.

| Token | Value | Role |
|---|---|---|
| `--limit-pagination-siblings` | 1 | how many page numbers flank the current one before `ArenaPagination`'s list elides. The window's total width is a *consequence*, derived at the point of use as `first + last + (2 × siblings + 1) + two ellipses`, and never authored as a second number |

**Script-readable, not Tailwind-exposed**: unlike `z`, `limit`'s consumer is an array bound in JavaScript, not a CSS property, so it carries no utility class. It reaches React as the bare number `limitPaginationSiblings` (`frameworks/react/Tokens.generated.js`) and is named in `check:coverage`'s `EXCLUDED` map for that reason rather than reaching a utility.

## Control density type scale (`dz`)
Chrome text, meaning a button label, an input's value, a hint, a validation error, a badge or a table cell, is governed by how dense the surrounding controls are, not by the prose scale (`fs`). `dz` declares control heights, row padding, stack gap and its own five-step text scale, generated into `contracts/design-generated/spacing.generated.css` from `contracts/design/spacing.json` (base) and `contracts/design/density.compact.json` (the `.arena-compact` override):

| Token | Value | Compact (`.arena-compact`) | Comfortable (`.arena-comfortable`) | Role |
|---|---|---|---|---|
| `--dz-text` | 14px | 13px | 14px | control text: buttons, inputs, selects, menu items, table cells |
| `--dz-text-md` | 13px | 12px | 13px | secondary control text: tag chips, pagination, secondary buttons |
| `--dz-text-sm` | 12px | 11px | 12px | secondary control text: hints, validation errors, badges, legends |
| `--dz-text-xs` | 11px | 10px | 11px | micro control text: field labels, shortcuts, eyebrow labels |
| `--dz-text-2xs` | 10px | 10px | 10px | column headers, row micro-labels |

**Comfortable grows the box and leaves the words alone**, and the asymmetry with compact is the
point. Compact shrinks the text because an expert reading a dense table is trading legibility for
how much fits on a screen; comfortable has nothing to buy with the same trade, so `--dz-ctl-h`
goes to 48px, `--dz-ctl-h-sm` to 40px, `--dz-ctl-h-lg` to 56px, `--dz-row-py` to 16px,
`--dz-row-px` to 20px and `--dz-stack` to 16px, while every step above stays where it is.

48px is the number that matters: it clears the 44px WCAG 2.5.8 asks at its enhanced level, which
the 40px base does not. This is the whole reason target size is density's axis and never a design
extension's, since how large a control is answers who is pointing at it rather than what voice the
product speaks in. The two density classes are mutually exclusive with each other, because both
set the same keys, and compose with a theme and with an extension, because those set others.

`--dz-text-2xs` does not shrink further in the compact scope: −1px would land it at 9px, which the system treats as illegible drift and snaps away from everywhere else, so reintroducing it as a systemic compact value would undo that call one layer down. Every other step follows the `−1px` precedent `--dz-text` itself sets (14→13).

`--dz-text` is the one token for the "control text" role; every consumer reads it.

Exposed in the Tailwind layer under a `ctl` infix (`--text-ctl`, `--text-ctl-md`, `--text-ctl-sm`, `--text-ctl-xs`, `--text-ctl-2xs`) because the natural `--text-*` keys already belong to `fs`, and two collide on value as well as name (`fs.sm` / `dz.text-md` are both 13px; `fs.xs` / `dz.text-xs` are both 11px). No `dz` token wears an `fs`-shaped name: the `ctl` infix is what keeps the two namespaces distinguishable.

## Page rhythm (`rhythm`)
The air BETWEEN two components, which Arena itself never draws: every component is an inner box carrying no outer margin, so the space between one and the next belongs to whoever places them. Three steps, authored as aliases of `sp` rather than as fresh numbers so a step cannot drift off the 4px grid, generated into `contracts/design-generated/spacing.generated.css` from `contracts/design/spacing.json`:

| Token | Value | Role |
|---|---|---|
| `--rhythm-group` | 12px (`sp-3`) | inside one group of related things: a label and its field, a card's own stacked children, a row of chips. Both sides read as one unit |
| `--rhythm-component` | 16px (`sp-4`) | between two peer components: a card and the next card, a chart and the table under it. Both sides are separate things standing on the same footing |
| `--rhythm-section` | 24px (`sp-6`) | between two sections of a page. The two sides answer different questions, and this gap is what says so |

**These three were already chosen, and what they lacked was names.** `ArenaGrid`'s `gap` variant has always spent `sm`/`md`/`lg` on exactly 12/16/24px with the middle as its default, and it reads the tokens now rather than the raw steps, so a grid is the rhythm plus a grid.

**The scale is closed at both ends.** A gap tighter than `--rhythm-group` is inside a component rather than between two, which is that component's own recipe and not a page decision. A gap wider than `--rhythm-section` is the frame a page draws around its content rather than rhythm within it, and a frame is the consumer's.

**It does not re-densify.** `.arena-compact` tightens `dz`, meaning control heights, row padding and control text, because those say how dense the CONTROLS are. Page rhythm says how a PAGE breathes, and a data-dense table does not make the distance between two cards mean something else. This is the same cut that keeps `fs` out of `dz`.

**`--rhythm-group` and `--dz-stack` are both 12px, and that is not a duplicate.** The precedent is one section up: `fs.sm` / `dz.text-md` are both 13px and `fs.xs` / `dz.text-xs` are both 11px, told apart by namespace because the role differs. Here `--dz-stack` separates stacked items on a control-dense surface and compresses to 8px under `.arena-compact`; `--rhythm-group` separates a page's own content and holds at 12px. Same length today, different question, and only one of them moves.

Exposed in the Tailwind layer as `--spacing-group` / `--spacing-component` / `--spacing-section` (`frameworks/tailwind/Theme.css`), so the utilities read `gap-section`, `p-group` and so on. The middle step is named `component` rather than `block` because `p-block` and `m-block` would read as the block axis of a logical property instead of as a step on this scale.

## Tracking scale (`ls`)
Letter-spacing across the system is one role hierarchy: **tracking decreases as the text gets longer**, from the shortest mono micro-labels down through prose-adjacent chrome to the tightest display headings. The family below is that hierarchy, generated into `contracts/design-generated/typography.generated.css` from `contracts/design/typography.json`:

| Token | Value | Role |
|---|---|---|
| `--ls-tight` | `-0.02em` | display, meaning tight headings |
| `--ls-normal` | `0` | no tracking: button labels, glyph pairs |
| `--ls-mono-nav` | `0.04em` | mono navigation: breadcrumbs, bulk-action counts |
| `--ls-uppercase-status` | `0.06em` | uppercase status text: alerts, toasts, calendar hour labels |
| `--ls-badge` | `0.1em` | badge and pill text |
| `--ls-column-header` | `0.12em` | column header / micro-label |
| `--ls-field-label` | `0.14em` | form field label |
| `--ls-label` | `0.22em` | mono uppercase labels: section eyebrows |
| `--ls-wide` | `0.34em` | eyebrows (`intro/Arena - Overview.html`'s `.kicker`/`.eyebrow`) |

`ls` is a **semantic** family: a value used by only one component does not earn a step of its own, since there is nothing to derive a role from. A singleton snaps to the nearest existing step instead, which is why `ArenaButton`'s and `ArenaAvatar`'s uppercase pairs both read `--ls-normal` (0) and `ArenaMenu`'s section header reads `--ls-field-label` (.14). Where a value falls exactly between two steps, as a `.02em` sits between `--ls-normal` and `--ls-mono-nav`, it resolves downward, consistent with the hierarchy bottoming out at zero. And a role rendered at two values 0.01 or 0.02 apart is one role with drift, not two: every eyebrow reads `--ls-label` and every display title reads `--ls-tight`, rather than the scale gaining a step for the difference.

Exposed in the Tailwind layer as `.tracking-tight` / `.tracking-normal` / `.tracking-mono-nav` / `.tracking-uppercase-status` / `.tracking-badge` / `.tracking-column-header` / `.tracking-field-label` / `.tracking-label` / `.tracking-wide` (`frameworks/tailwind/Theme.css`, `--tracking-*`).

## Line-height scale (`lh` / `dz.lh`)
Line height splits editorial from control exactly the way `fs`/`dz` split font size. Prose that wraps needs breathing room between its own lines, and that is `lh`, in `contracts/design/typography.json`. A box built around a single glyph (an icon inside a button, a standalone status icon, an icon-only close or remove control) needs the opposite: a line box that is *exactly* its glyph, so the extra space above and below a normal line height never throws the surrounding control out of alignment. That reset is a density/control concern, not an editorial one, so it lives in `dz` (`contracts/design/spacing.json`) alongside the rest of the control scale, carrying its own token-level `$type: "number"` override, because a line height is unitless, unlike every other `dz` member.

| Token | Value | Role |
|---|---|---|
| `--lh-tight` | `0.98` | sub-1em, the tightest display headings |
| `--lh-snug` | `1.15` | snug prose: short labels and values that still wrap on occasion (`ArenaStatCard`'s value, `ArenaRadio`'s label, `Shell`'s person block) |
| `--lh-body` | `1.6` | prose: paragraphs, dialog and alert body copy, messages |
| `--dz-lh` | `1` | glyph-tight, the control reset, where the box is exactly its glyph |

Three prose steps cover every wrapping site in the system, and a value within 0.05 of one is drift rather than a fourth step: it moves to the token.

Exposed in the Tailwind layer as `.leading-tight` / `.leading-snug` / `.leading-body` (`frameworks/tailwind/Theme.css`, `--leading-*`). `--dz-lh` is exposed as `.leading-ctl` rather than `.leading-none`, because the `--leading-*` namespace holds three editorial steps (`tight`, `snug`, `body`) plus this one control token, and a name indistinguishable from its editorial neighbours would be a `dz` token wearing an `lh`-shaped name, which is the mistake the `fs`/`dz` split exists to prevent. The `ctl` infix keeps it visibly a density role, consistent with `--text-ctl`.

## Motion scale (`dur` / `loop`)
Two families, one `$type: duration`, two roles that must not merge. `dur` is the transition scale: a response to an action, over in the low hundreds of milliseconds. `loop` is cyclical motion: it reports that work is *ongoing*, and is measured in seconds rather than milliseconds, because a spinner or an indeterminate progress sweep is not "responding" to anything, it is signaling that something is still running. Merging the two would repeat the mistake the `fs`/`dz` split exists to prevent: one scale asked to carry two roles at once. Both live in `contracts/design/effects.json`, generated into `contracts/design-generated/effects.generated.css`.

| Token | Value | Role |
|---|---|---|
| `--dur-fast` | 120ms | micro-interactions: hover, press |
| `--dur-mid` | 220ms | most transitions: menus, tooltips, dialogs entering |
| `--dur-slow` | 420ms | larger surface changes |
| `--loop-spin` | 700ms | `ArenaSpinner`, and `ArenaButton`'s loading ring |
| `--loop-sweep` | 1150ms | `ArenaProgressBar`'s indeterminate sweep |
| `--loop-shimmer` | 1400ms | `ArenaSkeleton` |
| `--loop-brand` | 8000ms | the brand mark's rotation, slow enough to read as presence rather than progress |
| `--loop-reduced` | 2400ms | what every working loop above slows to under `prefers-reduced-motion` |
| `--loop-brand-reduced` | 24000ms | the brand mark's reduced step, three times slower again, because that rotation is decoration that also happens to mean "alive" |

`prefers-reduced-motion` does not stop a working loop, it **slows** it: `--loop-reduced` (and the brand mark's own, three-times-slower `--loop-brand-reduced`) is that slowed step, never zero: a frozen spinner reads as a hung process, the opposite of what it exists to report. Purely decorative motion is the other case, and stops outright: `ArenaSkeleton`'s shimmer falls back to a flat surface, since there is nothing left to report once it stops.

Exposed in the Tailwind layer as an arbitrary value against each token, `duration-[var(--loop-spin)]` and so on, rather than as a named utility: Tailwind v4 has no duration namespace of its own for either family to extend.

**A transition names four roles and no scale step, and the easing scale is where that rule was half kept.** `dur` above says how long, `ease` (`--ease-out`, `--ease-in-out`, `--ease-emphatic`, `contracts/design/effects.json`) says on what curve, and neither says *which* transition is being asked about. The questions are in `contracts/design/roles.json`: `--dur-hover` and `--ease-hover` for a response to a pointer, `--dur-state` and `--ease-state` for a change the eye follows, plus `--press-scale` for how far a control sinks while it is held and `--lift-control` for how far it rises. A manifest writes those and `check:roles` fails one that writes `--dur-fast` or `ease-out`, because only a question can be answered differently by one voice than by another: `showcase` takes the hover to 220ms **on `ease.in-out`**, which is an object with mass being moved rather than the same instant answer taking longer.

The three `ease` steps stay reachable where no voice has a question to re-answer: every entrance in `frameworks/tailwind/Animations.css` is a keyframe rather than a transition, and the rotor's `--ease-emphatic` is the brand's own gesture. Those answer the `prefers-reduced-motion` policy above, which is a floor and belongs to nobody.

## Behaviour timing (`delay` / `dismiss`)
Two more `$type: duration` families, deliberately not part of `dur` or `loop` above. `dur` measures how long a transition takes *once it has been decided*; `delay` measures how long the system waits *before deciding*, which is pointer intent rather than motion. `dismiss` measures how long a transient notice is left alone before it withdraws itself, which is a permanence decision, not a transition either. Both live in `contracts/design/behaviour.json`, generated into `contracts/design-generated/effects.generated.css`.

| Token | Value | Role |
|---|---|---|
| `--delay-open` | 400ms | rest time before `ArenaTooltip` appears, long enough that a pointer crossing a toolbar reveals nothing |
| `--delay-close` | 120ms | grace period after the pointer leaves, so travelling between a trigger and its own tooltip does not dismiss it |
| `--dismiss-default` | 4200ms | how long an `ArenaToast` that only has to be read stays before it auto-dismisses |
| `--dismiss-actionable` | 7000ms | how long an `ArenaToast` carrying a button stays, per WCAG 2.2.1: it asks the reader to *decide*, not only to read |

`delay` applies to the **pointer only**: a keyboard focus must reveal its tooltip immediately, and routing that path through `--delay-open` would make an already-hard-to-reach control also feel broken. `dismiss` is run by the *host*, never by `ArenaToast` itself. `ArenaToast` renders and exposes `persist`, which overrides both values and never auto-dismisses, and which is mandatory in critical/error states so they are not missed (see the danger convention in [`AGENTS.md`](./AGENTS.md) beside this file).

**Script-readable, not Tailwind-exposed**: both families' consumers are `setTimeout` arguments in JavaScript, not CSS properties, so neither carries a utility class. They reach React as `delayOpen`/`delayClose`/`dismissDefault`/`dismissActionable` (`frameworks/react/Tokens.generated.js`) and are named in `check:coverage`'s `EXCLUDED` map for that reason rather than reaching a utility.


