# The page you paint

Arena paints no page of yours. It draws the components, declares the floor they stand on, and
ships the column and the air as classes you put on your own markup, which leaves the page itself
a thing you write and gives you every value to write it with.

Read this before the first screen and again while you write one, because it is the half of a page
that is never a component: what colour your own markup takes, how wide the content column gets,
and how much space goes between one component and the next.

## The floor, and Arena does not paint it

**`--fill-page` is the floor of the page**, and it is yours to apply. Put it on the element that
owns the whole viewport, because a page with no floor shows the browser's own canvas below the
first screenful, which is white under a dark palette and is the most common way a correctly built
Arena screen looks broken.

**What Arena does declare is `color-scheme`, from the palette's polarity.** The scrollbars, the
native controls and the autofill the browser draws point the way the palette does without you
asking, which is why a palette states whether it is dark or light rather than leaving it inferred.

## Which colour your own markup takes

**Reach for a role when the thing you are drawing is furniture, and an alias when it is voice.**
Both are legitimate, and the difference is what happens when the skin changes: a role is what a
style plugin re-answers, so markup painted through one follows the appearance it is handed; an
alias resolves to a palette colour and follows the palette instead.

**Nineteen of the kernel's roles are colours**, and these are the ones a page of yours reaches
for. Their full descriptions are one entry each in
[`contracts/design/roles.json`](../../../contracts/design/roles.json).

| what you are drawing | the role |
|---|---|
| the page itself | `--fill-page` |
| a surface belonging to the page: a panel, a tile, a block of yours that reads as a card | `--fill-surface` |
| a surface floating over it: a popover, a layer of your own | `--fill-surface-floating` |
| a region recessed into a surface: a code block, a well | `--fill-surface-sunken` |
| a box somebody types into | `--fill-field` |
| what a row or a cell of yours takes under the pointer | `--fill-hover` |
| the ground a value runs along, or the box a set of segments sits in | `--fill-track` |
| a heading | `--ink-heading` |
| text somebody reads, and the default answer for any text slot | `--ink-body` |
| the small line above a title that says what kind of thing this is | `--ink-eyebrow` |
| text held back: a caption, a hint, a timestamp | `--ink-muted` |
| the line enclosing a surface, and the default ground line | `--edge-surface` |
| the line around a floating surface | `--edge-surface-floating` |
| the line around a control, a quiet control, a field, a marker | `--edge-control`, `--edge-control-quiet`, `--edge-field`, `--edge-marker` |
| the rule dividing one thing from the next inside a surface | `--edge-separator` |
| the wash a media frame draws under anything laid over it | `--overlay-media` |

Each edge role has a width beside it, `--bw-surface`, `--bw-control`, `--bw-field`,
`--bw-separator` and `--bw-marker`, so a border of yours is a role for the colour and a role for
the thickness and never a length you chose.

**A role says which colour the text takes, and a level says how far it is held back**, and text
needs both. Under the default style plugin `--ink-muted` and `--ink-body` resolve to the same
colour: what makes the held-back register held back is the level mixed into it, which is why a
bare `var(--ink-muted)` paints a caption at the strength of body copy and nothing reports it.
Spend one the way every Arena component spends it:

```css
color: color-mix(in oklab, var(--ink-muted) var(--level-ink-muted), transparent);
```

`--level-ink-body`, `--level-ink-quiet` and `--level-ink-muted` are the three, in
[`contracts/design/colors.css`](../../../contracts/design/colors.css). They are floors rather than
constants, and `arena-to-prod` raises one for a palette whose ink has too little room to clear its
contrast bar, so a percentage of your own is the one value on this page that cannot follow the
palette it was written against.

**The aliases are in [`contracts/design/colors.css`](../../../contracts/design/colors.css)**:
`--crimson` and `--gold` for the two accents with a soft wash beside each, `--danger`,
`--success`, `--warning` and `--info` for the four status colours with the same, and `--bone` and
`--mute` for text at full strength and held back. The percentages the held-back registers stand
at are tokens rather than numbers frozen into a rule, so raising one is a palette decision and
not an edit in a hundred places.

## Meaning and identity are two different colour sets

**A status colour means something and a ramp slot identifies something, and neither does the
other's job.** This is the rule the components hold, and markup of yours holds it the same way or
a reader learns that green is sometimes a category.

- **Meaning** is the four status colours. `arenaToneColor(tone)` from your package resolves the
  one a tone stands for, so a shape you draw yourself keeps meaning what the components mean by
  it.
- **Identity** is the eight ramp slots, `--color-cat-1` through `--color-cat-8`, in fixed order.
  The order is the identity, so slot three is slot three in every chart on the screen.
  `arenaCatColor(slot)` and `arenaCatTint(colour)` are there for a legend or a chip you draw.

## The column the page sits in

`css/page.css` and `css/prose.css` carry four classes, and each goes on markup you wrote.

- **`.arena-shell`** fills the window, so a short page's footer sits at the bottom rather than
  floating halfway up.
- **`.arena-shell__main`** goes on the one child of the shell that should take the slack. It is a
  class rather than something the shell distributes because a shell with a header, a main and a
  footer has exactly one child that should grow and no rule can know which.
