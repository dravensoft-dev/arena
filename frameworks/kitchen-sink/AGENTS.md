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

An item is a component name, and that is the whole of it: there is no override form, because a
sink that could reseed a component would be a second place a component is configured, and the
first divergence it produced would look exactly like the divergence this whole arrangement
exists to catch.

## Two arrangements, and they are two appearances

`default` is the appearance a consumer installs, drawn unscoped. `complete` is the witness plugin
`plugin-style-store/complete/` renders, which answers every role differently and paints through
every part hook, and the page wears `arena-complete` on `<html>` because the emitter turns any name
but the root one into the scope class. Nothing else is needed to draw it: `intro/styles.css`, which
every sink page links, already imports that plugin's token sheet and its `plugin.css`.

**The second one exists because the first cannot see a value a layer hardcodes.** Anything one
layer spells as a literal that happens to equal what `default` answers for a role reads as parity
under `default`, at every pixel, and diverges in the first project that answers the role otherwise.
That is the class `ArenaGrid.min` was in, and it reached a consumer. `complete` is the appearance
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
defect in a layer and not a page owed a relief.

The order and grouping are an arrangement's own, and one built for an appearance shows it doing
its work on a layout that argues for it: `default` groups by the category a component is registered
under, because that appearance draws the region and the box is the grouping, and `complete` groups
by what an appearance does to a thing, because a dialog beside a sheet beside a menu is where a role
answered inconsistently shows. What may **not** differ is the set: every fixture holds every
component, so no page is compared over a smaller surface than its siblings.

## A component that cannot stand alone

Nothing here says so. `ArenaTableCell` needs a table around it and `ArenaTab` needs its tab list,
and both of them already declare that as the `host` tree in their own demo fixture. The generator
reads it from there, so a component that gains or loses a host says so once.

## Adding one

A new component needs its name in every fixture in the same commit, or `check:kitchen-sink` fails
on the registry entry no fixture covers. Put the name where the arrangement argues it goes, run
`bun run build`, and open the pair with `bun run demos`.

A new **arrangement** is a file here and nothing else: the emitter walks `*.sink.json`, and
`check:pixel-parity` walks the directories it emitted, so neither carries a list to update.
