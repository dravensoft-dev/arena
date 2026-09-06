<!-- GENERATED from the contracts by bun run generate:skills. Edit the contracts, not this file. -->

# Arena layout components, the React layer

Every layout component this layer ships, under the names it binds them to. **This page is an
index, not a manual.** How to write one is its own prompt, linked in the last column.

**The rules every component below answers to are stated in
[`../../../../skills/design/SKILL.md`](../../../../skills/design/SKILL.md) before any component
here**, and nothing on this page restates them.

Import from the package root, never from a path inside it:

```tsx
import { ArenaButton, ArenaTag } from '@dravensoft/arena-react';
```

A member is a prop. The main slot is `children`, a named slot is a prop taking a node, and an
event is an `on`-prefixed handler. An icon is a Phosphor class-name string, never an element.

- Every other category this layer ships: [`../../INDEX.md`](../../INDEX.md).
- Installing the package, declaring your skin, and what it exports besides components:
  [`../../PACKAGE.md`](../../PACKAGE.md).
- **Takes** is the members the component's API contract declares, in contract order, under this
  layer's own names. A member marked `*` is required; the prompt gives its type and its default.
- **A member whose type is an object or an enum takes one this package exports.** The prompt
  names the type and says what it is for; the fields it holds are in the type declaration itself,
  which `import type { … } from '@dravensoft/arena-react'` brings in. That field list is in neither
  the prompt nor the contract, so the type is where you read it.

| Component | What it is | Takes | Usage |
|---|---|---|---|
| `ArenaBoard` | The frame of a board: columns side by side, as wide as the room allows and never narrower than one column's minimum, scrolling sideways when they no longer fit. The frame is one tab stop carrying a group role and a name, which is what a scrolling region needs to be reachable by keyboard at all. ArenaBoard draws no card and moves nothing. What a column holds is the consumer's, and reordering is theirs too. | `label*` `children*` `minColumn` | [`ArenaBoard.prompt.md`](./arena-board/ArenaBoard.prompt.md) |
| `ArenaBoardColumn` | One column of an ArenaBoard. The column is a named head with a count and a control. Under the head sits a stack of whatever the consumer puts in it, and a footer for the one action that adds to it. The cards are the consumer's own, because a card on a board carries that product's fields and nothing general is left once they are removed. | `title*` `headingLevel` `count` `summary` `colorId` `action` `children` `footer` | [`ArenaBoardColumn.prompt.md`](./arena-board-column/ArenaBoardColumn.prompt.md) |
| `ArenaFigure` | A framed piece of media with an optional caption: an image, a video, or a stand-in for the one that has not arrived. The frame is a shape and a corner a style plugin answers. The frame clips whatever is put in it, so a wall of figures reads as a wall rather than as whatever sizes the pictures happened to be. | `media` `fallback` `overlay` `caption` `ratio` | [`ArenaFigure.prompt.md`](./arena-figure/ArenaFigure.prompt.md) |
| `ArenaGrid` | A grid that decides its own column count from the room it is given, rather than from a breakpoint anyone had to pick. Cells are as wide as they can be at or above a minimum, and the count falls as the room does, all the way to one. | `min` `gap` `maxWidth` `children` | [`ArenaGrid.prompt.md`](./arena-grid/ArenaGrid.prompt.md) |
| `ArenaHero` | The opening of a landing page. The hero holds one line the page is built around, what sits above and below that line, the actions it asks for, and a figure beside or behind it. The hero's title takes the hero register, which is the top rung of the title ladder and the only one above the page head. | `title*` `headingLevel` `eyebrow` `lede` `actions` `figure` `layout` `align` | [`ArenaHero.prompt.md`](./arena-hero/ArenaHero.prompt.md) |
| `ArenaMain` | The page's main landmark, and nothing else. Arena requires a name on both of its nav bars, because what a nav is FOR is editorial. Arena then shipped no way to say where the content itself begins, which is the one region of a page it had not kept its own decision about. ArenaMain draws no box: no display of its own beyond the block a landmark already is, no width, no grid, no padding. Where things go stays the container the consumer owns, and this component says only what the region IS. ArenaMain is also the target an ArenaSkipLink jumps to, so it is focusable programmatically. An anchor pointing at a container the platform will not focus scrolls the page and leaves focus behind. That failure is what makes most skip links look like they work. | `children` | [`ArenaMain.prompt.md`](./arena-main/ArenaMain.prompt.md) |
| `ArenaScroller` | A row that scrolls sideways because it holds more than fits, with no arrows pretending to be a slideshow. The row is one tab stop carrying a group role and a name, which is what a scrolling region needs to be reachable by keyboard at all. Without that, everything past the right edge belongs to the pointer alone. Each child is laid out at one width, so the row reads as a rail rather than as a line of whatever the children happened to measure. | `label*` `children*` `itemWidth` `behaviour` | [`ArenaScroller.prompt.md`](./arena-scroller/ArenaScroller.prompt.md) |
| `ArenaScrollerItem` | One cell of an ArenaScroller: the box that carries the width the row decided and the point the row settles on. The item exists because a row cannot reach inside its children to size them. A child that is an Arena component may render no box of its own at all. A rule aimed at the row's direct children then lands on nothing in one layer and on the card in the other. The item is the box both layers agree about. | `children` | [`ArenaScrollerItem.prompt.md`](./arena-scroller-item/ArenaScrollerItem.prompt.md) |
| `ArenaSection` | A named region of a page: a heading, optionally an eyebrow above it, a line under it and an action beside it, over whatever the region holds. The section wraps what the consumer wrote and never replaces it. The title register is the section one, a step above a card's and a step below a page's. A style plugin re-pitching the hierarchy moves this with the other two, rather than leaving a page with three heads that disagree. | `title*` `headingLevel` `children*` `eyebrow` `description` `action` `rhythm` | [`ArenaSection.prompt.md`](./arena-section/ArenaSection.prompt.md) |
| `ArenaSiteFooter` | The band across the bottom of every screen: what a page says about itself once it has finished. ArenaSiteFooter is the contentinfo landmark, so a page carries one. Like the bar at the top, its contents line up with the page above them. | `children` `note` | [`ArenaSiteFooter.prompt.md`](./arena-site-footer/ArenaSiteFooter.prompt.md) |
| `ArenaSkipLink` | The link that lets a keyboard reader step over everything repeated on every screen and land in the content. The link is four details and almost nobody gets all four. The link has to be the first focusable thing in the document. The link has to be invisible until it takes focus and visible the moment it does. And its target has to be focusable programmatically, or focus never moves. Arena owns all four, and the consumer owns only the words. The link points at the ArenaMain on the page, by an id Arena writes on both sides, so nothing is coordinated at the call site. A page has one main landmark, which is what makes a fixed id right here and wrong almost everywhere else. Place the link first in the shell, above the header and the nav bars it exists to skip, which is the one thing it cannot do for itself. | `label*` | [`ArenaSkipLink.prompt.md`](./arena-skip-link/ArenaSkipLink.prompt.md) |

11 layout components in this layer.
