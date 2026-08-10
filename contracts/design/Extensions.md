# Arena design extensions

**Normative, and for whoever authors an extension or wonders why one cannot do a thing.** What
the values MEAN is [`AGENTS.md`](./AGENTS.md) beside this file, and what shape they arrive in is
[`TokenTypes.md`](./TokenTypes.md). This document states what an extension is allowed to be.

## What an extension is

The same language spoken in a different situation. Arena's default voice maximises data-ink: it
groups by drawing a hairline around a region, keeps hierarchy flat and spends almost no depth.
That is right for mass data visualisation and wrong for a shop, where the job is to invite rather
than to scan. An extension is the second voice, and it is a **scope class that re-values role
tokens**, nothing more.

Each one is `contracts/design/extension.<name>.json` and reaches a page as `.arena-<name>` on a
root or on any container, the way `.arena-compact` does. A published Arena ships the catalogue; a
consumer picks one. Arena authors them because Arena is the only party that can measure one
against the floors before it goes out.

## The three tiers

| Tier | Owns | Moved by |
|---|---|---|
| Floor | WCAG contrast, the non-text contrast of a control's boundary and of the focus ring, focus appearance, target size, the reduced-motion policy, danger recognisable without colour | Nobody |
| Extension | The grouping signal, the radius roles, the border roles, resting and raised depth, the motion roles, and the `fs` steps that shout | Arena, in a DTCG partial |
| Skin | The 27 palette colours and the three font roles | The consumer, in `arena.config.json` |

An extension may not lower a floor. `bun run check:boundary-contrast` is the one floor this
feature had to build: an extension that sets a control's or a field's border to zero has moved the
boundary onto the fill difference, and the gate measures whether that difference clears the 3:1
WCAG 1.4.11 asks, in both themes.

The contrast and ramp gates need no per-scope variant, and that is a property of the tiers rather
than an omission: an extension cannot move a colour, and Arena gates text at 4.5:1 flat with no
large-text exception, so a type-scale change can neither relax nor tighten what they measure.

## Every voice declares its grouping principle, and no two may share one

An extension exists to be told apart from the one beside it, and values alone cannot promise that:
two voices picking corners and depths independently end up differing by degree, which reads as one
voice with a dial rather than as a second answer. So the thing a voice declares is not its values
but its **mechanism**, in its own file:

```json
"$extensions": { "com.dravensoft.arena": { "grouping": "figure-ground" } }
```

Three are known, and they are the Gestalt principles a flat surface can actually spend:

| Principle | What says two things belong together | The invariant `check:extensions` holds |
|---|---|---|
| `common-region` | A line drawn around a region | `bw-surface` is not zero |
| `figure-ground` | A surface standing off a floor | `bw-surface` is zero AND `shadow-surface-rest` paints something |
| `proximity` | Distance alone, with nothing drawn | `bw-surface` is zero AND `shadow-surface-rest` paints nothing |

The invariants are measured against RESOLVED values rather than authored ones, because a role a
voice leaves alone still carries what it inherits, and an alias hides whether it landed on zero.

`check:extensions` fails an extension that declares no principle, one that declares a name Arena
does not know, one whose values contradict its claim, and **two extensions that declare the same
principle**. That last one is the rule the whole catalogue rests on. A fourth voice therefore needs
a fourth mechanism and the invariant that holds it, added to `PRINCIPLES` in
`scripts/check/core/check-extensions.ts`, rather than a fourth name for one of these three. The
open slot is similarity, where a group is marked rather than enclosed or lifted, and it is the only
one that would need a manifest to paint an ornament it does not paint today.

Everything else a voice decides follows from the principle rather than sitting beside it. A figure
needs a silhouette, so its corner is generous and ground has to surround it; an object answers with
mass, so it lifts and it answers slowly. A voice that grouped by proximity and then rounded its
corners would be rounding a box it just said was not there.

## What an extension may move, and the two cuts that say why

**Roles, and the `fs` ladder.** Every key in an extension file is a role in
[`roles.json`](./roles.json) or a step of `fs`, and `bun run check:extensions` fails one that is
neither. `fs` is the single family outside the role tier an extension may reach, because its steps
are already roles with names rather than an anonymous ladder: re-valuing `fs-display` drags no
unrelated use with it the way re-valuing `r-lg` would, and the hierarchy ratio is half of what
separates a landing page from a panel.

**An extension raises what shouts and never moves what is read.** `expressive` lifts `fs-h1`,
`fs-display` and `fs-hero` and leaves everything from `fs-h2` down exactly where it was. How large
a paragraph is set is a legibility decision that every voice shares, so widening the hierarchy is
done by raising the top of the ladder rather than by lowering its middle. A role is a question, which is why it can be
answered differently here: `r-surface` asks which corner, `bw-separator` asks which edge. A scale
is an answer shared by every use that happened to want that length, so re-valuing `r-lg` to soften
a card also softens every unrelated thing sitting on the same step. That is not an extension, it
is a different Arena.

