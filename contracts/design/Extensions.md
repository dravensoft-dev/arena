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
answer to. Both directions are failures a green tree carries otherwise: a voice the CLI offers and
no document names is a voice that did not ship, whatever the catalogue says, and a class named in
prose that no sheet emits is one nothing else would ever look at.

## The three tiers

| Tier | Owns | Moved by |
|---|---|---|
| Floor | WCAG contrast, the non-text contrast of a control's boundary and of the focus ring, focus appearance, target size, the reduced-motion policy, danger recognisable without colour | Nobody |
| Extension | The grouping signal; the radius, border and edge-colour roles; the FILL roles as an assignment; resting and raised depth; the air a surface gives its content, the air inside and between controls, and the air between two things; which face, case, tracking, step and weight a heading, an eyebrow and a label take; which of the consumer's colours each kind of text takes; the leading of prose above its floor and of a heading above 1; the width of a reading column; the motion roles; and the `fs` steps that shout | Arena, in a DTCG partial |
| Skin | The palette colours and the font roles, every key `arena.config.json` declares | The consumer, in `arena.config.json` |

An extension may not lower a floor. `bun run check:boundary-contrast` is the one floor this
feature had to build: an extension that sets a control's or a field's border to zero has moved the
boundary onto the fill difference, and the gate measures whether that difference clears the 3:1
WCAG 1.4.11 asks, in both themes.

The ramp gate needs no per-scope variant, and that is a property of the tiers rather than an
omission: an extension cannot author a colour, and the categorical ramp is authored colour.

**`check:text-contrast` does need one, and "an extension cannot move a colour" is not what
settles it.** An extension may not WRITE a colour, and it may still say which of the consumer's
colours a surface takes: text on a surface moved from `base-200` to `base-100` sits at a
different ratio, which is a contrast question `fill-surface` opens and the ramp gate never
faces. The gate therefore measures the text levels once per extension scope crossed with both
themes. It skips an extension that lands on the same surfaces as no extension, and says how many
it skipped, so a scope is never quietly dropped.

## Every voice declares its grouping principle, and no two may share one

An extension exists to be told apart from the one beside it, and values alone cannot promise that:
two voices picking corners and depths independently end up differing by degree, which reads as one
voice with a dial rather than as a second answer. So the thing a voice declares is not its values
but its **mechanism**, in its own file:

```json
"$extensions": {
  "com.dravensoft.arena": {
    "grouping": "figure-ground",
    "job": "invite and convert: marketing, commerce, onboarding, pricing"
  }
}
```

`PRINCIPLES` in `scripts/check/core/check-extensions.ts` is the register, and they are the Gestalt principles a flat surface can actually spend:

| Principle | What says two things belong together | The invariant `check:extensions` holds |
|---|---|---|
| `common-region` | A line drawn around a region | `bw-surface` is not zero |
| `figure-ground` | A surface standing off a floor | `bw-surface` is zero AND the surface is separated by a depth or by a fill of its own |
| `proximity` | Distance alone, with nothing drawn | `bw-surface` is zero, `shadow-surface-rest` paints nothing, `fill-surface` is the page's own colour, and `rhythm-section` is at least four times `rhythm-group` |
| `similarity` | Identical treatment, marked rather than enclosed | `bw-surface` is zero, `shadow-surface-rest` paints nothing, and `fill-surface` is NOT the page's own colour |

The invariants are measured against RESOLVED values rather than authored ones, because a role a
voice leaves alone still carries what it inherits, and an alias hides whether it landed on zero.

`similarity` and `proximity` are the same three measurements with the last one inverted, and that
is the point rather than a coincidence: both voices refuse to draw and to lift, so the only
question left is whether the surface is marked or is nothing at all. One says a set is a set
because every member gets the same treatment; the other says a set is a set because its members
are near each other and nothing is treated at all.

**`similarity` was an open slot until the role tier reached the ornament it needed.** The note that
stood here said it was the one mechanism that would need a manifest to paint something no manifest
paints, and that was true when it was written: nothing named a surface's fill or its edge as a
question, so there was nothing for a shared treatment to be made of. `fill-surface` and
`edge-surface` are painted in every slot that matters now, so the condition this document set is
met rather than waived.

`check:extensions` fails an extension that declares no principle, one that declares a name Arena
does not know, one whose values contradict its claim, and **two extensions that declare the same
principle**. That last one is the rule the whole catalogue rests on. A fifth voice therefore needs
a fifth mechanism and the invariant that holds it, added to `PRINCIPLES` in
`scripts/check/core/check-extensions.ts`, rather than a fifth name for one of these four. The
obvious candidate is continuity, where what aligns on one line reads as a series, and it is not
declared here for a reason worth stating: the invariant anybody reaches for first is that
`bw-surface` is zero and `bw-separator` is not, which says what the voice refuses to do and never
says what groups. A mechanism whose invariant cannot be measured is a name, and a name is what
declaring a principle exists to prevent.

