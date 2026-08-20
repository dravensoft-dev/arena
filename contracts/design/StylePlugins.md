# Style plugins

**Arena keeps the questions and a repertoire of values. Every answer is a style plugin, and the
appearance Arena installs with is one of them.** This document states what the kernel exposes,
what a plugin may say, which floors a gate still holds and which became reports, and the rule the
role tier grows by.

## What the kernel exposes

Not one value of appearance.

| Surface | What it is |
|---|---|
| The floors | WCAG contrast, the 3:1 a control's boundary and the focus ring carry, target size, the reduced-motion policy, prose leading that never closes below 1.5, danger as an outline |
| The role declaration | every role's name, `$type`, `$description` and, for a keyword, its closed set, in [`roles.json`](./roles.json). No value |
| The value repertoire | the scales: the spacing grid, the radius, border, shadow, motion, weight, tracking, leading and type ladders, density, layering, chart and behaviour timing, all of them in this directory and catalogued in [`Scales.md`](./Scales.md) |
| The part hooks | `data-arena-part="<component>.<slot>"` on every element drawing a slot of every manifest |
| The cascade | `arena-plugin`, a layer declared after `utilities` |

**A part hook belongs to a manifest, so the chart family has none.** Seven of the eight charts
draw geometry whose coordinates are the data, which is why they carry no manifest, and a
component with no slot has no hook: a plugin reaches `ArenaChartCard`, the frame, and nothing
inside the plot. What carries the skin there instead is the token tier, since every value a
chart paints is one the palette moves, and [`frameworks/CHARTS.md`](https://github.com/dravensoft-dev/arena/blob/main/frameworks/CHARTS.md)
records why the plot geometry cannot be a role at all.

[`roles.json`](./roles.json) is a declaration of interface rather than a token file. A DTCG token
with no `$value` is not a DTCG token, so it leaves `check:dtcg` by name and
`scripts/check/core/check-role-contract.ts` holds it instead: a type, a description, a closed set
for a keyword, and no value. That is the statement rather than a side effect. **The question
belongs to the kernel and the answer never does.**

The scales stay, and they stay with values, because a manifest never names one. They reach a page
only through a role, so what they are is a shared repertoire a plugin picks from. A plugin answers
a role with a scale alias or with a literal where the scale has nothing it wants.

## What a style plugin is

A directory holding two files, described in
[`plugin-style-store/AGENTS.md`](../../plugin-style-store/AGENTS.md).

`plugin.tokens.json` answers roles, and may re-value the type and rhythm ladders, whose steps
reach a page through classes a consumer applies rather than through any role. `plugin.css` is CSS
of the plugin's own, written against the part hooks; the build wraps it in the reserved layer, so
its author never spells `@layer arena-plugin`.

**Colour stays an assignment and never an authorship.** A colour role takes one of the consumer's
palette colours as a `{color.*}` alias, and a plugin writing a hex would be authoring a skin it
does not own. It is mechanical as well as doctrinal: the emitter turns a bare colour alias into a
`var()` it restates under every palette, and anything else resolves to one theme's hex and
inherits it into the other.

**The alias layer is the route around that, and it had nothing watching it.**
[`colors.css`](./colors.css) maps Arena's own names onto the palette and ships with the packages,
so a rule reading `var(--mute)` assigns a step of the ramp under another name while the raw-colour
rule stays silent, because an alias is a token. The audit reports one inside a declared plugin
directory, where the assignment is the plugin's own to make properly, and says nothing about one in
an application, which is the last word and is already reported for reaching in.
`check:compat-aliases` holds the rule's list against the stylesheet that defines the names, since
the rule ships beside the CLI and cannot read that file.

**Where no palette entry holds the shade a plugin wants, it composes one.**
`color-mix(in oklab, var(--color-base-content) 62%, transparent)` is a colour built out of the
consumer's own palette rather than a name borrowed from Arena's internals, and it is the same
instruction the audit gives a consumer who writes a raw colour. That is the route for a decision no
role carries, and holding a level is the clearest case: a role names which colour and the opacity
modifier is a second decision the manifest composes on top, so a slot declaring no modifier cannot
be held back by any answer to any role.

## The first plugin in the list is total

`stylePlugins` takes a list, because a build can carry more than one register. The first entry is
the root plugin: it is what a page with no class on it looks like, it emits on `:root`, and **it
answers every declared role**. `scripts/check/core/check-style-plugin.ts` fails one that leaves a
question unanswered, and the reason is sharper than tidiness: a custom property with no value is
invalid at computed-value time, so the declaration reading it is dropped and the whole property
disappears. A partial root plugin is not a poorer appearance. It is a page with no borders.

Every later entry emits under `.arena-<name>`, taken from the directory that holds it, and is a
difference. Those sit over the root plugin in the cascade, so totality would be a demand with
nothing behind it. A polarity group emits three compound selectors rather than one, because the
plugin class and the theme class sit in either order or on the same element.

An empty list is not a configuration. Removable means replaceable.

## Why the plugin layer sits after `utilities`

Every compiled component rule lands in `@layer utilities` at single-class specificity. A plugin
that had to out-specify that with `!important` or with selector chains is not an escape hatch.
Declared after, it wins at any specificity and its author writes ordinary CSS.

Unlayered application CSS still beats the plugin layer, and that is the right order: the
application is the last word. It is also why the audit keeps reporting application CSS that
reaches into Arena. Reaching in works, and working is exactly what makes it silent debt rather
than an error.

**A plugin's sheet declares the order itself and then opens the layer.** A `@layer arena-plugin`
block met before the order statement registers that name as the LOWEST layer of the document, so
every plugin rule contesting a component rule loses, and nothing reports it: the audit counts the
part as painted, because it reads the source text. That is not hypothetical. A bundler emitting
one stylesheet per import does not have to keep the order the entry module wrote them in, and a
plugin sheet parsed before the sheet carrying the prelude is exactly the case. Repeating the order
declaration is the same treatment a component sheet already gets when it imports its own prelude,
and for the same reason: the file carries what it depends on rather than documenting it.

## Which floors a gate still holds, and which became reports

This is the half that has to be written down rather than discovered.

**A floor expressed as a token value is a floor over the token half only.** With plugin CSS open,
the prohibition on gradients is the clear case: it is a floor because a fill whose colour is a
range turns contrast into a range, and **a plugin paints the gradient from its own stylesheet
whatever the token tier says**. It stops being a floor and becomes a report. `--audit` names it in
an application source and says nothing about it inside a declared plugin directory, because
`--strict` may not refuse what this document permits.

| Claim | Held by | Over |
|---|---|---|
| prose leading, heading leading, prose measure | `check:style-plugin` | the root plugin, in the base scope and in every theme scope |
| the same three floors | `check:catalogue` | every entry under `plugin-style-store/catalogue/`, in both polarities, resolved in memory because no entry is compiled |
| a control's boundary at 3:1 where its border goes to zero | `check:boundary-contrast` | the root plugin, in both themes |
| text contrast against the surfaces a plugin names | `check:text-contrast` | the root plugin and every scoped plugin this build emits |
| the two layers draw one appearance identically | `check:pixel-parity` | every sink, exactly, with no allowance declared for any of them |
| the compiled `arena-` class name is output rather than contract | `--audit`, in both scopes | a consumer's sources |
| a raw colour or a bare pixel length where a token belongs | `--audit`, in both scopes | a consumer's sources |
| no gradient | `--audit`, in the application scope, unless the project declares its mark is one | a consumer's sources |
| a colour assigned through one of Arena's own aliases rather than a role | `--audit`, in the plugin scope only | a consumer's style plugins |
| a declaration restating what the part's slot already paints | `--audit`, in the plugin scope only | a consumer's style plugins, and `complete` through `check:style-plugin-coverage` |

**A brand whose mark IS a gradient is the case that split does not cover.** The scope reads the
directory a line sits in, which is the right question for a part hook and the wrong one for a
brand: a product whose mark is a gradient draws that element itself, because Arena has none, so
the gradient lands in application CSS where the rule always reports it and `--strict=audit` would
fail the build over the most recognisable thing about the product. `gradientMark` in
`arena.config.json` is where a project says so, once, beside the rest of what it owns.

What that replaces is an allowance per line. A marker suppresses every rule on its line rather
than the gradient on it, so a line carrying a gradient and a bare pixel length would report
neither, and the marker has to be repeated wherever the mark is drawn. The declaration silences
the one rule it is about: the colours inside the gradient are still the skin, which a project
assigns rather than authors, and they are still reported.

A floor nothing measures is a sentence, and a sentence that reads like a guarantee is worse than
an admitted limit.

## A part is one contract across both layers

A part hook is what a style plugin selects, so a part one layer reaches and the other does not
would make two pages out of one manifest. `scripts/check/arena/check-parts.ts` holds both halves:
every element carrying a slot class carries its hook, and the two layers reach the same parts. That
is why a manifest carries no slot for an action a component composes rather than draws: an
`ArenaButton` inside a dialog is an `ArenaButton` in both layers, and a slot typed out beside it in
one of them would be a part only that layer could paint.

`check:pixel-parity` compares the appearance Arena installs with, and it carries no allowance at
all: a single differing pixel is a failure. What a scoped plugin paints is held as text instead,
by `check:parts`, which fails a slot reaching the DOM without its hook and fails two layers
reaching different parts from one manifest, and by `check:style-plugin-coverage`, which fails a
part no rule in the witness plugin paints.

## A slot name is contract

A manifest's slot names leave the repository as the part hook, so **renaming one is a break**.
That is the price of the escape hatch, and it is recorded in
[`frameworks/tailwind/AGENTS.md`](https://github.com/dravensoft-dev/arena/blob/main/frameworks/tailwind/AGENTS.md), where slots are defined,
rather than left to be discovered at a consumer's build.
`scripts/check/arena/check-parts.ts` fails an element that carries a slot class and no hook.

## The rule the role tier grows by

> The escape hatch is the instrument that measures the role tier. A role is added when several
> style plugins are measured painting the same decision by hand through the same part. What one
> plugin paints is its own.

**A plugin selects by part and never by the value of a variant, and that decides which asks can
become members at all.** A product whose avatar ring is a gradient in one state and a grey in the
other cannot be served by a `ring` member taking a tone: the component would render one part in
both states, the plugin would paint it once, and the mark that product is recognised by is the
difference between the two. An ask whose whole content is a difference the cascade cannot see is
markup its own product writes, and no member Arena could add would carry it.

**A role that does two jobs is a split waiting for its second product, not a name to be argued
with.** `edge-marker` is the current case, and the count is now two products that moved it for two
different reasons. It draws the edge of a chip, the edge of a photograph and the edge of a keyboard
cap: one product set it to nothing to take the border off its avatars, because no product wants a
portrait outlined the way it wants a tag outlined, and a second answered it with the muted text
colour so a cap can be found on a screen where every other edge is a hairline. **Two products
pulling one role in opposite directions is the shape a split has**, and the pair to separate is the
edge a marker draws around a word from the edge a frame draws around a picture. `bw-marker` and
`r-marker` carry the same load and are not yet measured moving with it.

**A level is not a colour, so an ask that is a level is no evidence for a colour role.** The
eyebrow of a card is the measured case. Two plugins paint it by hand, which reads as a count that
clears the bar, and what each rule changes is how far the line is held back rather than which
colour it takes: both already answer `ink-eyebrow` with the muted step their own palette declares.
A colour role names WHICH of the consumer's colours and never how held back it is, which
[`roles.json`](./roles.json) states at `ink-muted`, so no colour role could have carried that ask
and the count was two plugins reaching for one alias rather than two plugins asking one question.

**What a plugin does instead is compose the colour**, `color-mix(in oklab, var(--color-base-content)
62%, transparent)`, which is the instruction the audit already gives a consumer who writes a raw
one. The limit behind it is worth stating in the same breath: a slot carrying no opacity modifier
cannot be held back by any token, because the modifier lives in the manifest and a role cannot add
a declaration a slot never makes. Most text carries none, since full strength is the ordinary case
and the held-back register is the one that spells its level. Moving a slot from one register to the
other is a decision about one product's appearance, so it belongs to a rule through the part, which
is what the escape hatch is and why the audit permits it inside a plugin directory.

This is how the current tier was derived, by counting the slots that named a palette step, a face
or a case directly. What changes is that the count now has a source that keeps producing: the
audit reports which parts a plugin paints, and that note is where the evidence for promoting one
comes from. **A count is evidence only once each part in it is remeasured against the sheet the
slot compiles to**, because a plugin declaration restating what the slot already paints raises the
count without changing a pixel, and one naming an alias raises it without asking a question the
kernel could answer. The audit reads that comparison for a consumer and
`check:style-plugin-coverage` reads it over `complete`, since a witness reaching a part by
restating the part's own answer demonstrates nothing about reach.

**The comparison resolves both sides against the plugin's own answers before it compares them**,
which is what makes it worth standing a promotion on: a rule spelled `var(--fw-control)` over a
slot painting `var(--fw-medium)` changes nothing in a plugin that answers the role with that step,
and the two are the same value under two names rather than a decision anybody made. A plugin
selects by part and answers by role, so almost every restatement it writes takes exactly that
shape.

**What the comparison still declines to say is bounded on the safe side**, and each case is a
silence rather than a false report, because a silent miss costs a reader nothing and a false
report costs them a search. A name no answer reaches stays as it is and the pair is skipped. A
`var()` carrying a fallback is left whole rather than half read. And a property the slot paints
twice, once plainly and once inside a support query, has no single answer for a flat declaration
to restate, so the rule replacing both is a change and is reported as nothing at all.
