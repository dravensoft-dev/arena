# When the markup is yours

Arena's component list is the furniture of an application somebody works in. A photo wall, a story
ring, a feed of posts, a slideshow, a document editor and a game map are outside it, and the router
says so before it says anything else. This page is what that sentence owes you.

**The answer is not that Arena is the wrong choice.** The skin travels either way: a style plugin
answers every role whatever the product is, and one of the products measured on this kernel is a
photo feed. What changes is that you write the markup and Arena hands you the parts, so the
question stops being "which component" and becomes "which of Arena's pieces does this element
need". Read this once, when you have found the first screen with no component under it.

## Read the pattern before you write the markup

An element Arena does not ship still owes a user everything Arena's own components owe them.
`contracts/behaviour/` is where each pattern is stated once, normatively, in a form your own
markup can be held to:

- **`contracts/behaviour/feed.json`** for a scrolling list of posts: the `feed` role, an `article`
  per entry, `aria-posinset` and `aria-setsize` on each, `aria-busy` while a page loads, and the
  keys that move between articles. A feed of your own that binds none of this is a feed only a
  mouse can read.
- **`contracts/behaviour/dialog-modal.json`** for a lightbox or a viewer: `aria-modal`, focus taken
  on open, focus restored to the invoker on close, Tab trapped inside, Escape out.

Read the one your element is, and bind what it requires. These files are the same source Arena's
own components are held to, so what you write is held to the standard the components are.

## One of those two is handed over, and the other is not

**You do not write a focus trap.** The package exports the one Arena's own dialogs run on, and
your layer's `PACKAGE.md` names each: the modal contract, the tone-to-colour map for a status
shape you draw, and the visually-hidden style object for a label the design does not show. Reach
for those rather than writing a second copy, and read that page's export table before you reach
for anything else: what it names is what carries a promise.

**The feed pattern has no such export, and it is not an oversight you can wait out.** Arena binds
it once, inside `ArenaActivityFeed`, and that component is not your feed: it is an event log with
a fixed row and no slot for your markup, so reaching for it because the name matches is the
mistake this section exists to stop. What you can do is read how it binds the pattern, in that
component's source, and write the same thing around your own article: the paging keys move focus
between articles rather than scrolling, which is the part a reimplementation from memory gets
wrong. Until an export exists, that reading is the handover.

**`isArenaOwnActivation(target, container)`** is the one to know about by name. A post that opens
on tap and carries a like button inside it is two activations on one surface, and that predicate
is how the outer one keeps its hands off the inner. It is the same rule Arena's own clickable rows
run on.

## The stylesheets are for content you draw

The package ships more than the components' own CSS, and these four are the ones written for
markup that is not a component: `css/rhythm.css` for the vertical stack between your elements,
`css/page.css` for the column the page sits in, `css/numerals.css` for a figure that must not
jitter as it counts, and `css/sr-only.css` for the label a screen reader needs and the design does
not show. Your layer's `PACKAGE.md` has the whole tree and says which depth to pick.

**The frame around a picture is a component, and the grid around the frames usually is not.**
`ArenaFigure` is the cell: its `ratio` defaults to the `aspect-media` role and its overlay slot
paints `overlay-media`, so the two roles below are answered for every picture at once and a wall
reads as a wall rather than as whatever sizes the images happened to be. Use it for a post's image
and for a wall's cell alike.

The grid holding them is the split. `ArenaGrid` auto-fits off the `grid-min` role, which is what
you want when the count is the data's and the plugin decides how dense it looks. A wall that is
**three across because the design says three** is `grid-template-columns: repeat(3, 1fr)` on an
element of your own, one line, and `ArenaGrid`'s own Don't says so: two products measured wanting
a fixed count wrote exactly that line rather than bending a component into it.

## Four roles decide how your media looks

