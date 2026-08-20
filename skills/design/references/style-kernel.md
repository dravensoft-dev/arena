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

**`arena.config.json`, in your project root.** The palettes, the fonts and the plugins, and
nothing about components. **The shape, abridged, and not a file to copy**: every palette answers
the whole colour set rather than the three shown, and a config carrying three keys is refused
rather than defaulted.

```json
{
  "stylePlugins": ["./design/notion"],
  "palettes": [
    { "name": "light", "default": true, "polarity": "light",
      "colors": { "base-100": "#ffffff", "base-content": "#37352f", "primary": "#0b6bcb" } }
  ],
  "fonts": { "display": { "family": "Inter", "src": "..." } }
}
```

**`"stylePlugins": ["default"]` is a legitimate answer**, and it is the right one for a first
screen or a tool nobody outside the team will look at: it keeps the appearance Arena installs
with, and a project moves off it when the appearance starts mattering rather than before. What
this page costs you is paid when you decide to look like yourself, not to start.

Arena ships two themes and is dark first, so a real config carries a dark palette as well as the
light one above. The full colour list, the font slots and the rest of the config are on your
package's own page, and the file to copy is there rather than here: [`../../../frameworks/react/PACKAGE.md`](../../../frameworks/react/PACKAGE.md)
or [`../../../frameworks/angular/PACKAGE.md`](../../../frameworks/angular/PACKAGE.md).

**`design/<name>/plugin.tokens.json`.** One entry per role, and the directory name becomes the
plugin's name:

