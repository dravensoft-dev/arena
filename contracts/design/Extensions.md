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
| Extension | The grouping signal, the radius roles, the border roles, resting and raised depth, the motion roles | Arena, in a DTCG partial |
| Skin | The 27 palette colours and the three font roles | The consumer, in `arena.config.json` |

An extension may not lower a floor, and it does not get to argue the point: the contrast and ramp
gates run against every scope Arena ships, not only against `:root`.

## What an extension may move, and the two cuts that say why

**Roles only.** Every key in an extension file is a role in [`roles.json`](./roles.json), and
`bun run check:extensions` fails one that is not. A role is a question, which is why it can be
answered differently here: `r-surface` asks which corner, `bw-separator` asks which edge. A scale
is an answer shared by every use that happened to want that length, so re-valuing `r-lg` to soften
a card also softens every unrelated thing sitting on the same step. That is not an extension, it
is a different Arena.

**An extension does not set `dz`.** Control height, row padding and control text say how dense the
CONTROLS are, and that is density's question. Density is already its own axis, `.arena-compact`,
and letting an extension reach the same tokens would put two axes in contention with the cascade
deciding the winner instead of the author. Comfortable controls are a second density file. This is
also where Fitts's law is answered, once, rather than in every extension.

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