**An extension does not set `dz`.** Control height, row padding and control text say how dense the
CONTROLS are, and that is density's question. Density is already its own axis, `.arena-compact`,
and letting an extension reach the same tokens would put two axes in contention with the cascade
deciding the winner instead of the author. This is also where Fitts's law is answered, once,
rather than in every extension: `density.comfortable.json` takes a control to 48px, clearing the
44px WCAG 2.5.8 asks at its enhanced level, which the 40px base does not. A shop on a phone and a
console on a desk can want the same extension and opposite densities, and only separate axes let
them have that. `.arena-compact` and `.arena-comfortable` are mutually exclusive with each other
and compose with everything else.

**An extension does not set a colour.** That is the skin, and the skin belongs to the consumer.

**An extension paints no gradient.** It was weighed and refused rather than never considered: a
fill whose colour is a range turns text contrast into a range too, so the floor stops being a
number a gate can hold, and DTCG 2025.10 has no type for a gradient function, so the value could
not be a token in the first place. An extension buys its expression with shape, depth and motion.

The rule those three share: **the axes own disjoint token groups**, so an extension, a density and
a palette can compose in any combination and no ordering question arises.

## Ordering, and the one thing that would break it

A role is declared on `:root` and an extension on `.arena-<name>`, which are equal specificity.
Source order is therefore what decides, and the extension block is emitted after the `:root`
blocks in `FILES` in `scripts/generate/arena/generate-tokens.ts` for exactly that reason.
`check:extensions` joins the file to the block and fails either half alone, because a file the
generator does not emit paints nothing, and a block naming no file emits nothing, and each looks
complete on its own.

## Grouping by elevation is polarity-dependent, and grouping by region is not

A hairline is visible on any surface. A shadow is a darkening, so it separates a light card from a
light page and does almost nothing between a dark card and a dark page: Arena's shadow scale is
warm black, and warm black on `#141010` is not a boundary. Measured on the specimen card, the same
extension reads as clearly lifted in light and as a slightly paler rectangle in dark.

That is a property of figure/ground rather than a defect in the mechanism, and an extension cannot
answer it by varying with the theme, because an extension is a scope class beside the palette and
not inside it. `expressive` therefore leans on something a floor already guarantees: the
`base-100` to `base-200` to `base-300` surface scale is what separates a card from the page in
dark, and the shadow is what adds to it in light. An extension that removes `bw-surface` is
choosing that trade, and an extension author checking their work in one theme only has not checked
it.

Two surfaces exist so that check is not a matter of remembering to make it.
`intro/guidelines/design-extension.html` renders one specimen built from the real manifests once
per voice and once per theme, in a grid, so the polarity difference is the thing the page is
about rather than something a reader has to hold in memory between two visits. Everywhere else,
`intro/extension.js` reads the catalogue from `--arena-extensions` and cycles the scope class: as
a control in the toggle dock on the Overview and the playgrounds, and as `?extension=<name>` in
the URL on the specimen cards and the Console, which draw no dock because a floating control would
land in every capture of them.

## What an extension cannot reach, and the reason it is not a bug

A token re-values a declaration a slot already makes. It cannot add one. A surface that painted no
`box-shadow` could never be given depth here, however the extension was written, which is why the
flat surfaces and controls carry `shadow-surface-rest` and `shadow-control-rest` at a fully
transparent value, and why `ArenaButton` carries a zero `lift-control`. The property is painted so
that a value can move it. Anything a manifest does not paint at all is outside an extension's
reach by construction, and adding it is a change to the manifest rather than to the extension.

## The shipped catalogue

`expressive`: grouping by elevation and air instead of by hairline, softer corners, a call to
action that lifts, and a hover slow enough to read as a response. It removes `bw-surface` and not
`bw-control`, `bw-field` or `bw-separator`, because WCAG 1.4.11 asks 3:1 of a control's boundary
and a card is not a control, and because a table that lost the rules between its rows along with
its frame would stop being readable.

Its three `fs` steps do not reach the same distance, and the difference is worth stating rather
than leaving for a reader to discover. `ArenaPageHead` is the only component that consumes
`fs-h1`. No component consumes `fs-display` or `fs-hero` at all: those two reach a screen only
through the `text-display` and `text-hero` utilities, which a consumer writes in their own markup.
So the extension is louder on a page somebody authored than on one assembled from components
alone, and a reader comparing two voices across the component library will not see those two steps
move at all.
