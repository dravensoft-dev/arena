<!-- GENERATED from the contracts by bun run generate:skills. Edit the contracts, not this file. -->

# Arena feedback components, the Angular layer

Every feedback component this layer ships, under the names it binds them to. **This page is an
index, not a manual.** How to write one is its own prompt, linked in the last column.

**The rules every component below answers to are stated in
[`../../../../skills/design/SKILL.md`](../../../../skills/design/SKILL.md) before any component
here**, and nothing on this page restates them.

Import from the package root, never from a path inside it:

```ts
import { ArenaButton, ArenaTag } from '@dravensoft/arena-angular';
```

Every component is standalone: put its class in the host component's `imports`, then write its
`arena-` element. A member is a signal input, an event is an output under the name the contract
gives it, and the main slot is content projection. A named slot is a marker directive, and it goes
in `imports` as well. A component cannot tell an un-imported marker from an unfilled slot. An icon is a Phosphor class-name string, drawn by Arena's components or by ArenaIcon; a raw ph-* element paints nothing.

- Every other category this layer ships: [`../../INDEX.md`](../../INDEX.md).
- Installing the package, declaring your skin, and what it exports besides components:
  [`install.md`](../../../../skills/design/references/install.md),
  [`config.md`](../../../../skills/design/references/config.md) and
  [`exports.md`](../../../../skills/design/references/exports.md).
- **Takes** is the members the component's API contract declares, in contract order, under this
  layer's own names. A member marked `*` is required; the prompt gives its type and its default.
- **A member whose type is an object or an enum takes one this package exports.** The prompt
  names the type and says what it is for; the fields it holds are in the type declaration itself,
  which `import type { … } from '@dravensoft/arena-angular'` brings in. That field list is in neither
  the prompt nor the contract, so the type is where you read it.

| Component | What it is | Takes | Usage |
|---|---|---|---|
| `ArenaAlert` | A tone-coloured message with an optional icon, a single action, and optional dismissal. | `tone` `title` `content` `icon` `actionLabel` `action` `dismissible` `close` | [`ArenaAlert.prompt.md`](./arena-alert/ArenaAlert.prompt.md) |
| `ArenaConfirmDialog` | Confirmation of a high-consequence action. Never closes on click-outside. `requireText` locks the confirm button until a word is typed. | `open*` `title*` `eyebrow` `content` `confirmLabel` `cancelLabel` `destructive` `requireText` `cancel` `confirm` | [`ArenaConfirmDialog.prompt.md`](./arena-confirm-dialog/ArenaConfirmDialog.prompt.md) |
| `ArenaDialog` | Modal dialog over a blurred scrim. Takes the whole interaction until dismissed. | `open*` `title*` `eyebrow` `content` `footer` `fillBelow` `close` | [`ArenaDialog.prompt.md`](./arena-dialog/ArenaDialog.prompt.md) |
| `ArenaEmptyState` | A placeholder for an empty collection: an icon, a title, a message, and an optional action. | `icon` `title*` `headingLevel` `message` `action` | [`ArenaEmptyState.prompt.md`](./arena-empty-state/ArenaEmptyState.prompt.md) |
| `ArenaErrorState` | Section/screen-level failure, with recovery and an optional diagnostic code. | `icon` `title` `headingLevel` `message` `code` `retryLabel` `retry` `secondaryAction` | [`ArenaErrorState.prompt.md`](./arena-error-state/ArenaErrorState.prompt.md) |
| `ArenaMeter` | A measurement inside a known range: disk used, a quota, a score against a target. A bar that does not move as a task proceeds, so it announces nothing. Thresholds derive a standing, drawn as a word and a hue. | `label*` `value*` `min` `max` `low` `high` `optimum` `showLabel` `valueText` | [`ArenaMeter.prompt.md`](./arena-meter/ArenaMeter.prompt.md) |
| `ArenaOnboarding` | Guided coachmark tour (H10): presents features within the product with progress dots, Skip and Next. Controlled: the host owns index and answers the four events. | `open*` `steps*` `index` `anchor` `next` `back` `skip` `done` | [`ArenaOnboarding.prompt.md`](./arena-onboarding/ArenaOnboarding.prompt.md) |
| `ArenaPopover` | A small non-modal panel a trigger opens, holding content of the consumer's own: a filter form with its Apply button, a pair of dates, a paragraph that explains a figure. The page behind it stays usable, nothing is trapped, and the panel escapes a clipping ancestor. A popover is not a menu of actions and not a hover description. | `trigger*` `content*` `label*` `open` `align` `openChange` | [`ArenaPopover.prompt.md`](./arena-popover/ArenaPopover.prompt.md) |
| `ArenaProgressBar` | Determinate progress by default; indeterminate for a wait with no percentage. A bar along a row, or a ring with the figure inside it. | `content` `progressPercentage` `indeterminate` `tone` `label*` `showLabel` `showPercentage` `shape` | [`ArenaProgressBar.prompt.md`](./arena-progress-bar/ArenaProgressBar.prompt.md) |
| `ArenaSheet` | A non-modal panel anchored to one edge of the page: a cart, a filter drawer, a detail pane. The sheet carries no scrim, traps no focus and takes nothing away from the page behind it, which is the whole difference from a dialog. The sheet's header stays on screen while its body folds away, so a reader keeps the panel without keeping its bulk. | `open*` `title*` `collapsed` `collapsedChange` `dismissible` `close` `content` `footer` | [`ArenaSheet.prompt.md`](./arena-sheet/ArenaSheet.prompt.md) |
| `ArenaSpinner` | Indeterminate wait indicator. For a measurable process use ArenaProgressBar instead. | `label` | [`ArenaSpinner.prompt.md`](./arena-spinner/ArenaSpinner.prompt.md) |
| `ArenaToast` | Ephemeral notification with a tone-coloured side bar and one optional action. | `title` `message` `tone` `actionLabel` `action` `persist` `dismissible` `close` | [`ArenaToast.prompt.md`](./arena-toast/ArenaToast.prompt.md) |
| `ArenaToastHost` | The fixed box a stack of notices renders into. The host decides where the stack sits, how far it stands off the viewport edges and how much air separates two notices. The host decides nothing else: it reads no notice, counts none, and owns no clock. | `content` | [`ArenaToastHost.prompt.md`](./arena-toast-host/ArenaToastHost.prompt.md) |
| `ArenaTooltip` | A short label revealed on pointer intent. The tooltip takes the page's ink as its ground and the page's ground as its text, for contrast. The tooltip waits before appearing and before withdrawing, so a pointer crossing a toolbar reveals nothing. | `label*` `content*` | [`ArenaTooltip.prompt.md`](./arena-tooltip/ArenaTooltip.prompt.md) |

14 feedback components in this layer.
