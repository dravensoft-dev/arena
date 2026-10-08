# Style plugins

**Arena keeps the questions and a repertoire of values. Every answer is a style plugin, and the
appearance Arena installs with is one of them.** This document states what the kernel exposes,
what a plugin may say, which floors a gate still holds and which became reports, and the rule the
role tier grows by.

## What the kernel exposes

Not one value of appearance.

| Surface | What it is |
|---|---|
| The floors | WCAG contrast, the 3:1 a control's boundary and the focus ring carry, target size, the reduced-motion policy, prose leading that never closes below 1.5, danger as an outline: the danger hue's strong fill is `transparent` |
| The role declaration | every role's name, `$type`, `$description` and, for a keyword, its closed set, in [`roles.json`](./roles.json), and a kernel `default` where one is declared, which is an alias to another role or to a token the package emits. No value |
| The value repertoire | the scales: the spacing grid, the radius, border, shadow, motion, weight, tracking, leading and type ladders, density, layering, chart and behaviour timing, all of them in this directory and catalogued in [`Scales.md`](./Scales.md) |
| The part hooks | `data-arena-part="<component>.<slot>"` on every element drawing a slot of every manifest |
| The cascade | `arena-plugin`, a layer declared after `utilities` |

**A part hook belongs to a manifest, so the plot of a chart has none.** A chart draws geometry
whose coordinates are the data, and a plot with no slot has no hook: a plugin reaches
`ArenaChartCard`, the `frame` slot every chart draws inside, and the legend and tooltip each
chart's own manifest carries, and nothing inside the plot. What carries the skin there instead is
the token tier, since every value a chart paints is one the palette moves, and `edge-axis` is the
role that draws the axis lines, the zero line and the crosshair, heavier than the grid rules
`edge-separator` draws behind the marks. The remaining chart paint reads roles and never a compat
alias, so a plugin that answers a role moves every chart.
[`frameworks/CHARTS.md`](../../frameworks/CHARTS.md)
records why the plot geometry cannot be a role at all.

[`roles.json`](./roles.json) is a declaration of interface rather than a token file. A DTCG token
with no `$value` is not a DTCG token, so it leaves `check:dtcg` by name and
`scripts/check/core/check-role-contract.ts` holds it instead: a type, a description, a closed set
for a keyword, and no value. That is the statement rather than a side effect. It holds the one
answer a role may carry as well: `$extensions["com.dravensoft.arena"].default` is a `{…}` alias to
a role or to a token the package emits, of the role's own `$type`, and
`scripts/check/core/check-role-contract.ts:defaultProblems(roles, emitted)` fails a literal, an
alias naming nothing, a type that disagrees, a keyword whose target can take a word outside its
set, and a chain that leads back to itself. **The question belongs to the kernel and the answer
never does.**

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

**Total means answered by the plugin or by a kernel default.** Which roles carry one is written
beside each role's type, in `roles.json` and in the `arena.tokens.json` each package ships, and a
role with none there is the plugin's to answer. A role carrying a default is
answered for a root plugin of the project's own that is silent on it:
`scripts/generate/core/arena-cli/style-plugin-rules.ts:withDefaults(plugin, roles)` completes the
plugin before anything reads it. A role alias takes the plugin's answer to that role, itself
completed the same way, and its light answer too unless the role has a light answer of its own; a
token alias passes through as written. The floors, the reports and the
`:root` block all read that one complete plugin, so a colour default is restated under every
palette like any `{color.*}` answer, and the command notes each role the default answered. A later
plugin takes a default only through a role it answers itself, since the root writes every other
default: where both it and the root plugin are silent on a role carrying a default, it takes its
own answer to the role the default names, which `withDefaults(plugin, roles, { root })` fills in. A
root plugin's own answer to that role stands in every later scope, and the `default` root counts
as silent, because its answer is the default. `default` and `complete` answer every role with the defaults ignored, a
catalogue entry answers every role that carries no default, and `check-style-plugin.ts` holds the default plugin's answer to a role carrying a default
to that default, so a project whose own copy is silent on the role renders it the way the default
does.

Every later entry emits under `.arena-<name>`, taken from the directory that holds it, and is a
difference. Those sit over the root plugin in the cascade, so totality would be a demand with
nothing behind it. A polarity group emits three compound selectors rather than one, because the
plugin class and the theme class sit in either order or on the same element.