Everything else a voice decides follows from the principle rather than sitting beside it. A figure
needs a silhouette, so its corner is generous and ground has to surround it; an object answers with
mass, so it lifts and it answers slowly. A voice that grouped by proximity and then rounded its
corners would be rounding a box it just said was not there.

## Why the tier reaches type, ink and internal air, which it did not

The role tier began as geometry, and the catalogue it produced was honest about what that bought
and quiet about what it cost. A shop adopted `showcase`, the voice for inviting and converting,
used forty-eight of the fifty-nine components, put no class of its own on any of them, passed the
audit clean, and still read as the default Arena with rounder corners. Then it wrote eight hundred
and twenty-two lines of its own CSS to look like a shop.

The count says why. `showcase` moved nineteen tokens and not one of them was a typeface, a text
case, a weight, an ink assignment or an internal gap. What a voice could reach was radius, border
width, depth, the air between components, motion, and the three `fs` steps that shout. Everything
else a page is made of was bound to a SCALE, and a scale is shared by every use that wanted that
value, so moving one is not an extension but a different Arena.

Measured across the forty-three manifests, before the tier grew:

| What a slot named | Uses | What a voice could do about it |
|---|---|---|
| `text-base-content`, at four levels | 122 | nothing |
| `border-base-300` and `border-neutral` | 49 | nothing |
| `font-mono` and `font-body` | 102 | nothing |
| `uppercase` | 25 | nothing |
| a radius role | 68 | everything |

Radius was the one family fully parameterised, which is exactly why `showcase` could only round
things more: rounding was the only lever it had. So the tier grew along the three axes the count
named. **Type**: which face, which case, which tracking, which step and which weight a heading, an
eyebrow and a label take. **Ink**: which of the consumer's colours a heading, body text, an eyebrow,
muted text and each of six edges takes. **Internal air**: the room a control gives its content and
the gap between the parts of one control, between two on a line, and between the members of a
group.

Two things did NOT change, and they are what keeps this an extension tier rather than a theme tier.
A voice still assigns a colour and never authors one, so every colour role takes a `{color.*}`
alias and `check:extensions` refuses a literal. And the cut against density is untouched: control
height, row padding and control text are still density's question, and `pad-control-x` says how
generous a control is where `dz-row-px` says how tight a data row is.

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
citation matters, and it is the one most easily got wrong: **WCAG 1.4.12 does not require a line height of
1.5.** It requires that content survive a USER overriding spacing to 1.5 line height, 2x paragraph
spacing, 0.12em letter spacing and 0.16em word spacing without being clipped or lost, which is a
property of the layout and which no gate over a token file could hold. The criterion that asks an
author for 1.5 line spacing within a paragraph is **1.4.8 Visual Presentation**, at AAA, and
technique C21 spells it out on the body element. Arena's own `lh-root` is already set to exactly
that, so the floor holds a claim the repository was already making.

A reading voice wants one more thing, and it took two goes to see how to give it: a prose measure.
It was refused first, and the refusal was right about the obstacle and wrong about the exit. A
measure that does not track the font size is not a measure, so it wants `ch` units, and DTCG 2025.10
admits `px` and `rem` only. But that is a constraint on the `dimension` type, and a measure was
never obliged to be one. `ls` had already found the way out: a `number` carrying
`$extensions["com.dravensoft.arena"].cssUnit`, which is how every tracking step emits `em` without
`em` being a dimension unit. `measure-prose` is the same shape with `ch`, it widens nothing, and the
two components that set a measure with an arbitrary literal now have a role to name instead.

**An extension answers how a control responds, and cannot touch what a response means under reduced
motion.** The motion roles are `dur-hover` and `ease-hover` for a response to a pointer,
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
an entrance keeps its fade and drops its travel. A fourth meaning is that motion reporting a
SETTING rather than progress stops outright, which is `ArenaSwitch`'s knob. Every one of those
answers is a keyframe, a media query or a `motion-reduce:` class in a manifest rather than a
token, so all of them are outside an extension's reach by the same construction as everything
else a manifest paints and a voice does not.
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

**The split between the fill roles is what makes flattening safe.** A voice may take a card down to
the page's own fill; a menu that followed it would be an unreadable overlay.

**And the page itself is a role now, which it was refused once.** `fill-page` was dropped rather
than deferred, and the reason given was that no voice in the catalogue asked for one. That was
true of the catalogue as it stood. It grew, and two voices now cannot be written without it:
`similarity` says a surface is marked, which is a statement about how it differs from the floor,
and a voice that wants a card to vanish into the page has to be able to name the page. It also
fixed a gate rather than only unblocking a voice. `fillsLikeThePage()` compared `fill-surface`
against the literal `color-base-100`, so a voice that moved the floor would have failed the
`proximity` invariant for having moved the very thing that invariant is about. The comparison is
against the role, and falls back to the constant only where the role does not resolve.

