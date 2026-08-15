<!-- GENERATED from the contracts by bun run generate:skills. Edit the contracts, not this file. -->

# Arena layout components, the Angular layer

Every layout component this layer ships, under the names it binds them to. **This page is an
index, not a manual.** How to write one is its own prompt, linked in the last column.

**The rules every component below answers to are stated in
[`../../../../SKILL.md`](../../../../SKILL.md) before any component here**, and nothing on this
page restates them.

Import from the package root, never from a path inside it:

```ts
import { ArenaButton, ArenaTag } from '@dravensoft/arena-angular';
```

Every component is standalone: put its class in the host component's `imports`, then write its
`arena-` element. A member is a signal input, an event is an output under the name the contract
gives it, and the main slot is content projection. A named slot is a marker directive, which goes
in `imports` as well, because a component cannot tell an un-imported marker from an unfilled
slot. An icon is a Phosphor class-name string, never an element.

- Every other category this layer ships: [`../../SKILL.md`](../../SKILL.md).
- Installing the package, declaring your skin, and what it exports besides components:
  [`../../PACKAGE.md`](../../PACKAGE.md).
- **Takes** is the members the component's API contract declares, in contract order, under this
  layer's own names. A member marked `*` is required; the prompt gives its type and its default.
- **A member whose type is an object or an enum takes one this package exports.** The prompt
  names the type and says what it is for; the fields it holds are in the type declaration itself,
  which `import type { … } from '@dravensoft/arena-angular'` brings in. That field list is in neither
  the prompt nor the contract, so the type is where you read it.

| Component | What it is | Takes | Usage |
|---|---|---|---|
| `ArenaBoard` | The frame of a board: columns side by side, as wide as the room allows and never narrower than one column's minimum, scrolling sideways when they no longer fit. It is one tab stop carrying a group role and a name, which is what a scrolling region needs to be reachable by keyboard at all. It draws no card and moves nothing: what a column holds is the consumer's, and reordering is theirs too. | `label*` `content*` `minColumn` | [`ArenaBoard.prompt.md`](./arena-board/ArenaBoard.prompt.md) |
| `ArenaBoardColumn` | One column of an ArenaBoard: a named head with a count and a control, a stack of whatever the consumer puts in it, and a footer for the one action that adds to it. The cards are the consumer's own, because a card on a board carries that product's fields and nothing general is left once they are removed. | `title*` `count` `summary` `colorId` `action` `content` `footer` | [`ArenaBoardColumn.prompt.md`](./arena-board-column/ArenaBoardColumn.prompt.md) |
| `ArenaFigure` | A framed piece of media with an optional caption: an image, a video, or a stand-in for the one that has not arrived. The frame is a shape and a corner a style plugin answers, and it clips whatever is put in it, so a wall of figures reads as a wall rather than as whatever sizes the pictures happened to be. | `media` `fallback` `overlay` `caption` `ratio` | [`ArenaFigure.prompt.md`](./arena-figure/ArenaFigure.prompt.md) |
| `ArenaGrid` | A grid that decides its own column count from the room it is given, rather than from a breakpoint anyone had to pick. Cells are as wide as they can be at or above a minimum, and the count falls as the room does, all the way to one. | `min` `gap` `maxWidth` `content` | [`ArenaGrid.prompt.md`](./arena-grid/ArenaGrid.prompt.md) |
| `ArenaHero` | The opening of a landing page: one line the page is built around, what sits above and below it, the actions it asks for, and a figure beside or behind it. Its title takes the hero register, which is the top rung of the title ladder and the only one above the page head. | `title*` `eyebrow` `lede` `actions` `figure` `layout` `align` | [`ArenaHero.prompt.md`](./arena-hero/ArenaHero.prompt.md) |
| `ArenaScroller` | A row that scrolls sideways because it holds more than fits, with no arrows pretending to be a slideshow. It is one tab stop carrying a group role and a name, which is what a scrolling region needs to be reachable by keyboard at all: without it, everything past the right edge belongs to the pointer alone. Each child is laid out at one width so the row reads as a rail rather than as a line of whatever the children happened to measure. | `label*` `content*` `itemWidth` `behaviour` | [`ArenaScroller.prompt.md`](./arena-scroller/ArenaScroller.prompt.md) |
| `ArenaScrollerItem` | One cell of an ArenaScroller: the box that carries the width the row decided and the point the row settles on. It exists because a row cannot reach inside its children to size them, and a child that is an Arena component may render no box of its own at all, so a rule aimed at the row's direct children lands on nothing in one layer and on the card in the other. The item is the box both layers agree about. | `content` | [`ArenaScrollerItem.prompt.md`](./arena-scroller-item/ArenaScrollerItem.prompt.md) |
| `ArenaSection` | A named region of a page: a heading, optionally an eyebrow above it, a line under it and an action beside it, over whatever the region holds. It wraps what the consumer wrote and never replaces it. The title register is the section one, a step above a card's and a step below a page's, so a style plugin re-pitching the hierarchy moves this with the other two rather than leaving a page with three heads that disagree. | `title*` `content*` `eyebrow` `description` `action` `rhythm` | [`ArenaSection.prompt.md`](./arena-section/ArenaSection.prompt.md) |
| `ArenaSiteFooter` | The band across the bottom of every screen: what a page says about itself once it has finished. It is the contentinfo landmark, so there is one per page, and like the bar at the top its contents line up with the page above them. | `content` `note` | [`ArenaSiteFooter.prompt.md`](./arena-site-footer/ArenaSiteFooter.prompt.md) |

9 layout components in this layer.