```json
{
  "r-surface":   { "$type": "dimension",  "$value": "{r.xs}" },
  "fw-heading":  { "$type": "fontWeight", "$value": "{fw.bold}" },
  "fill-field":  { "$type": "color",      "$value": "{color.base-200}" },
  "press-scale": { "$type": "number",     "$value": 0.98 },
  "container-max": { "$type": "dimension", "$value": { "value": 920, "unit": "px" } }
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

**The first entry in `stylePlugins` is the root plugin, and it answers every role.** It emits on
`:root`, and a custom property with no value is invalid at computed-value time: the declaration
reading it is dropped and the property disappears. A partial root plugin is not a plainer
appearance, it is a page with no borders. Every later entry emits under `.arena-<name>`, taken from
its directory, and is a difference sitting over the root plugin, so it answers only what it changes.

**A colour role takes one of your palette colours as a `{color.*}` alias, and never a literal.**
The palette is yours and what a role says is WHICH of your colours a surface takes. It is
mechanical as well: a bare colour alias is restated under every palette, and anything else resolves
to one theme's value and inherits it into the other, so a hex here is a light-mode colour showing
through your dark theme.

## What an answer may be

- **A scale alias**, `{r.xs}`, `{sp.4}`, `{fw.bold}`, `{dur.fast}`, `{ease.out}`. This is the
  ordinary answer.
- **A `{color.*}` alias**, for every colour role.
- **A literal**, where the scale has nothing you want: `{ "value": 920, "unit": "px" }`, or a bare
  number for a ratio such as `press-scale`. **Two of the loudest decisions need one**, because the
  scale has no step for them: a square corner is `{ "value": 0, "unit": "px" }`, and no shadow at
  all is a shadow object whose every length is zero and whose colour is fully transparent.
- **A unit the type does not carry**, through `$extensions`. Four roles need it and the rest do
  not: `track-heading`, `track-eyebrow` and `track-label` take `em`, and `measure-prose` takes
  `ch`. A tracking role that forgets it emits a bare number, which is not a valid letter spacing,
  and the declaration silently resolves to `normal`.
  ```json
  "measure-prose": { "$type": "number", "$value": 86,
    "$extensions": { "com.dravensoft.arena": { "cssUnit": "ch" } } }
  ```

**The type of a role does not tell you which scale its answer comes from**, so here is the map. A
`dimension` role draws from four different places depending on what it is for:

| Roles | Scale | Where the steps are |
|---|---|---|
| `r-*` | `r` | [`effects.json`](../../../contracts/design/effects.json) |
| `bw-*` | `bw` and `bw-strong`, a pair rather than a ladder, so the alias carries no step | the same |
| `shadow-*` | `shadow` | the same |
| `dur-*`, `ease-*` | `dur`, `ease` | the same |
| `pad-*`, `gap-*`, `gutter` | `sp` | [`spacing.json`](../../../contracts/design/spacing.json) |
| `step-eyebrow` | `dz` | the same |
| `fw-*` | `fw` | [`typography.json`](../../../contracts/design/typography.json) |
| `ff-*` | `font`, which resolves to the families your config declares | the same |
| `track-*` | `ls` | the same |
| `lh-*` | `lh` | the same |
| `step-title-*` | `fs` | the same |
| `container-max`, `grid-min`, `measure-prose`, `lift-control`, `press-scale`, `aspect-media` | none | a literal is the only answer |

[`Scales.md`](../../../contracts/design/Scales.md) beside them is the reasoning for the ladders
that have one, which is not all of them.

**What an answer may never be is a scale itself.** A scale step is shared by every use that wants
that value, so moving one is not a style plugin but a different Arena. **The type and page-rhythm
ladders are the one exception**, because they reach a page through classes you apply rather than
through any role, and you answer them in the plugin beside the roles: a key named `fs-<step>` or
`rhythm-<step>` is read as that step rather than as a role nothing ships. Both are dimensions and
both carry a `$description`, because a step a plugin moves is a decision rather than a value. Move
one step or every one of them, as the product needs: completeness binds a role, which disappears
unanswered, and never a step, which keeps the value Arena ships. Every other scale key is refused
by name, so a different type scale is answered here or it is not answered.

The questions themselves are in
[`../../../contracts/design/roles.json`](../../../contracts/design/roles.json): a name, a type, a
description and, for a keyword role, its closed set. No values, because the values are yours.

## Where the appearance actually comes from

Eight unrelated products were built on this kernel, one each in the register of a project tracker,
a language course, a photo feed, a document workspace, a storefront, an inbox, an observability
console and a booking flow. **Every one of them answered these identically**, and a plugin that
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
nothing. The fills are the opposite, and it took the wider catalogue to show it: a console puts its
panels on the second surface step and its page on the first, a booking page does the reverse, and
the other six leave both at the page colour. **That answer follows from the page shape rather than
from the palette**, so settle what the screen is before assigning any of it.


Those are not the answers the appearance Arena installs with gives. That one is a design of its
own and assigns several of these differently, so it is a plugin to read rather than a baseline to
inherit: a plugin you write answers every role itself, and nothing is inherited from it.
It is [`plugin-style-store/default/plugin.tokens.json`](../../../plugin-style-store/default/plugin.tokens.json)
in the Arena repository, and
[`plugin-style-store/complete/`](../../../plugin-style-store/complete/plugin.tokens.json) beside
it is a second one answering the same roles differently. Read one of them before writing yours:
answering every role from a list of role names is the hardest instruction on this page, and a
worked answer is worth more than the list. **Both are in the repository rather than in the
package**, so from an installed project read them on the Arena repository, or start from
`"stylePlugins": ["default"]` and replace one role at a time against something that already runs.

**These are where a product lives**, and the eight measured products disagree on every one of
them:

| Role | What moving it decides |
|---|---|
| `r-control`, `r-field`, `r-media` | how round the product is, which is the loudest single decision |
| `bw-surface`, `bw-control`, `bw-field`, `bw-separator`, `bw-marker` | whether an edge is a hairline, a drawn line, or absent |
| `fw-heading`, `fw-eyebrow`, `fw-control` | how loud type is before any size changes |
| `tt-label`, `tt-eyebrow`, `track-label`, `track-eyebrow` | whether small text shouts in capitals or reads as a word |
| `pad-control-x`, `pad-control-y`, `gap-inline`, `gap-items`, `gap-control` | how tight the product is to the hand |
| `container-max`, `measure-prose`, `grid-min`, `gutter` | how wide it breathes, and it ranges from a dense console to a reading column |
| `shadow-surface-rest`, `shadow-surface-floating`, `shadow-surface-deep`, `shadow-control-raised` | whether depth is a soft blur, a hard offset or nothing at all, and whether a surface has any at rest |
| `press-scale`, `lift-control`, `dur-state`, `ease-state` | how the product answers a hand |
| `aspect-media`, `fit-media` | what shape an image is, before any of it is cropped |
| `fill-page`, `fill-surface`, `fill-surface-sunken`, `fill-field` | which surface is the page and which is the thing standing on it |
| `edge-control`, `edge-field`, `edge-marker` | whether a control, a field and a marker are outlined at all, and in what |
| `ff-eyebrow`, `ff-label` | whether small text is the body face or the mono one, which is the difference between a shopfront and a console |

**So the order of work is: shapes, then space, then weight, then depth.** Leave the colour roles
where they are until those read as your product, because a plugin that starts by reassigning
colours changes the least and costs the most to undo.

## The part hooks

Every element drawing a slot carries `data-arena-part="<component>.<slot>"`, and that is what your
`plugin.css` selects. **The hook is an attribute on the element, so the page you are looking at is
the list**: serve the application, inspect the element you want to paint, and take the value.
Nothing enumerates the hooks in prose, and a name guessed from a component's member list is a
selector that matches nothing and reports nothing.

**You never write `@layer`**: the build wraps your sheet in a reserved layer
declared after the compiled component rules, so an ordinary selector wins with no `!important`
anywhere, and the sheet restates the layer order at its own head so a bundler cannot reorder it
into losing every contest silently.

Your application's own unlayered CSS still beats the plugin layer, and that order is right: your
application is the last word. It is also why reaching into an Arena slot from application CSS is
reported. It works, and working is what makes it debt rather than an error.

## Gotchas

Each of these was measured on a product, not reasoned about.

- **A rule that restates what the slot already paints changes no pixel.** It also inflates the
  count of parts your plugins paint, which is the number a request for a new role is argued from.
  The report names a restatement.
- **Arena's own colour aliases are a step of Arena's ramp under another name.** A rule reading
  `var(--mute)` assigns a colour without answering any role, and the raw-colour rule stays quiet
  because an alias is a token. Answer the role instead, or compose the shade out of your own
  palette: `color-mix(in oklab, var(--color-base-content) 62%, transparent)`.
- **A level is not a colour.** A colour role names which of your colours, never how far back it is
  held, and a slot that carries no opacity modifier cannot be held back by any answer to any role.
  Composing it in your own CSS is the route.
- **The charts that draw geometry from the data carry no part hook at all**, because their
  coordinates are the data and they have no slots to hook. A plugin reaches the frame around a
  chart and nothing inside the plot; the palette is what skins a plot.
- **A brand whose mark IS a gradient declares it once**, with `"gradientMark": true` in
  `arena.config.json`. The alternative is a marker on every line that draws the mark, and a marker
  suppresses every rule on its line rather than the one it is about.
- **Holding the report in CI takes kinds, not a switch.** A brand under 4.5:1 is a decision you
  already made and measured, and one switch over every kind would make that the price of holding
  the rest.
- **A part that exists in a slot and never in the rendered page passes every check there is**,
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
afternoon.** A role left unanswered by the root plugin, a value of the wrong type, a colour role
answered with anything but a `{color.*}` alias, an alias that resolves to nothing, and a broken
reading floor are all **hard failures of the plain command**: it writes nothing and exits non-zero.
Everything the audit says is a **report**, and stays one until you pass `--strict`.

The reading floors are the trap in that list, because an ordinary-looking scale step can break one.
Prose leading holds at 1.5 or more, heading leading at 1 or more, and the prose measure between 45
and 90. `{lh.tight}` is a perfectly normal step of the leading scale and it is under the heading
floor, so answering `lh-heading` with it refuses the build.

Beyond those, no gate reads your application, so the last step is the only one that checks the
thing you care about.

- [ ] Answer every role in `plugin.tokens.json`, starting with the shapes.
- [ ] Run `bunx arena-to-prod --audit`. Your plugin directory is in scope because the config
      declares it, so the audit measures your application and your plugin together.
- [ ] Read the report. Fix what it names, and re-run it until it names nothing.
- [ ] Import the three files it writes, `arena.generated.css`, `icons.generated.css` and, when your
      plugin carries CSS, `plugin.generated.css`.
- [ ] Serve the application and look at it, in both polarities.

## How a role gets added

Paint the decision by hand through the part. The report names every part your plugins paint, and
that note is the evidence: **a role is added when several style plugins are measured painting the
same decision through the same part.** What one product paints is its own.

Two things that look like evidence and are not. A rule that restates the slot's own answer raises
the count without changing a pixel. And an ask whose whole content is a difference between two
states of one part cannot become a role at all, because a plugin selects by part and never by the
value of a variant: the component renders one part in both states, and a plugin paints it once.
