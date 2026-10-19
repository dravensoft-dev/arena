# frameworks/kitchen-sink/

**One fixture per arrangement, layer-neutral, carrying an arrangement and nothing else.**
Each names the sections a page is divided into and which components land in each, in order. What
a component is seeded with, what fills its slots and what it has to be nested inside are not
here: those come from that component's fixture in [`../demos/`](../demos/AGENTS.md), which is
already held to the component's API contract by `check:playgrounds`. An instance authored twice
is an instance that can disagree with itself, and a page seeded differently from the playground
that shows the same component is a page that reports a difference nobody made.

It sits at the `frameworks/` root for the reason `Components.json` and `demos/` do: it is a fact
about the layers that belongs to none of them, and a copy per layer is a copy that can drift.

## What the pages are for

Every layer gets one page per fixture, at `frameworks/<layer>/kitchen-sink/<name>/`, emitted from
the fixture here by `bun run generate:kitchen-sink`. The pages a single fixture gets differ in what
mounts them and in nothing else, which is the whole point: `check:pixel-parity` opens each pair in
a real browser, in both themes, captures them and fails on one differing pixel. Without that, a
divergence in geometry, in inherited typography or in a computed colour reaches an adopter with
every gate green, because the render suites run under happy-dom, which has no layout and so cannot
see one.

`check:kitchen-sink` holds the fixtures: every component the registry names appears in every
fixture, no fixture names a component that does not exist, no fixture places one twice, and every
emitted file matches a fresh run of the generator.

## The schema

```jsonc
{
  // The name of the arrangement, which is also the directory each layer emits into.
  // `default` is the root one and takes no class; every other name becomes the scope
  // class on <html>, so the page IS one appearance rather than offering a control
  // that switches between them.
  "sink": "default",

  // One line saying why this arrangement is the arrangement. Optional, and read by
  // nobody but the next person to open the file.
  "note": "Ordered as a page reads rather than as the registry lists.",

  // In order. A section becomes a heading and a row of tiles.
  "sections": [
    { "title": "Masthead", "items": ["ArenaAppLogo", "ArenaPageHead"] }
  ]
}
```

An item is a component name, or a component name and one of its variants after a colon, as in
`ArenaGaugeChart:at-min`. There is no override form: a sink that could reseed a component would be a
second place a component is configured, and the first divergence it produced would look exactly
like the divergence this whole arrangement exists to catch. A variant is declared in the
component's own demo fixture, so the sink names a seed and never writes one.

## Two arrangements, and they are two appearances

`default` is the appearance a consumer installs, drawn unscoped. `complete` is the witness plugin
`plugin-style-store/complete/` renders, which answers every role differently and paints through
every part hook, and the page wears `arena-complete` on `<html>` because the emitter turns any name
but the root one into the scope class. Nothing else is needed to draw it: `intro/styles.css`, which
every sink page links, already imports that plugin's token sheet and its `plugin.css`.

**The second one exists because the first cannot see a value a layer hardcodes.** Anything one
layer spells as a literal that happens to equal what `default` answers for a role reads as parity
under `default`, at every pixel, and diverges in the first project that answers the role otherwise.
A grid's narrowest cell is in that class: a layer that hardcodes it reaches a consumer. `complete` is the appearance
that moves the most roles at once, so it is the cheapest second opinion available; a catalogue
entry would move more of them still, and none of those is compiled, so no class exists and nothing
here could render one.

**It found something the day it was added**, which is the argument for the two more captures per
theme per layer it costs: `ArenaConfirmDialog` and `ArenaTextarea` composed a run of text out of
several children in one layer and one in the other, and the browser shaped the two differently at
the type `complete` chooses and identically at the type `default` chooses.
[`../react/AGENTS.md`](../react/AGENTS.md) carries that rule and `check:text-runs` holds it.

**`ALLOWED` in the gate is still empty, and the emptiness is still the claim.** A second appearance
is more to look at rather than a reason to look less closely, so a scoped page that differs is a
defect in a layer and not a page owed a relief. An entry would be declared per sink, bounded on the
pixel count and on the channel delta, and carrying the measurement behind it, so a wider move is
never absorbed by a narrow allowance; one the run does not spend is stale and reported, the shape
`SIZE_ALLOWANCE` has in `scripts/check/arena/check-docs.ts`. The gate removes motion and drops focus
before the shutter, because what moves and what holds focus are asked with better instruments than a
photograph: `check:focus-trap` and the motion roles.

**A phase's acceptance run is a flag of the gate and not a member of `GATES`.** `--baseline <ref>`
builds the ref in a cached worktree and compares each layer with the same page there, and against
`HEAD` on a clean tree it reports nothing. `--allow <sink>=<selector>` (repeatable, `*` for every
sink) names the parts the phase expects to differ, each element measured with its descendants. A
difference outside them or a size change fails, and each is reported with its spent pixels or
`unspent`.

The order and grouping are an arrangement's own, and one built for an appearance shows it doing
its work on a layout that argues for it: `default` groups by the category a component is registered
under, because that appearance draws the region and the box is the grouping, and `complete` groups
by what an appearance does to a thing, because a dialog beside a sheet beside a menu is where a role
answered inconsistently shows. What may **not** differ is the set: every appearance holds every
component, so no page is compared over a smaller surface than its siblings.

## A third arrangement, and it is a set of seeds

`charts` is not an appearance. It draws the variants of the chart demos under the appearance a
consumer installs, because a demo seed shows one state of a chart and a divergence in a state no seed
reaches is seen only when both suites happen to carry a twin. Each chart's
[`demo`](../demos/AGENTS.md) declares a few named variants: the optional data taken out, a value at
the scale's lower end and past it, a value past the upper end, and a configuration the chart warns
about. The arrangement places each of them once, and an arrangement whose items all carry a variant is
held to that rule instead of the registry rule, so no list says which arrangement is which.

Two things are compared on these pages. The pixels, as on every page. And the console warnings: the
gate collects what each layer's page warns about and fails when the two lists differ, which a page
holding a configuration only one layer warns about passes on pixels alone. A warning is deduplicated
by its text, so a message shared by several charts would be printed once per page and hide a second
chart that fails to print it; every chart's warning therefore names the chart, and a variant meant
to be heard carries a message of its own.

## A component that cannot stand alone

Nothing here says so. `ArenaTableCell` needs a table around it and `ArenaTab` needs its tab list,
and both of them already declare that as the `host` tree in their own demo fixture. The generator
reads it from there, so a component that gains or loses a host says so once.

## Adding one

A new component needs its name in every appearance in the same commit, or `check:kitchen-sink` fails
on the registry entry no fixture covers. A new variant in a demo needs its item in `charts.sink.json`
in the same commit, or it fails on the variant no arrangement places. Put the name where the arrangement argues it goes, run
`bun run build`, and open the pair with `bun run demos`.

A new **arrangement** is a file here and nothing else: the emitter walks `*.sink.json`, and
`check:pixel-parity` walks the directories it emitted, so neither carries a list to update.