The name is refused when the package already ships that class, and when
`scripts/generate/core/arena-cli/style-plugin-rules.ts:RESERVED` holds it for a class Arena is going
to ship. `reservedProblems(name, where)` words that refusal once, and a palette's name meets it too.
The suite beside the module fails an entry the tree ships, so the change that lands a component
deletes its entry, and a project meets the refusal on the day it picks the name, when renaming costs
nothing.

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

## The kinds a role answers

A slot declares what kind of thing it is, and the kind decides which padding, gap and radius
roles it may ask. A slot of another kind spending one of these roles fails `check:roles`, which
[`frameworks/tailwind/AGENTS.md`](../../frameworks/tailwind/AGENTS.md)
describes. A plugin answers each role once and every slot of the kind follows.

| Kind | Padding roles | Gap role | Radius role |
|---|---|---|---|
| `surface` | `pad-surface`, `pad-surface-head`, `pad-surface-head-top` | the kind-free rhythm | `rounded-surface` |
| `floating` | `pad-floating-x`, `pad-floating-y`, `pad-floating-edge-x` | the kind-free rhythm, `gap-actions` | `rounded-surface-floating` |
| `control` | `pad-control-x`, `pad-control-y`, `pad-control-text-y` | `gap-control` | `rounded-control`, `rounded-control-sm` |
| `field` | `pad-control-x`, `pad-control-y`, `pad-control-text-y` | `gap-control` | `rounded-field` |
| `marker` | `pad-marker-x`, `pad-marker-y` | `gap-marker` | `rounded-marker` |
| `status` | `pad-status-x`, `pad-status-y` | the kind-free rhythm | `rounded-surface-floating` |
| `row` | `pad-row-x`, `pad-row-y`, `pad-nav-row-x`, `pad-nav-row-y`, `pad-row-indent`, `pad-row-floating-x`, `pad-row-floating-y`, and the table's `--dz-row-px` and `--dz-row-py` | `gap-row`, `gap-row-floating` | `rounded-control` |
| `band` | `pad-band-y`, and `pad-band-x` inside the band's ceiling of 7% of its width | the kind-free rhythm | the kind-free shapes only |
| `none` | none | the kind-free rhythm only | the kind-free shapes only |

The table is `scripts/lib/tailwind/slot-kinds.ts:KIND_AIR`, and the rhythm and shapes any kind
may ask are `KIND_FREE` in the same file, which holds `gap-items` and `gap-inline`. The fill of a small readout raised over the content it
annotates, a chart's tooltip, is `fill-surface-raised`.

**A role answers a question the kind asks, and a numeric step on a kind with roles says what it
sizes.** A card head's top, a sheet pinned to an edge, a skip link's and a textarea's block padding,
a floating list's rows and the buttons of an action row at the foot of a floating surface each have
a role their kind answers, so a plugin moves them. A slot that still spends a numeric step on a
kind with roles is an entry of `SCALE_USES` in `scripts/check/tailwind/check-role-tokens.ts`, and
its reason says one of two things: the length sizes air this slot spends at its own size, which no
kind role asks, so a plugin cannot move it; or it sizes something other than air, such as a nesting
depth, a clearance from a rule or a hairline added up. An entry that says neither is a decision
nobody wrote down.

**The glyph a component chooses by tone is content and not a class of a slot**: the alert's icon,
an input's status icon, the stat card's arrow and a caret are chosen by the component from a
member's value, so they read no hue channel. A constant a component writes inline, such as the
scatter size legend's ink, is a constant and not a member's value, so it reads none either.

**A row's padding is the role times the density row factor.** `pad-row-x` and `pad-row-y`, and the pair `pad-nav-row-x` and `pad-nav-row-y` that a side nav row reads in their place, are
multiplied by `--dz-row-scale-x` and `--dz-row-scale-y`, which density restates, so a plugin
answers the register of a row, how much air an item of that kind takes, and density answers how
tight the row is. A plugin never writes a density factor into a row role. `--dz-row-min`, reached
through `min-h-row-min`, is the floor a row takes to reach the pointer target in comfortable
density. The interactive day head of `ArenaCalendar` takes it too, and `check:proximity` measures that the head clears the comfortable row. `pad-row-indent` is the side nav's inset per level of depth, read times the
`--arena-side-nav-depth` channel the component writes, and the indent of a side nav item, trigger and section label starts from `pad-nav-row-x`.

## The option roles

