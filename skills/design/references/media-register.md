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

## Arena ships the hard parts of that

**You do not write a focus trap.** The package exports the one Arena's own dialogs run on, and
your layer's `PACKAGE.md` names each: the modal contract, the tone-to-colour map for a status
shape you draw, and the visually-hidden style object for a label the design does not show. Reach
for those rather than writing a second copy, and read that page's export table before you reach
for anything else: what it names is what carries a promise.

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

**A grid is one line and it is yours.** `ArenaGrid` exists for a set of cards and says so in its
own Don't: a photo wall three across is `grid-template-columns: repeat(3, 1fr)` on an element of
your own, and two products measured wanting it wrote exactly that line. Reaching for a component
here costs more than writing it.

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

The furniture around the content is still Arena's, and reaching for it is what keeps a product
built this way from reading as two products. The banner, the navigation, the dialogs that are
dialogs, the empty and error states, the skeletons, the toasts, the avatars, the tags, the buttons
and every field: those are components, and the screen you are writing is mostly them with one
element of your own in the middle.
