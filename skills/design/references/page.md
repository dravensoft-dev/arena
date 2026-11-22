# The page you paint

Arena paints no page of yours. Arena draws the components, declares the floor they stand on, and
ships the column and the air as classes you put on your own markup. The page itself is a thing you
write, and Arena hands you every value to write it with.

Run `arena init` and `arena build` first ([`cli.md`](./cli.md#which-commands-are-there)), then import their sheets ([React](./install.md#how-do-i-import-the-stylesheets-in-react), [Angular](./install.md#how-do-i-import-the-stylesheets-in-angular)).

Read this page first for what your page stands on. The colour of your own markup is on [the markup tree](./tokens/markup/index.md), and the column and the air are on [`style.md`](./style.md).

## The floor, and Arena does not paint it

**`--fill-page` is the floor of the page**, and it is yours to apply. Put it on the element that
owns the whole viewport.

```css
body {
  background: var(--fill-page);
  font-family: var(--font-body);
  color: color-mix(in oklab, var(--ink-body) var(--level-ink-body), transparent);
}
```

In React it goes in the stylesheet your entry imports after Arena's sheets. In Angular it goes in the global stylesheet `angular.json` lists under `styles`. `css/reset.css`, which `arena.css` imports first, already sets the root line height and `box-sizing`.

A page with no floor shows the browser's own canvas below the first
screenful. That canvas is white under a dark palette, and it is the most common way a correctly
built Arena screen looks broken.

**`--font-body` is the body face, and the document does not take it.** Components read their faces through roles and your markup does not. The `font-family` line in the rule above puts your copy in the face `arena.config.json` names.

**What Arena does declare is `color-scheme`, from the palette's polarity.** Scrollbars, native
controls and autofill point the way the palette does, so a palette states whether it is dark or
light rather than leaving it inferred.

Arena paints neither the selection nor the scrollbars, and the browser draws both from `color-scheme`.
A project that wants its own colours writes the rule, and the rule below is the project's, not Arena's.

```css
:root {
  scrollbar-color: var(--mute-2-disabled) transparent;
}
::selection {
  background: var(--gold-soft);
  color: var(--bone);
}
```

The page canvas follows the palette of the root element alone, whether that is `:root`, `.arena-dark` or `.arena-light`. A `color-scheme` set on `body` or on a wrapper leaves the canvas as it was. A palette island paints its own ground through `ArenaPaletteScope`.

## Which colour your own markup takes

**The role your own markup takes is answered on [`tokens/markup/index.md`](./tokens/markup/index.md).** The markup index names a page for each task: [surfaces and text](./tokens/markup/surfaces-and-text.md), [edges](./tokens/markup/edges.md) and [states](./tokens/markup/states.md).

**Markup of yours written with Tailwind v4 reads the same tokens.** Import the package's
`css/tailwind-theme.css` right after `tailwindcss`, and `bg-base-100` or `p-4` on your own
element resolves to the token a component reads. Where the sheet resets a Tailwind scale, a default utility such as `shadow-md` emits nothing. `arena audit` reports it as `dead-utility` when your project resolves `tailwindcss`, and [the token tables](./tokens/scales/index.md) name the utilities that resolve.

**A page's frame is chosen by the viewport, and a component by its own box.** Wrap a wide screen's
rail in an element of your own marked `max-md:hidden`, and a phone's drawer in one marked
`md:hidden`. CSS is right at the first paint, a server's included. `display: none` keeps the hidden
frame out of the accessibility tree, so both may carry one navigation name. Both are instantiated,
so branch a heavy frame on your layer's viewport helper instead, right at the first client render
and wide in a server's HTML. The `md:hidden` pair also chooses a side nav or a bottom nav, and an
app bar's `nav` slot or its phone toggle. Arena's components narrow before the client's first paint
and are wide in a server's HTML.

## Meaning and identity are two different colour sets

**A status colour means something and a ramp colour identifies something.** [`tokens/markup/meaning-and-identity.md`](./tokens/markup/meaning-and-identity.md) says which one markup of yours reaches for, with the colour aliases.

## The rest of the scale, and the edges of the device

**The spacing scale and the device's insets are on [`tokens/markup/space-and-layout.md`](./tokens/markup/space-and-layout.md).** Every other group reads the same way, and [`tokens/scales/index.md`](./tokens/scales/index.md) lists the pages that table the radius, border, shadow, motion, layer, breakpoint, density and type scale values. A media query takes no `var()`, so a frame uses the `md:` variants or the breakpoint helper, `useArenaViewportBelow` in React and `arenaViewportBelow` in Angular, in [`exports.md`](./exports.md).

## Taking the least of this, and taking all of it

**The least is the classes and the roles as they stand.** Paint the floor with `--fill-page`,
your text with `--ink-body` and `--ink-muted` at their levels (see [`tokens/markup/surfaces-and-text.md`](./tokens/markup/surfaces-and-text.md)) and your own surfaces with `--fill-surface` and
`--edge-surface`. Put `.arena-shell`, `.arena-band` and `.arena-stack` on your markup (see [`style.md`](./style.md)). Nothing here needs a style plugin, and a screen built this way already follows whatever
appearance the project adopts later.

**All of it is the same page with the roles re-answered.** Every name above that is a role rather
than an alias is a question your own style plugin answers. The page you already wrote then takes
the new corners, the new borders, the new column width and the new air, without one of its rules
being edited. Reaching for the role over the alias buys that, and
[`style-kernel.md`](./style-kernel.md) is where the answers are written.
