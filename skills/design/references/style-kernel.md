# Making Arena look like your product

Arena keeps the questions and a repertoire of values. **Every answer is a style plugin**, and the
appearance Arena installs with is one of them, so replacing it is the ordinary case rather than an
escape hatch.

**Eight registers are already measured, and picking one is a way to answer this page rather than
a way around it.** `plugin-style-store/catalogue/` holds a directory each, and the fourth node
of [`cold-start.md`](./cold-start.md) is where a product is matched against them.

Read this once per project, before the first screen. The rules of the language are in
[`../SKILL.md`](../SKILL.md) and hold whatever your appearance is.

## The three files you write

Two routes decide what you write. Pick the row that fits.

| You want | The route |
| --- | --- |
| I change a few roles or slots | List a later plugin after `"default"`, as `["default", "./design/<name>"]`. The later plugin answers only what it changes. Put its `.arena-<name>` class on `<html>`, since nothing it answers reaches the page without the class. The rule is [below](#the-two-rules-that-decide-everything-else). |
| I want my product's own appearance | Write a root plugin that answers every role carrying no default. Start it from a copy of `plugin-style-store/default/` or of a catalogue entry. Both sit in the repository and on the site, not in the package. |

**`arena.config.json`, in your project root.** The palettes, the fonts and the plugins, and
nothing about components. **The shape below is abridged, and it is not a file to copy.** Every palette answers
the whole colour set rather than the three shown, and a config carrying three keys is refused
rather than defaulted.

```json
{
  "stylePlugins": ["./design/document-workspace"],
  "palettes": [
    { "name": "light", "default": true, "polarity": "light",
      "colors": { "base-100": "#ffffff", "base-content": "#37352f", "primary": "#0b6bcb" } }
  ],
  "fonts": { "display": { "family": "Inter", "src": "..." } }
}
```

**`"stylePlugins": ["default"]` is a legitimate answer**, and it is the right one for a first
screen or a tool nobody outside the team will look at. That answer keeps the appearance Arena
installs with. A project moves off it when the appearance starts mattering, rather than before. What
this page costs you is paid when you decide to look like yourself, not to start.

Arena ships two themes and is dark first, so a real config carries a dark palette as well as the
light one above. The full colour list, the font slots and the rest of the config are in
[`config.md`](./config.md).

**`design/<name>/plugin.tokens.json`.** One entry per role or [colour slot](./color-slots/index.md), and the
directory names the plugin:

```json
{
  "r-surface":   { "$type": "dimension",  "$value": "{r.xs}" },
  "fw-heading":  { "$type": "fontWeight", "$value": "{fw.bold}" },
  "fill-field":  { "$type": "color",      "$value": "{color.base-200}" },
  "press-scale": { "$type": "number",     "$value": 0.98 },
  "container-max": { "$type": "dimension", "$value": { "value": 920, "unit": "px" } }
}
```

The file may also hold one group named `light`. The group takes colour answers only, a `{color.*}` alias or another
colour role, never `transparent`, for a role or a [colour slot](./color-slots/index.md). The group lays them over the plain answers in every
palette whose `polarity` is `light`. A plain answer holds in every dark palette, and in a light one the group
is silent on. Anything else in the group is refused. A palette picked at runtime reads the group by its
polarity the same way.

```json
{
  "edge-focus":    { "$type": "color", "$value": "{color.secondary}" },
  "light": {
    "edge-focus":  { "$type": "color", "$value": "{color.base-content}" }
  }
}
```

**`design/<name>/plugin.css`, optional.** CSS of your own, selecting the part hooks:

```css
[data-arena-part="side-nav.item"] {
  color: color-mix(in oklab, var(--color-base-content) 82%, transparent);
  font-weight: var(--fw-control);
}
```

The eight products measured for this document write between two and sixteen such rules each. If
yours is running to hundreds, the answer is almost always a role you have not moved.

## The two rules that decide everything else

**The first entry in `stylePlugins` is the root plugin, and it answers every role that carries no default.**

[`config.md`](./config.md) lists the roles that carry a default, says what a root plugin silent on them takes and how the build notes it.

The root plugin emits on `:root`, and a custom property with no value is invalid at
computed-value time. The declaration reading it is dropped and the property disappears. A partial root plugin is not a plainer
appearance, it is a page with no borders. Every later entry emits under `.arena-<name>`, taken from
its directory, and you put that class on `<html>` or on any element, and the nearest one wins. A later entry is a difference sitting over the root plugin, so it answers only what it changes. A later entry takes a default only through a role it answers itself, since the root writes every
other default. Where it and your root plugin are both silent on a role carrying a default, it takes
its own answer to the role the default names. A plugin that moves `pad-row-x` then moves
`pad-nav-row-x` with it. A root that answers `pad-nav-row-x` itself keeps that answer under every
later entry, and a root of `default` counts as silent there, because its answer is the default.

**A colour role takes one of your palette colours as a `{color.*}` alias, or another colour role as `{ink-muted}`, and never a literal.**
A role that paints nothing takes `transparent`, a colour answer too, written without braces.
The palette is yours and what a role says is WHICH of your colours a surface takes. The reason is mechanical as well. A bare colour alias
is restated under every palette. Anything else resolves to one theme's value and inherits it into
the other, so a hex here is a light-mode colour showing through your dark theme.

## What an answer may be

- **A scale alias**, `{r.xs}`, `{sp.4}`, `{fw.bold}`, `{dur.fast}`, `{ease.out}`. A scale alias is the ordinary answer.
- **A `{color.*}` alias**, for every colour role, or another colour role such as `{ink-muted}`.
- **A word of the role's set**, or an alias that resolves to one such as `{case.none}`, for a keyword role.
- **A literal**, where the scale has nothing you want: `{ "value": 920, "unit": "px" }`, or a bare
  number for a ratio such as `press-scale`. **Two of the loudest decisions need one**, because the scale has no step for
  them. A square corner is `{ "value": 0, "unit": "px" }`. No shadow at all is a shadow object
  whose every length is zero and whose colour is `{ "colorSpace": "srgb", "components": [0, 0, 0],
  "alpha": 0 }`, beside `offsetX`, `offsetY`, `blur` and `spread`.
- **A unit the type does not carry**, through `$extensions`. [`tokens/plugin/type.md`](./tokens/plugin/type.md) names the five roles that need one.

**Each role draws from one scale, or from none.** [`tokens/plugin/index.md`](./tokens/plugin/index.md) lists the roles by task, with the type and the scale beside each. [`tokens/components/index.md`](./tokens/components/index.md) lists the roles a component reads, such as `--fill-control` and `--fill-knob`, and your root plugin answers those too.

**What an answer may never be is a scale itself.** A scale step is shared by every use that wants
that value, so moving one is not a style plugin but a different Arena. **The type and page-rhythm
ladders are the one exception**, because they reach a page through classes you apply rather than
through any role. Answer them in the plugin beside the roles. A key named `fs-<step>` or
`rhythm-<step>` is read as that step rather than as a role nothing ships. Both are dimensions. A `$description` beside a step is optional and records why the plugin moved it. Move one step or every one of them, as the product needs. Completeness binds a role, which
disappears unanswered. Completeness never binds a step, which keeps the value Arena ships. Every other scale key is refused
by name, so a different type scale is answered here or it is not answered.

The questions themselves are in
[`../../../contracts/design/roles.json`](../../../contracts/design/roles.json): a name, a type, a
description and, for a keyword role, its closed set. No values, because the values are yours.

## Where the appearance actually comes from

Eight unrelated products were built on this kernel. The eight are a project tracker, a language
course, a photo feed, a document workspace, a storefront, an inbox, an observability console and a
booking flow. **Every one of them answered these identically**, and a plugin that
spends its first day on them spends it on nothing:

| Answered the same way by all eight | What they said |
|---|---|
| `ink-heading`, `ink-body`, `ink-muted` | `{color.base-content}` |
| `ink-eyebrow` | `{color.neutral-content}` |
| `edge-surface`, `edge-surface-floating`, `edge-control-quiet`, `edge-separator` | `{color.base-300}` |
| `ff-heading` | the display face the config declares |
| `lh-heading`, `dur-hover`, `ease-hover` | one step each, the same one every time |

**Which colour the text takes is a constant, and which colour a surface takes is not.** The ink
roles and the four quiet edges are what eight brands converged on, and starting from them costs
nothing. The fills are the opposite, and the wider
catalogue is what showed it. A console puts its panels on the second surface step and its page on
the first. A booking page does the reverse, and the other six leave both at the page colour. **That answer follows from the page shape rather than
from the palette**, so settle what the screen is before assigning any of it.


The appearance Arena installs with does not give those answers. That appearance is a design of
its own and assigns several of these differently, so it is a plugin to read rather than a baseline
to inherit. A plugin you write answers every role that carries no default itself, and nothing is inherited from that one.
The default plugin is
[`plugin-style-store/default/plugin.tokens.json`](../../../plugin-style-store/default/plugin.tokens.json)
and
[`plugin-style-store/complete/`](../../../plugin-style-store/complete/plugin.tokens.json) beside
it is a second one answering the same roles differently. Read one before writing yours, because a worked answer is worth more than a list of role names. **Both are on the site at `https://arena.dravensoft.org/plugin-style-store/default/plugin.tokens.json` and `https://arena.dravensoft.org/plugin-style-store/complete/plugin.tokens.json`, and in the repository, not in the package. The MCP server serves both, under `arena://style/default/` and `arena://style/complete/`.** Start by
copying the default into `design/<name>/` and replacing one role at a time: `["default"]` is no
start, because your root plugin inherits nothing from it.

The selected edge of navigation is the role `edge-tab-selected`, and its default is `{color.primary}`. The role is drawn as the rule under the selected tab and around the current page of a pagination. A plugin that stays silent keeps the primary there, and one that answers it names a palette colour or another colour role.

**The roles below are where a product lives**, and the eight measured products disagree on every one of
them:

| Role | What moving it decides |
|---|---|
| `r-control`, `r-field`, `r-media` | how round the product is, which is the loudest single decision |
| `bw-surface`, `bw-control`, `bw-field`, `bw-separator`, `bw-marker` | whether an edge is a hairline, a drawn line, or absent |
| `fw-heading`, `fw-eyebrow`, `fw-control` | how loud type is before any size changes |
| `tt-label`, `tt-eyebrow`, `track-label`, `track-eyebrow` | whether small text shouts in capitals or reads as a word |
| `ff-key`, `tt-key`, `ink-key`, `pad-key-y` | whether a key reads as a keyboard's own cap or is dressed like the labels around it |
| `pad-control-x`, `pad-control-y`, `size-<option>-control-pad-x`, `gap-inline`, `gap-items`, `gap-control` | how tight the product is to the hand |
| `container-max`, `measure-prose`, `grid-min`, `gutter` | how wide it breathes, and it ranges from a dense console to a reading column |
| `shadow-surface-rest`, `shadow-surface-floating`, `shadow-surface-deep`, `shadow-control-raised`, `elevation-<option>-shadow`, `emphasis-primary-shadow-hover` | whether depth is a soft blur, a hard offset or nothing at all, and whether a surface has any at rest |
| `press-scale`, `lift-control`, `dur-state`, `ease-state` | how the product answers a hand |
| `aspect-media`, `fit-media` | what shape an image is, before any of it is cropped |
| `fill-page`, `fill-surface`, `fill-surface-sunken`, `fill-field` | which surface is the page and which is the thing standing on it |
| `edge-control`, `emphasis-secondary-edge`, `edge-field`, `edge-marker` | whether a control, a field and a marker are outlined at all, and in what |
| `ff-eyebrow`, `ff-label` | whether small text is the body face or the mono one, which is the difference between a shopfront and a console |

The `<option>` roles: `contracts/design/StylePlugins.md` "The option roles".

**So the order of work is: shapes, then space, then weight, then depth.** Leave the colour roles
where they are until those read as your product, because a plugin that starts by reassigning
colours changes the least and costs the most to undo.

## The part hooks

Every element drawing a part carries `data-arena-part="<component>.<part>"`, and that is what your
`plugin.css` selects. **The hook is an attribute on the element, so the page you are looking at is
the list.** Serve the application, inspect the element you want to paint, and take the value.
Nothing enumerates the hooks in prose, and a name guessed from a component's member list is a
selector that matches nothing and reports nothing.

**You never write `@layer`.** The build wraps your sheet in a reserved layer declared after the
compiled component rules, so an ordinary selector wins with no `!important` anywhere. The sheet
restates the layer order at its own head, so a bundler cannot reorder it into losing every contest
silently.

Your application's own unlayered CSS still beats the plugin layer, and that order is right: your
application is the last word. That order is also why reaching into an Arena part from application CSS is reported. Reaching in
works, and working is what makes it debt rather than an error.

## Gotchas

Each of these was measured on a product, not reasoned about.

- **A rule that restates what the part already paints changes no pixel.** A restatement also
  inflates the count of parts your plugins paint, which is the number a request for a new role is
  argued from. The report names a restatement.
- **Arena's own colour aliases are a step of Arena's ramp under another name.** A rule reading `var(--mute)` assigns a colour without answering any role. The raw-colour
  rule stays quiet, because an alias is a token. Answer the role instead, or compose the shade out of your own
  palette: `color-mix(in oklab, var(--color-base-content) 64%, transparent)`. That percentage is a literal of your own, so a palette whose level `arena build` raises leaves your shade where you wrote it.
- **A level is not a colour.** A colour role names which of your colours, never how far
  back it is held. A part that carries no opacity modifier cannot be held back by any answer to
  any role.
  Composing it in your own CSS is the route.
- **The charts that draw geometry from the data carry no part hook at all**, because their
  coordinates are the data and they have no parts to hook. A plugin reaches the frame around a
  chart and nothing inside the plot; the palette is what skins a plot.
- **Holding the report in CI takes kinds, not a switch.** A brand under 4.5:1 is a decision you
  already made and measured, and one switch over every kind would make that the price of holding
  the rest.
- **A part that exists in a manifest and never in the rendered page passes every check there is**,
  because every check over a part reads text. Open the page and look at it.
- **The screen-reader-only idiom ships as a class**, so a rule selecting a part cannot compose it.
  A part you want hidden visually and kept for a reader is hidden by hand.

## What the kernel does not reach

Stated so you can plan around it rather than discover it.

- **Press travel and a resting edge have no role.** A control that stands on a hard bottom edge
  and drops into it when pressed is one product's whole identity, and it paints that by hand.
  `lift-control` and `press-scale` are the near miss and do not cover it.
- **A size ramp is not yours to re-answer**, the type and page rhythm ladders aside. Where a component's own
  ramp runs out, the exit is your own CSS on your own element, not a step moved under the kernel.
- **A document block family is markup you write.** Paragraph, heading, quote, callout, toggle,
  code and figure are the register of a document editor, and Arena is a product-application
  library.

## The loop

**Some of this is refused rather than reported, and knowing which is which saves you an
afternoon.** The **hard failures of the plain command** are these. A role left unanswered by the root
plugin that carries no default. An answer whose `$type` is not its role's: a slot is a `color`, an
`fs-*` or `rhythm-*` step is a `dimension`, and an answer with no `$type` is a mismatch. A word
outside a keyword role's set. A `rem` or `em` length on a `fixed` role. A colour role answered with
anything but a `{color.*}` alias, another colour role or `transparent`, or colour roles whose
aliases lead back to themselves. A slot answered outside its accepts set, and `{transparent}` is always outside it,
since a set that takes `transparent` takes it without braces. A key that is no role, no slot and no `fs-*` or `rhythm-*` step. An answer in the `light` group that is not a `{color.*}` alias or another colour role, `transparent` included. An alias that resolves to nothing. A plugin that
answers nothing. And a broken reading floor. The command writes nothing and exits non-zero.
The user scale column of each role sheet decides what a length does. `fixed` keeps it in px and
refuses `rem` and `em`. `scales` emits a px answer as `rem` so it grows with the reader's text
size. `none` marks a role whose answer is no length.
Everything the audit says is a **report**, and stays one until you pass `--strict`.

The reading floors are the trap in that list, because an ordinary-looking scale step can break one.
Prose leading holds at 1.5 or more, heading leading at 1 or more, and the prose measure between 45
and 90. `{lh.tight}` is a perfectly normal step of the leading scale and it is under the heading
floor, so answering `lh-heading` with it refuses the build.

Beyond those, `arena audit` reads each source file and nothing reads the rendered view. The
last step is the only one that checks the thing you care about.

- [ ] Run `arena build`, which names every role the root plugin leaves unanswered, one line each. A plugin started empty is listed whole. Answer every role that carries no default in `plugin.tokens.json`, starting with the shapes.
- [ ] Run `arena audit`. Your plugin directory is in scope because the config
      declares it, so the audit measures your application and your plugin together.
- [ ] Read the report. Fix what it names, and re-run it until it names nothing.
- [ ] Run `arena check` and read every contrast line it prints. A pair under its floor names the slot or role to answer again.
- [ ] Run `arena build`, which writes the sheets the next step imports.
- [ ] Import the sheets `arena build` writes: `arena.package.generated.css` first, then `arena.generated.css`
      and, when your plugin carries CSS, `plugin.generated.css`. [`install.md`](./install.md) gives the order.
- [ ] Serve the application and look at it, in both polarities.

## How a role gets added

Paint the decision by hand through the part. The report names every part your plugins paint, and that note is the
evidence. **A role is added when several style plugins are measured painting the same decision
through the same part.** What one product paints is its own.

Two things that look like evidence and are not. A rule that restates the part's own answer raises
the count without changing a pixel. And an ask whose whole content is a difference between two states of one part cannot become a
role at all. A colour slot answers such a difference in colour ([`color-slots/index.md`](./color-slots/index.md)), and any other is the product's own markup.
