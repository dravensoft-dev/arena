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

**Shipping a voice is therefore two things rather than one, the partial and the OFFER**, and
`bun run check:docs` holds the second: each layer's `PACKAGE.md` and the root `SKILL.md` must name
every voice this build ships, and must name no `arena-` scope class the generated sheets do not
answer to. Both directions were defects before they were rules. `editorial` shipped and reached
none of the three, so for a release the CLI offered two voices and every document a consumer reads
offered one; and a renamed voice leaves its old class behind in prose, where nothing else would
ever look at it.

## The three tiers

| Tier | Owns | Moved by |
|---|---|---|
| Floor | WCAG contrast, the non-text contrast of a control's boundary and of the focus ring, focus appearance, target size, the reduced-motion policy, danger recognisable without colour | Nobody |
| Extension | The grouping signal, the radius roles, the border roles, the surface FILL roles as an assignment, resting and raised depth, the air a surface gives its content and the air between two things, a heading's weight and tracking, the leading of prose above its floor, the motion roles, and the `fs` steps that shout | Arena, in a DTCG partial |
| Skin | The 27 palette colours and the three font roles | The consumer, in `arena.config.json` |

An extension may not lower a floor. `bun run check:boundary-contrast` is the one floor this
feature had to build: an extension that sets a control's or a field's border to zero has moved the
boundary onto the fill difference, and the gate measures whether that difference clears the 3:1
WCAG 1.4.11 asks, in both themes.

The ramp gate needs no per-scope variant, and that is a property of the tiers rather than an
omission: an extension cannot author a colour, and the categorical ramp is authored colour.

**`check:text-contrast` did not need one either, and now does.** This document used to argue the
point from "an extension cannot move a colour", which stopped being true when `fill-surface`
arrived: an extension may not WRITE a colour, but it may say which of the consumer's colours a
surface takes, and text on a surface moved from `base-200` to `base-100` sits at a different
ratio. The gate therefore measures the text levels once per extension scope crossed with both
themes. It skips an extension that lands on the same surfaces as no extension, and says how many
it skipped, so a scope is never quietly dropped.

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
| `figure-ground` | A surface standing off a floor | `bw-surface` is zero AND the surface is separated by a depth or by a fill of its own |
| `proximity` | Distance alone, with nothing drawn | `bw-surface` is zero, `shadow-surface-rest` paints nothing, `fill-surface` is the page's own colour, and `rhythm-section` is at least four times `rhythm-group` |

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

**An extension may give a heading a character, and the reading floor is a floor.** `fw-heading`,
`ls-heading` and `lh-prose` are roles for the same reason `pad-surface` is: `fw` is named by value,
so extrabold is 800 whoever asked for it, and only a question can be re-answered. They matter most
to a voice that draws nothing, because once the boxes are gone the distance between a heading and
the text under it IS the hierarchy.

`lh-prose` is floored at 1.5 and `check:extensions` measures the resolved value in every scope. The
citation matters, and this plan got it wrong once: **WCAG 1.4.12 does not require a line height of
1.5.** It requires that content survive a USER overriding spacing to 1.5 line height, 2x paragraph
spacing, 0.12em letter spacing and 0.16em word spacing without being clipped or lost, which is a
property of the layout and which no gate over a token file could hold. The criterion that asks an
author for 1.5 line spacing within a paragraph is **1.4.8 Visual Presentation**, at AAA, and
technique C21 spells it out on the body element. Arena's own `lh-root` is already set to exactly
that, so the floor holds a claim the repository was already making.

A reading voice wants one more thing that Arena cannot give it yet: a prose measure. It is refused
rather than missing. A measure that does not track the font size is not a measure, so it wants `ch`
units, and DTCG 2025.10 admits `px` and `rem` only. Widening that would trade a conformance claim
for one token, and the two components that set a measure today do it with an arbitrary literal.

**An extension answers how a control responds, and cannot touch what a response means under reduced
motion.** Five roles carry motion: `dur-hover` and `ease-hover` for a response to a pointer,
`dur-state` and `ease-state` for a change the eye follows, and `press-scale` beside `lift-control`
for the two directions a control travels under a press. The durations were promoted first and that
left the tier half built, because a duration cannot carry character on its own: 220ms on Arena's
default curve is the same instant answer taking longer than it should, and 220ms on `ease.in-out`
is an object with mass being moved. `showcase` sets both, and it sets them because a figure
standing off a ground is an object; a voice that groups by drawing a region has nothing to give
mass to.

`dur-state` and `ease-state` are moved by no voice in the catalogue, and that is not an oversight
waiting to be filled. They exist so a manifest naming a state transition names a role at BOTH ends
rather than a role for the duration and a scale step for the curve, which is the split `check:roles`
refuses. A question nobody has re-answered yet is still a question that has been asked.

What no voice may touch is what reduced motion means. `prefers-reduced-motion` is answered per
animation and per meaning: motion that reports work slows rather than stopping, decoration stops,
an entrance keeps its fade and drops its travel. Every one of those answers is a keyframe or a
media query in `frameworks/tailwind/Animations.css` rather than a token, so it is outside an
extension's reach by the same construction as everything else a manifest does not paint.
`ArenaButton` is the shape to look at: a voice may take `press-scale` to 0.96 and
`motion-reduce:active:scale-100` still cancels the whole gesture.

