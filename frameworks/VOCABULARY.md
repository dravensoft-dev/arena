<!-- GENERATED from frameworks/tailwind/vocabulary/ by bun run generate:vocabulary. Edit a family there, not this page. -->

# The vocabulary

**Every class you write is on this page.** A component family's class goes on the component, or on a container of yours whose components should all take it, and the class nearest the component wins, whatever order your stylesheets load in. A markup family's class goes on an element you wrote, never on a component. A class that is not on this page does nothing on an Arena component, and the audit reports it.

| Family | Reach | Options | Property | Answered by |
|---|---|---|---|---|
| [`fill`](#fill) | box | `arena-fill`, `arena-fit` (default) |  | ArenaButton, ArenaIconButton, ArenaMenu, ArenaSegmentedControl, ArenaTooltip |

## fill

Whether a component takes the width of the box it sits in or the width of its own content. An inline control fits its content wherever it is placed, including in a flex column or grid cell. An action spanning the foot of a card or a form is a decision about that one instance. Write this on the instance, or on a container whose components should all take it. The setting stops at the content of the component it reaches.

- **Options:** `arena-fill`, `arena-fit` (default).
- **Reach:** box: it reaches the nearest component, and stops at the content that component projects.
- **Answered by:** ArenaButton, ArenaIconButton, ArenaMenu, ArenaSegmentedControl, ArenaTooltip.
