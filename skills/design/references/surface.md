# What Arena hands over

Arena is larger than the component list it is known for, and the parts that are not components
are the ones a project discovers late or never. This page is the whole offer in one place, the
line where it stops, and the one document that owns each part.

Read this first, before the three project questions the router asks next, because those three ask
how much of a thing you have not been shown yet. Nothing here teaches a part: every row names
where the part is written down, and that document is where you go once you know you want it.

## Everything Arena ships

| what it is | what you get | where it is written down |
|---|---|---|
| **The palette and the polarity** | The colours a build carries, declared by you: the base surface scale, the two accents, the four status colours, each of those with the colour that goes legibly on top of it, and the eight ramp slots. One palette reaches `:root` and every other becomes a class you put on `<html>`, so a build carries as many skins as it declares. Each one states whether it is dark or light, and that answer is what a first visit is matched against. | your layer's `PACKAGE.md`, the section about declaring a skin |
| **The token layer** | Every value the components read, as custom properties you may read too: the spacing scale `--sp-*` in thirteen steps, the type ladder `--fs-*` with `--fw-*`, `--lh-*` and `--ls-*` beside it, the corners `--r-*`, the borders `--bw-*`, the shadows, the scrims, the durations `--dur-*` and curves `--ease-*`, the stacking order `--z-*`, the three breakpoints `--bp-*`, the control and row sizes `--dz-*` that the density classes
re-answer, and the avatar and logo sizes. | the DTCG JSON per group in `contracts/design/`, with [`contracts/design/Scales.md`](../../../contracts/design/Scales.md) for what each step is for |
| **The colour aliases and the ink levels** | Short names over the palette for markup of your own: `--crimson`, `--gold`, `--danger`, `--success`, `--warning`, `--info`, `--bone`, `--mute`, `--bg`, and the soft washes beside each accent. The percentages the held-back text registers stand at are tokens rather than literals, so a palette moves them. | [`contracts/design/colors.css`](../../../contracts/design/colors.css) |
| **The style kernel** | Seventy-two questions about shape, space, weight, depth and which colour a surface takes, answered by a style plugin your project writes. This is the part that decides whether the product looks like yours, and it is not the palette. | [`style-kernel.md`](./style-kernel.md), over [`contracts/design/roles.json`](../../../contracts/design/roles.json) |
| **Two themes and two densities** | Dark and light without a component being rewritten, because a component reads roles. `.arena-compact` re-densifies the controls and the rows for a screen that has to hold more; `.arena-comfortable` grows them to a 48px touch target for a screen a thumb drives. The two are exclusive, and either is a class on an ancestor rather than a prop on anything. Density is an axis of its own rather than part of the style plugin, because how large a control is answers who is pointing at it and not what register the product speaks in: a shop on a phone and a console on a desk can want the same style plugin and opposite densities. Each re-answers the control and row sizes and nothing else, so the rhythm between two components stays where you spent it, and a screen that wants one on the desk and the other in the hand swaps the class from the breakpoint helper its layer exports, since a media query can add no class. | the rules section of [`../SKILL.md`](../SKILL.md) |
| **The components** | The furniture of an application somebody works in, filed under seven categories: `brand`, `charts`, `display`, `feedback`, `forms`, `layout` and `navigation`. Every one ships under both frameworks from one API declared once, and every one names the accessibility pattern it binds. | [`frameworks/INDEX.md`](../../../frameworks/INDEX.md) for whether one exists and which layers ship it, then your own layer's index |
| **Stylesheets for markup that is not a component** | The air between two of your elements, the column a page sits in, the measure of a reading column, a figure that does not jitter as it counts, and a label only a screen reader gets. These are what you build a page out of, and none of them is a component. | [`page.md`](./page.md) |
| **Exports that carry a promise** | The focus trap Arena's own dialogs run on, the two activation predicates, the notice queue and its dismissal rule, the chart ramp helpers, the tone-to-colour map, the two measurements, the visually-hidden style and the id the main landmark writes. Reach for these instead of writing a second copy: what your layer's page names is what carries a compatibility promise, and a symbol found by autocomplete is not. | the export table on your layer's `PACKAGE.md` |
| **The head, in one layer only** | A title that composes with the router's own, a description, a canonical and the `og:*` pair beside it, and a default that keeps a route out of an index until it says otherwise. Angular alone, behind a second entry point. | [`seo.md`](./seo.md) |
| **The command** | `arena-to-prod`, which turns your config into the stylesheet no package can carry, subsets the icon font to the glyphs your screens actually draw, reports where your own sources break a rule of the language, and names the components you have not used yet. | the build section of your layer's `PACKAGE.md` |
| **The behaviour contracts** | Each accessibility pattern stated once, normatively, in a form markup of your own can be held to: the roles it carries, the keys it answers, where focus goes and what dismisses it. Plus one that is not an accessibility pattern, for a structure worth handing to a reader rather than only to a person. | `contracts/behaviour/<pattern>.json`, and [`media-register.md`](./media-register.md) for when yours is the markup |