**An extension raises what shouts and never moves what is read.** `showcase` lifts `fs-h1`,
`fs-display` and `fs-hero` and leaves everything from `fs-h2` down exactly where it was. How large
a paragraph is set is a legibility decision that every voice shares, so widening the hierarchy is
done by raising the top of the ladder rather than by lowering its middle. A role is a question, which is why it can be
answered differently here: `r-surface` asks which corner, `bw-separator` asks which edge. A scale
is an answer shared by every use that happened to want that length, so re-valuing `r-lg` to soften
a card also softens every unrelated thing sitting on the same step. That is not an extension, it
is a different Arena.

**An extension spends air, and the cut against density is who is being asked about.** Two families
answer air, and both are open to a voice. `pad-surface` is the room a surface gives its own
content, and `rhythm-group`, `rhythm-component` and `rhythm-section` are the air BETWEEN two
things, which Arena never draws and a page applies. A voice needs both: a card given room on the
page and none inside it reads as a crowded object standing alone.

`rhythm` is reachable for the same reason the `fs` ladder is. Its steps are already roles with
names rather than an anonymous ladder, and `roles.json` says so itself when it calls its own
aliases "on the same footing as rhythm's aliases of sp". `check:extensions` accepts them by
pattern, as it does `fs`.

The floating tier deliberately has no padding role. A sheet is pinned to the viewport edge and a
coachmark to the element it points at, so their padding is a fit constraint rather than a statement
about air, and a lever there would let a voice push their content off the screen. Those four uses
are recorded in `SCALE_USES` with that reason rather than left to look like an oversight.

**An extension does not set `dz`.** Control height, row padding and control text say how dense the
CONTROLS and the DATA ROWS are, and that is density's question rather than a voice's: it is target
size, it is the same answer on a phone in any voice, and it composes with air rather than competing
with it. `.arena-compact` and a roomy voice is a coherent thing to want, and only separate axes let
somebody have it. Density is already its own axis, `.arena-compact`,
and letting an extension reach the same tokens would put two axes in contention with the cascade
deciding the winner instead of the author. This is also where Fitts's law is answered, once,
rather than in every extension: `density.comfortable.json` takes a control to 48px, clearing the
44px WCAG 2.5.8 asks at its enhanced level, which the 40px base does not. A shop on a phone and a
console on a desk can want the same extension and opposite densities, and only separate axes let
them have that. `.arena-compact` and `.arena-comfortable` are mutually exclusive with each other
and compose with everything else.

**An extension assigns a colour and never authors one.** The skin belongs to the consumer: the 27
values are theirs, and no extension writes one. What an extension may say is WHICH of them a
surface takes, through `fill-surface` and `fill-surface-floating`, the same way `r-surface` says
which corner rather than how round. A voice grouping by proximity needs exactly this and nothing
more: a card that keeps a fill keeps a region, however faint, and a voice that said it draws
nothing would be drawing one.

Three consequences worth stating rather than discovering.

**A fill role is emitted as `var(--color-base-200)` and not as the hex it resolves to.** A colour
resolved at build time would freeze one theme's palette into the other. It is the only family the
emitter treats this way; radius and depth stay resolved, because 14px is 14px in both themes.

**And a reference is emitted once per theme, because a `var()` inside a custom property is
substituted where the property is DECLARED and not where it is used.** `--fill-surface:
var(--color-base-200)` written only on `:root` computes against the dark palette and then inherits
that hex into a light region, so a light card came out dark. This was found by rendering, not by
reading. Every block carrying a colour reference is therefore restated under each theme scope, and
this is the same thing `contracts/design/colors.css` has always done by declaring its aliases under
`:root, .arena-light` rather than under `:root` alone.

**The split between the two fill roles is what makes flattening safe.** A voice may take a card
down to the page's own fill; a menu that followed it would be an unreadable overlay.

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

## A theme group, for the values a polarity does not share

A role a voice moves the same way in both themes is written at the top level of its partial. A role
whose right answer depends on the polarity goes in a group named after the theme:

```json
"shadow-surface-rest": { "$type": "shadow", "$value": <the rim>, "$description": "..." },
"light": {
  "shadow-surface-rest": { "$type": "shadow", "$value": "{shadow.1}", "$description": "..." }
}
```

**The top-level value is the dark answer as well as the default**, because `:root` is dark and a
theme group overrides it exactly as `.arena-light` overrides the palette. That asymmetry is in the
CSS already, and mirroring it is cheaper than inventing a `dark` group whose selector would have to
be a `:not()`.

The group emits three selectors, not one, because the voice class and the theme class can sit in
either order or on the same element: `.arena-light.arena-<name>`, `.arena-light .arena-<name>` and
`.arena-<name> .arena-light`. The third is the one an author forgets. Without it a page carrying
the voice on its root and a light region inside would take the dark answer inside that region,
which is the failure this paragraph exists to stop being rediscovered. All three are one
specificity step above the base block, so they win in both directions with no source-order
question.