The kernel's role list is where a project answers what Arena looks like, and four of its roles are
about exactly this register rather than about the furniture: `aspect-media`, `fit-media`,
`r-media` and `overlay-media`. Their descriptions in `contracts/design/roles.json` are written
about galleries and shops. If your product is media, those four are not a detail of your style
plugin, they are most of what a viewer will notice, so answer them first and look at the result
before you answer anything else.

`r-media` is also where the boundary is stated in the kernel's own words: a card is a container
the reader looks past, and a figure is the thing being looked at. If your post is the thing being
looked at, it is not a card.

**Two component names will look like your answer and are not.** `ArenaActivityFeed` is an event
log with a fixed row, and `ArenaCard` is the container above. Both are the first thing a search
for your screen returns, and reaching for either is how a product in this register ends up fighting
a component instead of writing six lines.

## The viewer that opens a picture at full size

Arena ships no lightbox, and this is the element of your own that comes up most often. Every value
it needs is already a token, so the only thing you are inventing is the box:

- **The box needs no length of its own, and the one people write is the tell.** As tall as the
  viewport allows is not a token and is not a percentage of one: it is `position: fixed` with
  `inset: 0` on the layer and `max-width: 100%` with `max-height: 100%` on the picture, and the
  layer's own padding is where `--pad-safe-*` and a step of the spacing scale go. A chosen `90vh`
  is the shape this goes wrong in, and it is usually compensating for the second mistake rather
  than for a design: `vh` is the viewport a phone has with its browser chrome retracted, so a
  picture sized in it is taller than the room it has while the chrome is showing. `dvh` is the
  unit that follows the chrome, which is why `.arena-shell` fills the window with `100dvh`, and
  a fixed layer at `inset: 0` needs neither. There is no role here because there is no decision
  here: how tall a full-size picture may get is the viewport's answer and not a style plugin's.
- **The dim is `--scrim` with `blur(var(--scrim-blur))`**, which is the pair Arena's own dialogs
  dim the page with, and the layer is `--z-modal`. A scrim of your own is the one value that makes
  a viewer look like a different product from the dialogs beside it.
- **`object-fit: contain`, not `cover`.** Edge to edge and never cropped pull against each other on
  any viewport whose shape differs from the picture's, and a capture that lost a corner to its
  frame is one somebody has to go and find the original of. What is left over on the short axis is
  the dimmed page rather than a mat you designed.
- **The way out is a control you draw, and `--overlay-media` is what it stands on.** That role is
  the wash a frame draws under anything laid over a picture, and a close control laid over one is
  that case even with no `ArenaFigure` in sight: the picture underneath is one nobody chose, so a
  control tinted by the palette alone is legible over some of them and invisible over the rest.
- **`--pad-safe-top` and `--pad-safe-right`** hold that control off a phone's cutout, composed with
  a step of the spacing scale.
- **Bind `contracts/behaviour/dialog-modal.json`** and take the focus trap your layer exports
  rather than writing one. A viewer with no name, no Tab trap or no focus restored to the control
  that opened it is the same defect in your markup that the contract exists to stop in Arena's.

## One rule bends here, and only one

**One primary accent per view** is written for a screen. A feed is not a screen in that sense: a
follow action on each of twenty posts is not twenty primary accents, it is one repeated element,
and the rule is about the eye having one place to land rather than about a count of buttons. Give
the repeated action a secondary or a ghost weight and keep the single primary for what the screen
as a whole is for. Nothing checks this either way, so it is yours to hold.

Every other rule the router states holds unchanged, and two of them get harder rather than easier
in this register: no gradients on a surface, and a chart carries identity or meaning and never
both. A media product is where both are most tempting.

## What Arena still gives you

**The screen you are writing is mostly components with one element of your own in the middle.**
The banner, the navigation, the states around empty and failed, every field and every button are
furniture whatever the product is, and reaching for them is what keeps a product built this way
from reading as two. Your layer's `INDEX.md` is the directory; work out from your own element
rather than in from a page layout.
