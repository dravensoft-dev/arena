<!-- GENERATED from the contracts by bun run generate:skills. Edit the contracts, not this file. -->

# Arena layout components, the React layer

Every layout component this layer ships, under the names it binds them to. **This page is an
index, not a manual.** How to write one is its own prompt, linked in the last column.

**The voice this application takes, and the rules every component below answers to, are decided in
[`../../../../SKILL.md`](../../../../SKILL.md) before any component here**, and nothing on this
page restates them.

Import from the package root, never from a path inside it:

```tsx
import { ArenaButton, ArenaTag } from '@dravensoft/arena-react';
```

A member is a prop. The main slot is `children`, a named slot is a prop taking a node, and an
event is an `on`-prefixed handler. An icon is a Phosphor class-name string, never an element.

- Every other category this layer ships: [`../../SKILL.md`](../../SKILL.md).
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
| `ArenaGrid` | A grid that decides its own column count from the room it is given, rather than from a breakpoint anyone had to pick. Cells are as wide as they can be at or above a minimum, and the count falls as the room does, all the way to one. | `min` `gap` `maxWidth` `children` | [`ArenaGrid.prompt.md`](./arena-grid/ArenaGrid.prompt.md) |
| `ArenaScroller` | A row that scrolls sideways because it holds more than fits, with no arrows pretending to be a slideshow. It is one tab stop carrying a group role and a name, which is what a scrolling region needs to be reachable by keyboard at all: without it, everything past the right edge belongs to the pointer alone. Each child is laid out at one width so the row reads as a rail rather than as a line of whatever the children happened to measure. | `label*` `children*` `itemWidth` `behaviour` | [`ArenaScroller.prompt.md`](./arena-scroller/ArenaScroller.prompt.md) |
| `ArenaScrollerItem` | One cell of an ArenaScroller: the box that carries the width the row decided and the point the row settles on. It exists because a row cannot reach inside its children to size them, and a child that is an Arena component may render no box of its own at all, so a rule aimed at the row's direct children lands on nothing in one layer and on the card in the other. The item is the box both layers agree about. | `children` | [`ArenaScrollerItem.prompt.md`](./arena-scroller-item/ArenaScrollerItem.prompt.md) |
| `ArenaSection` | A named region of a page: a heading, optionally an eyebrow above it, a line under it and an action beside it, over whatever the region holds. It wraps what the consumer wrote and never replaces it. The title register is the section one, a step above a card's and a step below a page's, so a voice re-pitching the hierarchy moves this with the other two rather than leaving a page with three heads that disagree. | `title*` `children*` `eyebrow` `description` `action` `rhythm` | [`ArenaSection.prompt.md`](./arena-section/ArenaSection.prompt.md) |

4 layout components in this layer.