- **`.arena-band`** centres its contents at the page width with a gutter either side. Put it
  inside anything that spans the viewport so the contents line up with the page above and below.
- **`.arena-prose`** holds a reading column to a measure in `ch` rather than a pixel width, so it
  tracks the font size the way a measure has to. Put it on an article or a section you wrote.

**All three lengths are roles**: `container-max`, `gutter` and `measure-prose`. A style plugin
written for reading narrows the column, and every page you already shipped follows without an
edit. Narrowing the column while keeping the gutter says the page is a document; widening both
says it is a console.

**The band carries the width and the gutter and no block air.** The space above and below a page's
content is yours, and it is a `padding-block` on a container of your own spent on the `--sp-*`
scale below. It is not a rhythm step: the classes in the next section answer the gap between two
siblings, and this is the padding of the box that holds them, which is a different question with a
different answer.

## The air between two components

**Arena draws no outer margin on anything**, so the space between one component and the next is
always yours to place. `css/rhythm.css` is that half, as three named steps rather than a number
you pick.

| the class | the step | when |
|---|---|---|
| `.arena-stack` | `--rhythm-component` | a column of peers: a card and the next card, a chart and the table under it |
| `.arena-stack--group` | `--rhythm-group` | a column of things that read as one unit: a label and its field, a card's own stacked children |
| `.arena-stack--section` | `--rhythm-section` | between two sections of a page, which answer different questions |
| `.arena-row` | `--rhythm-group` | a wrapping line, grouped by default |
| `.arena-row--component` | `--rhythm-component` | a wrapping line whose items are separate things |

**The three lengths are also custom properties**, `--rhythm-group`, `--rhythm-component` and
`--rhythm-section`, so a grid of your own or a rule the classes do not cover spends the same step
rather than a fresh number. Reach for the class first: it carries the display and the direction
with the gap, and a `gap` you write yourself is a rule that can drift off the step.

**The miss this replaces has one shape, and it is small enough to look like nothing.** A column of
your own carrying `display: flex`, `flex-direction: column` and a `gap`, holding a title over its
identifier inside a table cell, or a label over the value under it, written inline because reaching
for a class felt like more than two lines were worth. `.arena-stack--group` is exactly that block,
and the step a group is spent at is the same step wherever it is spent.

**Five modifiers carry no length and line the items up instead**: `.arena-stack--start`,
`.arena-stack--end`, `.arena-row--start`, `.arena-row--baseline` and `.arena-row--between`. They
answer a question about your content, a trailing figure against a wrapping name, which is why
they are here rather than in the kernel.

**These classes go on an element you wrote, and they are useless on an Arena element.** A
component's own element may declare `display: contents` and carry no box, and one component
renders no element of its own at all, so an Arena element is never a layout target.

**The air inside a component is not this.** `gap-control`, `gap-inline`, `gap-items`,
`pad-surface`, `pad-control-x` and `pad-control-y` are kernel roles, and you move them by
answering them differently in your style plugin rather than by writing a rule against a
component. That is the whole cut: between is yours and comes from here, inside is the kernel's
and comes from [`style-kernel.md`](./style-kernel.md).

## The rest of the scale, and the edges of the device

**`--sp-*` is the spacing scale in thirteen steps**, and it is what everything the rhythm classes
do not cover reads: `--sp-0` through `--sp-6` one step at a time, then `--sp-8`, `--sp-10`,
`--sp-12`, `--sp-16`, `--sp-20` and `--sp-24`. A bare length is a bug and this is the scale that
makes it unnecessary. [`contracts/design/Scales.md`](../../../contracts/design/Scales.md) says
what each step is for.

**`--pad-safe-top`, `--pad-safe-right`, `--pad-safe-bottom` and `--pad-safe-left`** compose the
device's own insets with that scale, in
[`contracts/design/environment.css`](../../../contracts/design/environment.css). Use them on a
shell you draw around Arena, so a bar pinned to the bottom of a phone screen clears the home
indicator without you measuring one.

**Two more classes are for markup rather than components.** `.arena-num` from `css/numerals.css`
puts a figure on the mono face with tabular figures and no colour, so a column of them aligns by
digit and does not jitter as it counts. `.arena-sr-only` from `css/sr-only.css` is a label a
screen reader announces and nothing paints, which is where the name of an icon-only control you
drew yourself goes.

## Taking the least of this, and taking all of it

**The least is the classes and the roles as they stand.** Paint the floor with `--fill-page`,
your text with `--ink-body` and `--ink-muted`, your own surfaces with `--fill-surface` and
`--edge-surface`, put `.arena-shell` and `.arena-band` around the page and `.arena-stack` between
things. Nothing here needs a style plugin, and a screen built this way already follows whatever
appearance the project adopts later.

**All of it is the same page with the roles re-answered.** Every name above that is a role rather
than an alias is a question your own style plugin answers, so the page you already wrote takes
the new corners, the new borders, the new column width and the new air without one of its rules
being edited. That is the reason to reach for the role over the alias in the first place, and
[`style-kernel.md`](./style-kernel.md) is where the answers are written.
