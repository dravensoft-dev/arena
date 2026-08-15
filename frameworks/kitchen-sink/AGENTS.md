# frameworks/kitchen-sink/

**One fixture per style plugin, layer-neutral, carrying an arrangement and nothing else.**
Each names the sections a page is divided into and which components land in each, in order. What
a component is seeded with, what fills its slots and what it has to be nested inside are not
here: those come from that component's fixture in [`../demos/`](../demos/AGENTS.md), which is
already held to the component's API contract by `check:playgrounds`. An instance authored twice
is an instance that can disagree with itself, and a page seeded differently from the playground
that shows the same component is a page that reports a difference nobody made.

It sits at the `frameworks/` root for the reason `Components.json` and `demos/` do: it is a fact
about the layers that belongs to none of them, and a copy per layer is a copy that can drift.

## What the pages are for

Every layer gets one page per style plugin, at `frameworks/<layer>/kitchen-sink/<style plugin>/`,
emitted from the fixture here by `bun run generate:kitchen-sink`. The pages a single style plugin
gets differ in what mounts them and in nothing else, which is the whole point:
`check:pixel-parity` opens each pair in a real browser, in both themes, captures them and fails
on one differing pixel. Without that, a divergence in geometry, in inherited typography or in a
computed colour reaches an adopter with every gate green, because the render suites run under
happy-dom, which has no layout and so cannot see one.

`check:kitchen-sink` holds the fixtures: every component the registry names appears in every
fixture, every style plugin the build ships has a fixture, no fixture names a component or an
style plugin that does not exist, and every emitted file matches a fresh run of the generator.

## The schema

```jsonc
{
  // Which voice the page is painted in. It becomes the scope class on <html>, so the
  // page IS one style plugin rather than offering a control that switches between them.
  // A name the build does not ship fails the gate rather than painting nothing.
  "style plugin": "editorial",

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

## The arrangements differ on purpose

The order and grouping are free to differ between style plugins, and they do. Each style plugin
declares its own Gestalt mechanism in `contracts/design/style plugin.*.json`, and an arrangement
that ignores it shows the voice doing its work on a layout built for a different one. What may
**not** differ is the set: every fixture holds every component, so no style plugin is compared over
a smaller surface than its siblings.

## A component that cannot stand alone

Nothing here says so. `ArenaTableCell` needs a table around it and `ArenaTab` needs its tab list,
and both of them already declare that as the `host` tree in their own demo fixture. The generator
reads it from there, so a component that gains or loses a host says so once.

## Adding one

A new component needs its name in every fixture in the same commit, or `check:kitchen-sink` fails
on the registry entry no fixture covers. A new style plugin needs a fixture of its own for the same
reason, and it fails on the shipped voice no fixture paints. Put the name where the arrangement
argues it goes, run `bun run build`, and open the pair with `bun run demos`.
