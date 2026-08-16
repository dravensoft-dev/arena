<!-- GENERATED from the contracts by bun run generate:skills. Edit the contracts, not this file. -->

# Arena display components, the React layer

Every display component this layer ships, under the names it binds them to. **This page is an
index, not a manual.** How to write one is its own prompt, linked in the last column.

**The rules every component below answers to are stated in
[`../../../../SKILL.md`](../../../../SKILL.md) before any component here**, and nothing on this
page restates them.

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
| `ArenaActivityFeed` | An event feed: someone did something to something, then. Arena draws every row. | `label*` `items*` `busy` | [`ArenaActivityFeed.prompt.md`](./arena-activity-feed/ArenaActivityFeed.prompt.md) |
| `ArenaAvatar` | A person or entity mark: the image when `src` is set, initials from `name` otherwise, with an optional presence dot. | `src` `name` `size` `shape` `status` | [`ArenaAvatar.prompt.md`](./arena-avatar/ArenaAvatar.prompt.md) |
| `ArenaBadge` | Status label: mono, uppercase, short. Carries an object's actual state or an editorial emphasis, never decoration. | `children` `tone` `dot` | [`ArenaBadge.prompt.md`](./arena-badge/ArenaBadge.prompt.md) |
| `ArenaCalendar` | Week or day schedule on a time grid. Colour is identity, never state. | `children` `timeZone` `anchorDate` `view` `dayStart` `dayEnd` `weekStartsOn` `hideEmptyWeekend` `dayInteractive` `onDateClick` `onRangeChange` `actions` | [`ArenaCalendar.prompt.md`](./arena-calendar/ArenaCalendar.prompt.md) |
| `ArenaCalendarEvent` | One event on an ArenaCalendar's schedule. Times are ISO datetimes read in the calendar's timeZone, never the reader's. ArenaCalendar draws the chip; the consumer writes one of these per event and ArenaCalendar settles where it goes. | `id*` `title*` `start*` `end*` `colorId` `interactive` `actionsEnabled` `actions` `disabled` `onClick` | [`ArenaCalendarEvent.prompt.md`](./arena-calendar-event/ArenaCalendarEvent.prompt.md) |
| `ArenaCard` | Surface container. Hairline border on the base surface scale; depth comes from the shadow, never a gradient. | `children` `interactive` `disabled` `href` `action` `title` `eyebrow` `floating` `accent` `onClick` | [`ArenaCard.prompt.md`](./arena-card/ArenaCard.prompt.md) |
| `ArenaKeyValue` | A list of terms and the values against them, with an optional summed row ruled off at the bottom: a basket summary, an order, an invoice, a panel of facts about a resource. It renders a real definition list, so the association between a term and its value is the platform's rather than a class name's. | `rows*` `total` | [`ArenaKeyValue.prompt.md`](./arena-key-value/ArenaKeyValue.prompt.md) |
| `ArenaPeopleList` | A list of people, each row a face with a name and, where the list is about a quantity, a figure beside it. Standings, assignees, members, suggestions. The list owns the semantics and the row size; a row owns what it says. | `label*` `ordered` `size` `children` | [`ArenaPeopleList.prompt.md`](./arena-people-list/ArenaPeopleList.prompt.md) |
| `ArenaPersonRow` | One person in an ArenaPeopleList: a face, a name, an optional line under it, an optional position in front and an optional figure behind. Its size comes from the list rather than from here. | `name*` `src` `secondary` `rank` `figure` `current` `action` | [`ArenaPersonRow.prompt.md`](./arena-person-row/ArenaPersonRow.prompt.md) |
| `ArenaSkeleton` | A loading placeholder that reserves the space real content will take. | `variant` `width` `height` `lines` `radius` | [`ArenaSkeleton.prompt.md`](./arena-skeleton/ArenaSkeleton.prompt.md) |
| `ArenaStatCard` | One metric on a card surface: a micro-label, the number, an optional delta pill and a sub-line. | `label*` `value*` `tone` `delta` `sub` `icon` | [`ArenaStatCard.prompt.md`](./arena-stat-card/ArenaStatCard.prompt.md) |
| `ArenaTable` | Data table on the density tokens. ArenaTable draws the header row from `columns`, owns the grid and its keyboard, and decides where each row sits; the consumer writes one ArenaTableRow per row and one ArenaTableCell per cell, so a cell's content is a value or one of Arena's own components rather than something returned from a per-item render function. Below --bp-md it becomes one card per row, measured on its own container rather than the viewport. | `label*` `columns*` `children` `empty` `sort` `onSortChange` `page` `onPageChange` `pageControl` `sortControl` `responsive` | [`ArenaTable.prompt.md`](./arena-table/ArenaTable.prompt.md) |
| `ArenaTableCell` | One cell of an ArenaTableRow. It draws the cell box (the padding, the alignment and the mono/gold treatment its column asks for, and in card mode the label/value pair or the full-width block), and shows whatever the consumer put in it. Its column config, its layout and its place in the grid's keyboard order come from ArenaTable and ArenaTableRow and are members of no contract. | `children` | [`ArenaTableCell.prompt.md`](./arena-table-cell/ArenaTableCell.prompt.md) |
| `ArenaTableRow` | One row of an ArenaTable. The consumer writes one per row and one ArenaTableCell inside it per cell. Where the row sits, the columns its cells are set against and how the keyboard reaches them are ArenaTable's, not this component's, and are members of no contract: the same shape, and for the same reason, as an ArenaRadioGroup and its Radios sharing which one is checked. | `children` `interactive` `disabled` `onClick` | [`ArenaTableRow.prompt.md`](./arena-table-row/ArenaTableRow.prompt.md) |
| `ArenaTag` | A pill for filters, technologies and statuses. A tone for what state a thing is in or a ramp slot for which thing it is, and an optional dismiss. | `children` `tone` `colorId` `removable` `disabled` `onRemove` | [`ArenaTag.prompt.md`](./arena-tag/ArenaTag.prompt.md) |
| `ArenaUnauthCard` | The panel a signed-out screen needs: sign in, check your inbox, this link expired, a two-factor code. It knows nothing about credentials on purpose; the fields are composed inside it. | `brand` `eyebrow` `title` `children` `footer` | [`ArenaUnauthCard.prompt.md`](./arena-unauth-card/ArenaUnauthCard.prompt.md) |

16 display components in this layer.