## How much of it you take

**Three steps, and each one is a place to stop.** A project on the first step is using Arena
correctly and is not waiting to finish; what the later steps buy is stated so you can decide
against them on purpose rather than by not knowing.

**The first step, take the language as it comes.** Install the package, write
`arena.config.json` with one palette and the three font slots, leave `stylePlugins` out or set
it to `default`, import the whole stylesheet, and compose with components. Put the air between
them on containers of your own with the classes [`page.md`](./page.md) names, and paint the page
through its role rather than a palette colour. This is the shortest honest route and the right
one for a first screen, a prototype or a tool nobody outside the team will look at. **What it
leaves unresolved is the appearance**: the product wears the answers Arena installs with, which
are Dravensoft's, and every project on this step looks like every other one.

**The second step, make it look like yours.** Write a style plugin, which is a directory holding
one entry per role, and name it first in `stylePlugins`. Your palettes and your fonts go in the
same config. From here the corners, the weights, the borders, the depth, the internal air and
which colour each surface takes are the product's own, and no component is rewritten to get
there. [`style-kernel.md`](./style-kernel.md) is where that decision is made and which answers
carry the visible difference.

**The third step, hold it.** Run the command's audit with `--strict` over the kinds you have not
already decided against, so a raw value or a class of your own on an Arena component stops being
something only a reader notices. Trim the stylesheet to what you render. Reach the metadata
entry point if [`seo.md`](./seo.md) answered yes. Bind the pattern from
`contracts/behaviour/` for any element you draw yourself, and take the export instead of the
reimplementation wherever one exists.

## Where Arena stops

Every line here is a decision rather than a gap waiting to close, so a project can plan around
it instead of waiting for it.

- **No page shape.** Arena ships the floor, the column, the air and the components, and no shape
  they must make. A console and a reading view are different pages before they are different
  components, so the composition is yours and the silence about it is deliberate.
- **No `<head>` in React.** That layer renders no title, description or canonical at all, and a
  React project carries its own through whatever its framework offers.
- **No server render, no prerender, no sitemap.** Arena writes into the head of whatever page
  your application renders; how that page reaches a reader stays yours.
- **No gate reads your application.** The audit reads source text, and only for what source text
  can show. One primary accent per view, a filled danger surface, and every rule about meaning
  are held because you hold them and by nothing else.
- **The component list ends at the register.** A photo wall, a feed of posts, a slideshow, a
  document editor and a game map are markup you write, and the skin still travels;
  [`media-register.md`](./media-register.md) is what Arena hands you instead of a component.
- **No route into a component's own box.** No component takes a class or a style of yours, and
  the class names one renders are compiler output that no contract names. Your layout goes on a
  container you own.
- **No icon font bundled.** Icons are Phosphor class-name strings a component renders, and the
  font arrives as a peer dependency rather than inside the package.
- **No runtime dependency and no CSS toolchain.** Every component's CSS ships compiled against
  Arena's own class names and tokens, so a project running its own utility framework cannot
  collide with it in either direction.
- **One pattern has no export.** The feed pattern is bound inside a component that is an event
  log with a fixed row, so it is not a feed of yours to reuse. Read how it binds the pattern and
  write the same thing around your own article.
