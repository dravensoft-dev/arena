<!-- GENERATED from the contracts by bun run generate:skills. Edit the contracts, not this file. -->

# Arena layout components, the Angular layer

Every layout component this layer ships, under the names it binds them to. **This page is an
index, not a manual.** How to write one is its own prompt, linked in the last column.

**The voice this application takes, and the rules every component below answers to, are decided in
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
| `ArenaGrid` | A grid that decides its own column count from the room it is given, rather than from a breakpoint anyone had to pick. Cells are as wide as they can be at or above a minimum, and the count falls as the room does, all the way to one. | `min` `gap` `maxWidth` `content` | [`ArenaGrid.prompt.md`](./arena-grid/ArenaGrid.prompt.md) |

1 layout components in this layer.