**An option of a family is a question by construction.** `arena-size-sm` asks how tall a button is
at that size, `arena-emphasis-ghost` asks what ink an action takes with no fill, and the answer to
each is a plugin's. The family file in
[`frameworks/tailwind/vocabulary/`](../../frameworks/tailwind/vocabulary/arena-size/Size.family.json)
writes each channel from a role, so the option is the question and the role is where it is
answered. An option no component draws differently asks nothing, and declares no role.

**A role is named `<family>-<option>-<question>`**, with the option as the family names it after
`arena-<family>-`: `size-sm-control-h`, `emphasis-ghost-fill-hover`, `elevation-floating-shadow`. Its
`$description` says what the option asks and which components read it, and
[`roles.json`](./roles.json) carries it beside the kind roles with no value, like every other
role. The name is the whole of the contract: a plugin reads it, an option nobody answers is a
question nobody asked, and `check:families` holds each channel to a component that reads it.

**Every plugin answers every option role.** The root plugin is total, so `check:style-plugin` fails
one that leaves an option unanswered; `check:catalogue` holds every entry under
`plugin-style-store/catalogue/` to the same totality; and `check:style-plugin-coverage` holds
`complete`, the witness, to an answer of its own for each. A plugin answers every option of a family, whatever subset of them
a component takes.

**A dimension role a density moves is answered with the density alias, and that is what keeps it
re-densifying.** `size-sm-control-h` answered `{dz.ctl-h-sm}` follows `.arena-compact` the way the
control always did, while the same role answered with a length fixes the height at every density.
A row padding role named as taken before the density factor is multiplied by the row factor the
way `pad-row-x` is, so a plugin answers the register and density answers how tight.

## The hue matrix

**A hue is a meaning a component wears, and the plugin answers what each hue is made of.** A
manifest maps a member's value to a hue (`danger`, `success`, `warning`, `info`, or an identity),
renders the group as `data-arena-<group>`, and the hue sheet writes its channels on the slots that
carry it: `--arena-hue-ink`, `--arena-hue-edge`, `--arena-hue-fill-strong`, `--arena-hue-fill-soft`
and `--arena-hue-on-ink`. A slot reads the channel it needs and never a status colour by name, so a
plugin that moves one role moves every surface wearing that hue. A slot whose hue no value varies,
a field's error message, names it under `hues.always`. A solid status mark (a presence or feed dot,
a progress fill) reads the strong fill, and danger's marks the ink, its strong fill being closed;
a chart legend swatch and the tag's dot read the ink, following series painted from the palette.
A badge written with `arena-mark-solid` fills with the ink and sets its label in the on-ink, which
defaults to the hue's `{color.<hue>-content}` and, for danger, to the page colour
`{color.base-100}`, because the danger ink is tuned as text and too light to carry white. The roles are in
[`roles.json`](./roles.json), one per hue and channel, each answered with a `{color.*}` alias:

| Hue | Ink | Edge | Fill, strong | Fill, soft | On ink |
|---|---|---|---|---|---|
| danger | `hue-danger-ink` | `hue-danger-edge` | `hue-danger-fill-strong`, closed to `transparent` | `hue-danger-fill-soft` | `hue-danger-on-ink` |
| success | `hue-success-ink` | `hue-success-edge` | `hue-success-fill-strong` | `hue-success-fill-soft` | `hue-success-on-ink` |
| warning | `hue-warning-ink` | `hue-warning-edge` | `hue-warning-fill-strong` | `hue-warning-fill-soft` | `hue-warning-on-ink` |
| info | `hue-info-ink` | `hue-info-edge` | `hue-info-fill-strong` | `hue-info-fill-soft` | `hue-info-on-ink` |

**The soft fill is held back to a level, which is not a role.** The hue sheet composes
`color-mix(in oklab, var(--hue-<hue>-fill-soft) var(--level-hue-soft-<hue>), transparent)`, with
the percentage in [`colors.css`](./colors.css), so the role says which colour and the level says
how far it is held back. The table of channels is authored once, in
[`frameworks/tailwind/Hues.json`](../../frameworks/tailwind/Hues.json).

**Identity has no roles.** The eight categorical colours derive their channels from the ramp: ink,
edge and strong fill are `--color-cat-N`, and the soft fill is that colour at `--tint-soft` over
`--fill-surface`. Its on-ink is `initial`, so a solid mark on it falls back to the neutral content. A
plugin moves identity by moving the ramp in the palette. **Neutral is the
absence of a hue**: its value writes every channel to `initial` and the slot keeps its own
classes, so the matrix has no neutral row.

