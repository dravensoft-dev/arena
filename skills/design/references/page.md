# The page you paint

Arena paints no page of yours. Arena draws the components, declares the floor they stand on, and
ships the column and the air as classes you put on your own markup. The page itself is a thing you
write, and Arena hands you every value to write it with.

Read this page before the first screen, and again while you write one. This page covers the half of a page that is never a component. Three questions belong here: what colour your own markup takes,
how wide the content column gets, and how much space goes between one component and the next.

## The floor, and Arena does not paint it

**`--fill-page` is the floor of the page**, and it is yours to apply. Put it on the element that
owns the whole viewport. A page with no floor shows the browser's own canvas below the first
screenful. That canvas is white under a dark palette, and it is the most common way a correctly
built Arena screen looks broken.

**`--font-body` is the body face, and the document does not take it.** Components read their faces through roles and your markup does not. Put `font-family: var(--font-body)` on the floor's element, and your copy is in the face `arena.config.json` names.

**What Arena does declare is `color-scheme`, from the palette's polarity.** Scrollbars, native
controls and autofill point the way the palette does, so a palette states whether it is dark or
light rather than leaving it inferred.

## Which colour your own markup takes

**Reach for a role when the thing you are drawing is furniture, and an alias when it is voice.**
Both are legitimate, and they differ when the skin changes. A style plugin
re-answers a role, so markup painted through one follows the appearance it is handed. An alias
resolves to a palette colour and follows the palette instead.

**Markup of yours written with Tailwind v4 reads the same tokens.** Import the package's
`css/tailwind-theme.css` right after `tailwindcss`, and `bg-base-100` or `p-4` on your own
element resolves to the token a component reads. Tailwind's own defaults stop resolving at all.

**A page's frame is chosen by the viewport, and a component by its own box.** Mark a wide
screen's rail `max-md:hidden` and a phone's drawer `md:hidden`: CSS is right at the first paint, a
server's included. `display: none` keeps the hidden frame out of the accessibility tree, so
both may carry one navigation name. Both are instantiated, so branch a heavy frame on your
layer's viewport helper instead, right at the first client render and wide in a server's HTML.
The `md:hidden` pair also chooses a side nav or a bottom nav, and an app bar's `nav` slot or its phone toggle.
Arena's components narrow before the client's first paint and are wide in a server's HTML.

**The colour roles below are what a page of yours reaches for**; the kernel has more, each for a surface Arena draws.
Each role's full description is one entry in
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

Each edge role has a width beside it: `--bw-surface`, `--bw-control`, `--bw-field`,
`--bw-separator` and `--bw-marker`. So a border of yours is a role for the colour and a role for
the thickness, never a length you chose.

**A role says which colour the text takes, and a level says how far it is held back**, and text
needs both. Under the default style plugin `--ink-muted` and `--ink-body` resolve to the same
colour. What makes the held-back register held back is the level mixed into it. So a bare
`var(--ink-muted)` paints a caption at the strength of body copy, and nothing reports it.
Spend one the way every Arena component spends it:

```css
color: color-mix(in oklab, var(--ink-muted) var(--level-ink-muted), transparent);
```

`--level-ink-body`, `--level-ink-quiet` and `--level-ink-muted` are the three, in
[`contracts/design/colors.css`](../../../contracts/design/colors.css). The three are floors rather than
constants. `arena build` raises one for a palette whose ink has too little room to clear its
contrast bar. So a percentage of your own is the one value on this page that cannot follow the
palette it was written against.

**The aliases are in [`contracts/design/colors.css`](../../../contracts/design/colors.css)**:
`--crimson` and `--gold` are the two accents, with a soft wash beside each. `--danger`,
`--success`, `--warning` and `--info` are the four status colours, with the same. `--bone` and
`--mute` are text at full strength and text held back. The percentages the held-back registers stand at are tokens, not frozen numbers. Raising one is a palette decision, not an edit in a hundred places.

## Meaning and identity are two different colour sets

**A status colour means something and a ramp slot identifies something, and neither does the
other's job.** The components hold that rule, and markup of yours holds it the same
way. Otherwise a reader learns that green is sometimes a category.

- **Meaning** is the four status colours. `arenaToneColor(tone)` from your package resolves the
  one a tone stands for, so a shape you draw yourself keeps meaning what the components mean by
  it.
- **Identity** is the eight ramp slots, `--color-cat-1` through `--color-cat-8`, in fixed order.
  The order is the identity, so slot three is slot three in every chart on the screen.
  `arenaCatIndex(slot)` and `arenaCatTint(colour)` are there for a legend or a chip you draw.

## The rest of the scale, and the edges of the device

**`--sp-*` is the spacing scale in thirteen steps**, and everything the rhythm classes do not cover reads it. The steps
are `--sp-0` through `--sp-6` one at a time, then `--sp-8`, `--sp-10`, `--sp-12`, `--sp-16`,
`--sp-20` and `--sp-24`. A bare length is a bug, and this scale makes it unnecessary. [`contracts/design/Scales.md`](../../../contracts/design/Scales.md) says
what each step is for.

**`--pad-safe-top`, `--pad-safe-right`, `--pad-safe-bottom` and `--pad-safe-left`** compose the
device's own insets with that scale, in
[`contracts/design/environment.css`](../../../contracts/design/environment.css). Use them on a
shell you draw around Arena, so a bar pinned to the bottom of a phone screen clears the home
indicator without you measuring one.

## Taking the least of this, and taking all of it

**The least is the classes and the roles as they stand.** Paint the floor with `--fill-page`,
your text with `--ink-body` and `--ink-muted`, your own surfaces with `--fill-surface` and
`--edge-surface`, put `.arena-shell`, `.arena-band` and `.arena-stack` on your markup (see [`style.md`](./style.md)). Nothing here needs a style plugin, and a screen built this way already follows whatever
appearance the project adopts later.

**All of it is the same page with the roles re-answered.** Every name above that is a role rather
than an alias is a question your own style plugin answers. The page you already wrote then takes
the new corners, the new borders, the new column width and the new air, without one of its rules
being edited. Reaching for the role over the alias buys that, and
[`style-kernel.md`](./style-kernel.md) is where the answers are written.
