# arena-from-scratch/

**The identity document, which is what a project has instead of an appearance before it has one.**
[`identity.html`](./identity.html) is the template a builder duplicates into their own project and
fills in; [`identity.example.html`](./identity.example.html) is one worked answer, derived from the
language course entry in
[`../plugin-style-store/catalogue/AGENTS.md`](../plugin-style-store/catalogue/AGENTS.md).

It is here rather than under `skills/design/` because it is not a document anybody reads on a
route: it is a file that gets copied out of the tree and edited. The skill's own cold start
reference is what sends a reader here, and that reference is the page that explains when.

## Why a page and not a form

A palette described in prose is a palette nobody can approve. The template draws every swatch, sets
both specimen faces and shows the radius ladder, so the decision being approved is the one on
screen rather than the one in the sentence. That is also why the pages must be served over HTTP: a
page opened from `file://` loads no stylesheet, and every swatch on it is blank.

## What keeps it honest

**Every colour on both pages is a role and never a palette step**, which is the same rule the skill
hands a builder: `fill-page` and `ink-body` rather than `bg` and `bone`, `edge-separator` rather
than `border`. The page therefore follows whatever skin the linked sheet carries, and a page that
reached for a palette alias would show Arena's own colours whatever the project's are.

**`--ink` is the page's own fill and never its text.** It is the mistake this template exists to
stop being made twice: a document that paints its body copy with it renders white on white in the
light theme, silently, with nothing to report it.

**The polarity is a class on `<html>` and not a palette.** The example declares a light palette, so
it carries `arena-light`; a page whose palette is light and whose root carries no class reads the
dark theme's ink over the light theme's paper.

## Keeping it in step with intro/

The template links [`../intro/styles.css`](../intro/styles.css) when the work happens in this
repository, which is the same sheet [`../intro/AGENTS.md`](../intro/AGENTS.md) governs, and a
project that has already run the build points it at its own generated stylesheet instead. That one
line is the only thing in either page a reader is meant to edit by hand, and it is commented where
it sits.

**The specimen shape is `intro/guidelines/`'s and the pages are not specimens.** A guideline card is
a small standalone page the site renders into a gallery under the `@dsCard` header it carries; these
two carry none, render nowhere, and are copied instead. Borrow the shape and do not add the marker.

## When the template gains a section

A section is added when the kernel gains a decision a project has to make before its first screen,
never when a role moves. The list of decisions the template asks about is the one
[`../skills/design/references/style-kernel.md`](../skills/design/references/style-kernel.md)
measured as the ones that separate one product from another, and a section here that no product
would answer differently is a question that wastes the one round of attention this document gets.