**And the rule is about being redeclared, not about being a colour.** That was clear only once a
second axis needed it. `step-eyebrow` points at a `dz` step, because an eyebrow is control-sized
text and re-densifies with everything else; resolved at build time it would have frozen the base
11px and carried it into a `.arena-compact` region, which is the light-card defect one axis over.
`REDECLARED_GROUPS` in `scripts/generate/arena/generate-tokens.ts` therefore names the groups some
other scope redeclares, the palette and `dz`, and a reference is restated beside each of them.
Everything else still resolves, because 14px is 14px in every scope there is.

**An extension paints no gradient.** It was weighed and refused rather than never considered: a
fill whose colour is a range turns text contrast into a range too, so the floor stops being a
number a gate can hold. DTCG 2025.10 also has no type for a gradient function, and that half of the
argument is now the weaker one, because Arena did add a type: `keyword`, for the words a property
takes that no 2025.10 type spells, documented in [`TokenTypes.md`](./TokenTypes.md). The cut between
the two is what a gate can still hold afterwards. A keyword names the words it may take, so
`check:dtcg` refuses the rest and nothing downstream loosens. A gradient has no such set, and the
thing it would loosen is the contrast floor, which is the one tier an extension may never reach.
An extension buys its expression with shape, depth and motion.

The rule those three share: **the axes own disjoint token groups**, so an extension, a density and
a palette can compose in any combination and no ordering question arises.

## Ordering, and the one thing that would break it

A role is declared on `:root` and an extension on `.arena-<name>`, which are equal specificity.
Source order is therefore what decides, and the extension block is emitted after the `:root`
blocks in `FILES` in `scripts/generate/arena/generate-tokens.ts` for exactly that reason.
`check:extensions` joins the file to the block and fails either half alone, because a file the
generator does not emit paints nothing, and a block naming no file emits nothing, and each looks
complete on its own.

## A role that aliases a step, in a voice that also moves that step

A role's own value is resolved at build time unless its group is one another SCOPE redeclares,
which `REDECLARED_GROUPS` names and which is the palette and the density scale. An extension is
not one of those scopes, and it cannot be: any voice may move any `fs` or rhythm step, including
one a consumer derives, so there is no fixed list of selectors to restate a reference under.

The consequence is worth stating once rather than rediscovering. A role authored as `{fs.hero}`
resolves to the base scale's answer, so a voice that raises `fs-hero` AND leaves that role alone
gets the base value, not its own. Writing the role as `{fs.hero}` inside that same voice changes
nothing at all, because the alias resolves the same way there.

So a voice that has moved a step and wants a role to follow it writes the value outright. The
duplication is real and it is the cheaper of the two costs: the alternative is emitting every
`fs`-aliasing role as a reference, which would make a voice that moves a step move every role
pointing at it whether or not it meant to, and the roles exist precisely so that those two
questions can be answered apart.

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

Two answers to dark look right and are refused, and the reasoning each is refused by is the
reasoning a future extension author needs.

**Leaning on the surface scale in dark.** Measured, the scale cannot carry it.
The widest step Dravensoft's base ramp offers in dark is `base-300` on `base-100` at 1.13:1, and
`color-neutral` on `base-100` at 1.22:1, against 1.07:1 for the `base-200` a card sits on today.
None of those is an edge anybody sees. Reassigning which step a surface uses is a real mechanism
and it is worth having, but it is not the answer to dark: the ramp is deliberately a narrow
progression of warm blacks, it belongs to the SKIN, and an extension cannot widen what the
consumer owns.

**Reading "an extension is a scope class beside the palette rather than inside it" as a rule that
it cannot vary with the theme.** That is a statement about an emission rather than a principle,
and the emission answers to this document: an extension partial carries a group named after a
theme, and the generator emits its tokens under that theme's scope as well as the base block. `showcase` pays
for depth differently in each polarity because the polarities are not symmetrical: in light a
darkening is a boundary, so it uses the drop shadow; in dark it uses a rim light, an inset lit
edge, which reads about 1.5:1 against the page because it is light on dark rather than dark on
dark.

The rim is inset and along one edge on purpose. A ring of light all the way round would be a
hairline drawn around a region, which is the mechanism this extension traded away, and
`check:extensions` would be right to be unable to tell the two apart. An edge lit from above is a
statement about an object standing in light, so it is still figure and ground.

An extension author checking their work in one theme only has not checked it, and
`check:extensions` does not take their word for it: the grouping invariant is measured once per
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
at four or above. The other two voices can afford a gentler ladder because a hairline or a depth is
carrying the grouping beside it; this one has nothing else.

Its floating surfaces are deliberately untouched. A menu, a dialog and a toast are separated from
what they cover rather than grouped against it, so they keep `fill-surface-floating` and the
padding a fit constraint gives them. A voice that flattened them too would have made every overlay
unreadable to win an argument about cards, and that is the reason both families are split in two.

The half of a reading voice that lives in type is reachable, because two of the three things it
wants are roles rather than scales: `editorial` spends both, `fw-heading` to 900 and `lh-prose`
to 1.8, which is the same claim as its ladder made at the scale of the sentence.

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