A theme group carries no `$description` of its own. Every token inside it still carries one, which
is what `check:extensions` asks of a decision, and a description on the group would emit a comment
into whichever block came first.

## Grouping by elevation is polarity-dependent, and grouping by region is not

A hairline is visible on any surface. A shadow is a darkening, so it separates a light card from a
light page and does almost nothing between a dark card and a dark page: Arena's shadow scale is
warm black, and warm black on `#141010` is not a boundary. Measured on the specimen card, the same
extension reads as clearly lifted in light and as a slightly paler rectangle in dark.

This document used to say two further things, and both were wrong. They are stated here as
reversals rather than deleted, because the reasoning that replaced them is the reasoning a future
extension author needs.

**It said an extension leans on the surface scale in dark.** Measured, the scale cannot carry it.
The widest step Dravensoft's base ramp offers in dark is `base-300` on `base-100` at 1.13:1, and
`color-neutral` on `base-100` at 1.22:1, against 1.07:1 for the `base-200` a card sits on today.
None of those is an edge anybody sees. Reassigning which step a surface uses is a real mechanism
and it is worth having, but it is not the answer to dark: the ramp is deliberately a narrow
progression of warm blacks, it belongs to the SKIN, and an extension cannot widen what the
consumer owns.

**It said an extension cannot vary with the theme, because it is a scope class beside the palette
and not inside it.** That described the emission of the day rather than a principle, and the
emission changed. An extension partial may now carry a group named after a theme, and the
generator emits its tokens under that theme's scope as well as the base block. `showcase` pays
for depth differently in each polarity because the polarities are not symmetrical: in light a
darkening is a boundary, so it uses the drop shadow; in dark it uses a rim light, an inset lit
edge, which reads about 1.5:1 against the page because it is light on dark rather than dark on
dark.

The rim is inset and along one edge on purpose. A ring of light all the way round would be a
hairline drawn around a region, which is the mechanism this extension traded away, and
`check:extensions` would be right to be unable to tell the two apart. An edge lit from above is a
statement about an object standing in light, so it is still figure and ground.

An extension author checking their work in one theme only has not checked it, and
`check:extensions` no longer takes their word for it: the grouping invariant is measured once per
scope the catalogue ships.

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

`showcase`: grouping by elevation and air instead of by hairline, softer corners, a call to
action that lifts, and a hover that answers like an object: 220ms on the `in-out` curve, so it
starts from rest rather than at full speed, and a press that sinks twice as far as the default,
which is the return trip of the two pixels it rose. It removes `bw-surface` and not
`bw-control`, `bw-field` or `bw-separator`, because WCAG 1.4.11 asks 3:1 of a control's boundary
and a card is not a control, and because a table that lost the rules between its rows along with
its frame would stop being readable.

`editorial`: grouping by proximity, which means grouping by nothing drawn. It takes the line off a
surface like `showcase` does and then, unlike it, puts nothing in its place: the resting depth
stays neutral, `fill-surface` takes the page's own colour so a card stops being a card, and
`pad-surface` goes to zero because a surface with no line, no depth and no fill has no inside to
give room in. What is left is the ladder, tightened at one end and widened at the other: 8px inside
a group, 24px between peers, 64px between sections, a ratio of eight where the default is two.

That ratio is not decoration, it is the whole mechanism, which is why `check:extensions` holds it
above four. The other two voices can afford a gentler ladder because a hairline or a depth is
carrying the grouping beside it; this one has nothing else.

Its floating surfaces are deliberately untouched. A menu, a dialog and a toast are separated from
what they cover rather than grouped against it, so they keep `fill-surface-floating` and the
padding a fit constraint gives them. A voice that flattened them too would have made every overlay
unreadable to win an argument about cards, and that is the reason both families are split in two.

The half of a reading voice that lives in type used to be missing here, and this paragraph used to
say so: weight, tracking and measure were scales, so no voice could reach them. Two of the three
are roles now and `editorial` spends both, `fw-heading` to 900 and `lh-prose` to 1.8, which is the
same claim as its ladder made at the scale of the sentence.

**It leaves `ls-heading` alone, and the reason is the scale rather than the voice.** A reading voice
does want its headings tighter, and `ls` bottoms out at `tight`, which is exactly where `ls-heading`
already sits. Going further needs a new step on the scale, and a scale step is Arena's to add rather
than a voice's: an extension re-values a role, and the value it moves to is still one of Arena's.
The measure is refused rather than missing, for the `ch` reason above.

Its three `fs` steps do not reach the same distance, and the difference is worth stating rather
than leaving for a reader to discover. `ArenaPageHead` is the only component that consumes
`fs-h1`. No component consumes `fs-display` or `fs-hero` at all: those two reach a screen only
through the `text-display` and `text-hero` utilities, which a consumer writes in their own markup.
So the extension is louder on a page somebody authored than on one assembled from components
alone, and a reader comparing two voices across the component library will not see those two steps
move at all.