**The final confirmation of `ArenaConfirmDialog` reads two roles of its own**, `fill-confirm-final`
and `ink-confirm-final`, which a plugin answers as a pair. It is the one filled danger surface, which
is why it is not `hue-danger-fill-strong`.

## Which floors a gate still holds, and which became reports

This is the half that has to be written down rather than discovered.

**A floor expressed as a token value is a floor over the token half only.** With plugin CSS open,
the prohibition on gradients is the clear case: it is a floor because a fill whose colour is a
range turns contrast into a range, and **a plugin paints the gradient from its own stylesheet
whatever the token tier says**. It stops being a floor and becomes a report. `arena audit` names it in
an application source and says nothing about it inside a declared plugin directory, because
`--strict` may not refuse what this document permits.

| Claim | Held by | Over |
|---|---|---|
| prose leading, heading leading, prose measure | `check:style-plugin` | the root plugin, in the base scope and in every theme scope |
| the same three floors | `check:catalogue` | every entry under `plugin-style-store/catalogue/`, in both polarities, resolved in memory because no entry is compiled |
| the danger hue's strong fill, `hue-danger-fill-strong`, answered `transparent` | `check:style-plugin` | the root plugin and every scoped plugin, in both polarities |
| the same floor | `check:catalogue` | every entry under `plugin-style-store/catalogue/`, in both polarities |
| no `plugin.css` writes a `--arena-hue-*` channel or `--hue-danger-fill-strong` (reading a channel is allowed); a direct declaration on a part is not gated | `check:channels` | every `plugin.css` under `plugin-style-store/` and `plugin-style-store/catalogue/` |
| a control's boundary at 3:1 where its border goes to zero | `check:boundary-contrast` | the root plugin, in both themes |
| text contrast against the surfaces a plugin names | `check:text-contrast` | the root plugin and every scoped plugin this build emits |
| the two layers draw one appearance identically | `check:pixel-parity` | every sink, exactly, with no allowance declared for any of them |
| the compiled `arena-` class name is output rather than contract | `arena audit`, in both scopes | a consumer's sources |
| a raw colour or a bare pixel length where a token belongs | `arena audit`, in both scopes | a consumer's sources |
| no gradient | `arena audit`, in the application scope, unless the project declares its mark is one | a consumer's sources |
| a colour assigned through one of Arena's own aliases rather than a role | `arena audit`, in the plugin scope only | a consumer's style plugins |
| a declaration restating what the part's slot already paints | `arena audit`, in the plugin scope only | a consumer's style plugins, and `complete` through `check:style-plugin-coverage` |

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
[`frameworks/tailwind/AGENTS.md`](../../frameworks/tailwind/AGENTS.md), where slots are defined,
rather than left to be discovered at a consumer's build.
`scripts/check/arena/check-parts.ts` fails an element that carries a slot class and no hook.

## The rule the role tier grows by

> The escape hatch is the instrument that measures the role tier. A role is added when several
> style plugins are measured painting the same decision by hand through the same part. What one
> plugin paints is its own.

**The rule has a second source, and it asks for no measurement.** An option of a family is a
question by construction: a family is the declaration of a question with named answers, so each
option's roles are added in the change that adds the option, and every plugin answers them in the
same major. What a plugin paints by hand through a part is evidence for a role the kernel does not
have yet. What an option declares is a role the kernel has already.

**A role born after the roster carries a kernel default.**
`scripts/check/core/roles-without-default.json` names the roles every adopter's root plugin
already answers, written once from `roles.json` and never grown, and `check:role-contract` fails a
role outside it that declares no default, so a minor adding a role stops no build whose root
plugin is its own. A role on the list takes no default, because a default there would only loosen
totality for plugins that already answer it.

**A plugin selects by part and never by the value of a variant, and that decides which asks can
become members at all.** A product whose avatar ring is a gradient in one state and a grey in the
other cannot be served by a `ring` member taking a tone: the component would render one part in
both states, the plugin would paint it once, and the mark that product is recognised by is the
difference between the two. An ask whose whole content is a difference the cascade cannot see is
markup its own product writes, and no member Arena could add would carry it.

**A role that does two jobs is a split waiting for its second product, not a name to be argued
with.** `edge-marker` is the current case: two products moved it, for two different
reasons. It draws the edge of a chip, the edge of a photograph and the edge of a keyboard
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
