<!-- GENERATED from the contracts by bun run generate:skills. Edit the contracts, not this file. -->

# Arena components, the Angular layer

Every component this layer ships, by category, under the names it binds them to. **This page is
an index, not a manual.** How to write one is its own prompt, linked in the last column.

Import from the package root, never from a path inside it:

```ts
import { ArenaButton, ArenaTag } from '@dravensoft/arena-angular';
```

Every component is standalone: put its class in the host component's `imports`, then write its
`arena-` element. A member is a signal input, an event is an output under the name the contract
gives it, and the main slot is content projection. A named slot is a marker directive, which goes
in `imports` as well, because a component cannot tell an un-imported marker from an unfilled
slot. An icon is a Phosphor class-name string, never an element.

- **Which voice this application takes, which is decided before any component here**:
  [`../../SKILL.md`](../../SKILL.md). Every component below answers to it without being told, so
  a screen built without picking one is built in the default voice by accident rather than on
  purpose.
- Installing the package, declaring your skin, and what it exports besides components:
  [`PACKAGE.md`](./PACKAGE.md).
- Whether a component exists at all, including any this layer does not ship:
  [`../SKILL.md`](../SKILL.md).
- **Takes** is the members the component's API contract declares, in contract order, under this
  layer's own names. A member marked `*` is required; the prompt gives its type and its default.
- **A member whose type is an object or an enum takes one this package exports.** The prompt
  names the type and says what it is for; the fields it holds are in the type declaration itself,
  which `import type { … } from '@dravensoft/arena-angular'` brings in. That field list is in neither
  the prompt nor the contract, so the type is where you read it.

## brand

| Component | What it is | Takes | Usage |
|---|---|---|---|
| `ArenaAppLogo` | Brand lock-up: a mark beside or above a product name. | `mark*` `name*` `dim` `size` `orientation` | [`ArenaAppLogo.prompt.md`](./components/brand/arena-app-logo/ArenaAppLogo.prompt.md) |

## charts

| Component | What it is | Takes | Usage |
|---|---|---|---|
| `ArenaBarChart` | Categorical bars on one axis. Dependency-free SVG that reads the token layer directly, with a visually-hidden table of the same numbers. | `labels*` `series*` `label*` `stack` `valueSuffix` `valuePrefix` `valueFormat` `height` `minPointSpacing` | [`ArenaBarChart.prompt.md`](./components/charts/arena-bar-chart/ArenaBarChart.prompt.md) |
| `ArenaChartCard` | A titled card frame around a chart, with an optional actions slot in its head. | `title` `actions` `content` | [`ArenaChartCard.prompt.md`](./components/charts/arena-chart-card/ArenaChartCard.prompt.md) |
| `ArenaDoughnutChart` | Parts of one whole, as a ring with a legend beside it. Identity only: a slice is a category by definition, so there is no tone. Dependency-free SVG with a visually-hidden table of the same numbers. | `labels*` `series*` `label*` `valueSuffix` `valuePrefix` `shape` `legendLayout` `sliceActivate` `valueFormat` | [`ArenaDoughnutChart.prompt.md`](./components/charts/arena-doughnut-chart/ArenaDoughnutChart.prompt.md) |
| `ArenaHorizontalBarChart` | Categorical bars running across the plot, with the categories down its left edge. The same data and the same table as ArenaBarChart with the axes transposed, which is a different component rather than an orientation flag because transposing changes what four of its members mean: the cursor answers the vertical arrows, the category gutter is its own token, height becomes the axis the data grows along, and there is no scrolling rail. | `labels*` `series*` `label*` `stack` `valueSuffix` `valuePrefix` `valueFormat` `height` | [`ArenaHorizontalBarChart.prompt.md`](./components/charts/arena-horizontal-bar-chart/ArenaHorizontalBarChart.prompt.md) |
| `ArenaLineChart` | One series over an ordered sequence, on one axis. Dependency-free SVG with a crosshair that snaps to the nearest point, and a visually-hidden table of the same numbers. | `labels*` `series*` `label*` `area` `curve` `valueSuffix` `valuePrefix` `valueFormat` `height` `minPointSpacing` | [`ArenaLineChart.prompt.md`](./components/charts/arena-line-chart/ArenaLineChart.prompt.md) |
| `ArenaPyramidChart` | A population pyramid: two counts per band, mirrored about a shared centre line, with the band names down the left edge. Diverging from a centre is the whole point rather than an option, which is why the two-series rule and the mirrored axis are the component instead of a flag on a bar chart. Dependency-free SVG with a visually-hidden table of the same numbers. | `labels*` `series*` `label*` `valueSuffix` `valuePrefix` `valueFormat` `height` | [`ArenaPyramidChart.prompt.md`](./components/charts/arena-pyramid-chart/ArenaPyramidChart.prompt.md) |
| `ArenaRadarChart` | Several measures on one shape: an axis per label around a polar grid, one closed polygon per series. Reads a profile rather than a magnitude, which is what makes it a different chart from bars over the same numbers. Dependency-free SVG with a visually-hidden table of the same numbers. | `labels*` `series*` `label*` `fill` `valueSuffix` `valuePrefix` `valueFormat` `height` | [`ArenaRadarChart.prompt.md`](./components/charts/arena-radar-chart/ArenaRadarChart.prompt.md) |
| `ArenaScatterChart` | Two quantities against each other, one mark per pair, and a third as the mark's size when a series carries one. The first chart here whose horizontal axis carries a value rather than a position, which is why it takes a series of parallel measurements and names every axis it draws. Dependency-free SVG with a visually-hidden table of the same numbers. | `series*` `label*` `xLabel*` `yLabel*` `sizeLabel` `sizeLegend` `valueSuffix` `valuePrefix` `valueFormat` `height` | [`ArenaScatterChart.prompt.md`](./components/charts/arena-scatter-chart/ArenaScatterChart.prompt.md) |

## display

| Component | What it is | Takes | Usage |
|---|---|---|---|
| `ArenaActivityFeed` | An event feed: someone did something to something, then. Arena draws every row. | `label*` `items*` `busy` | [`ArenaActivityFeed.prompt.md`](./components/display/arena-activity-feed/ArenaActivityFeed.prompt.md) |
| `ArenaAvatar` | A person or entity mark: the image when `src` is set, initials from `name` otherwise, with an optional presence dot. | `src` `name` `size` `shape` `status` | [`ArenaAvatar.prompt.md`](./components/display/arena-avatar/ArenaAvatar.prompt.md) |
| `ArenaBadge` | Status label: mono, uppercase, short. Carries an object's actual state or an editorial emphasis, never decoration. | `content` `tone` `dot` | [`ArenaBadge.prompt.md`](./components/display/arena-badge/ArenaBadge.prompt.md) |
| `ArenaCalendar` | Week or day schedule on a time grid. Colour is identity, never state. | `content` `timeZone` `anchorDate` `view` `dayStart` `dayEnd` `weekStartsOn` `hideEmptyWeekend` `dayInteractive` `dateClick` `rangeChange` `actions` | [`ArenaCalendar.prompt.md`](./components/display/arena-calendar/ArenaCalendar.prompt.md) |
| `ArenaCalendarEvent` | One event on an ArenaCalendar's schedule. Times are ISO datetimes read in the calendar's timeZone, never the reader's. ArenaCalendar draws the chip; the consumer writes one of these per event and ArenaCalendar settles where it goes. | `id*` `title*` `start*` `end*` `colorId` `interactive` `actionsEnabled` `actions` `disabled` `click` | [`ArenaCalendarEvent.prompt.md`](./components/display/arena-calendar-event/ArenaCalendarEvent.prompt.md) |
| `ArenaCard` | Surface container. Hairline border on the base surface scale; depth comes from the shadow, never a gradient. | `content` `interactive` `disabled` `href` `action` `title` `eyebrow` `floating` `accent` `click` | [`ArenaCard.prompt.md`](./components/display/arena-card/ArenaCard.prompt.md) |
| `ArenaSkeleton` | A loading placeholder that reserves the space real content will take. | `variant` `width` `height` `lines` `radius` | [`ArenaSkeleton.prompt.md`](./components/display/arena-skeleton/ArenaSkeleton.prompt.md) |
| `ArenaStatCard` | One metric on a card surface: a micro-label, the number, an optional delta pill and a sub-line. | `label*` `value*` `tone` `delta` `sub` `icon` | [`ArenaStatCard.prompt.md`](./components/display/arena-stat-card/ArenaStatCard.prompt.md) |
| `ArenaTable` | Data table on the density tokens. ArenaTable draws the header row from `columns`, owns the grid and its keyboard, and decides where each row sits; the consumer writes one ArenaTableRow per row and one ArenaTableCell per cell, so a cell's content is a value or one of Arena's own components rather than something returned from a per-item render function. Below --bp-md it becomes one card per row, measured on its own container rather than the viewport. | `label*` `columns*` `content` `empty` `sort` `sortChange` `page` `pageChange` `pageControl` `sortControl` `responsive` | [`ArenaTable.prompt.md`](./components/display/arena-table/ArenaTable.prompt.md) |
| `ArenaTableCell` | One cell of an ArenaTableRow. It draws the cell box (the padding, the alignment and the mono/gold treatment its column asks for, and in card mode the label/value pair or the full-width block), and shows whatever the consumer put in it. Its column config, its layout and its place in the grid's keyboard order come from ArenaTable and ArenaTableRow and are members of no contract. | `content` | [`ArenaTableCell.prompt.md`](./components/display/arena-table-cell/ArenaTableCell.prompt.md) |
| `ArenaTableRow` | One row of an ArenaTable. The consumer writes one per row and one ArenaTableCell inside it per cell. Where the row sits, the columns its cells are set against and how the keyboard reaches them are ArenaTable's, not this component's, and are members of no contract: the same shape, and for the same reason, as an ArenaRadioGroup and its Radios sharing which one is checked. | `content` `interactive` `disabled` `click` | [`ArenaTableRow.prompt.md`](./components/display/arena-table-row/ArenaTableRow.prompt.md) |
| `ArenaTag` | A pill for filters, technologies and statuses. Optional tone, optional dismiss. | `content` `tone` `removable` `disabled` `remove` | [`ArenaTag.prompt.md`](./components/display/arena-tag/ArenaTag.prompt.md) |
| `ArenaUnauthCard` | The panel a signed-out screen needs: sign in, check your inbox, this link expired, a two-factor code. It knows nothing about credentials on purpose; the fields are composed inside it. | `brand` `eyebrow` `title` `content` `footer` | [`ArenaUnauthCard.prompt.md`](./components/display/arena-unauth-card/ArenaUnauthCard.prompt.md) |

## feedback

| Component | What it is | Takes | Usage |
|---|---|---|---|
| `ArenaAlert` | A tone-coloured message with an optional icon, a single action, and optional dismissal. | `tone` `title` `content` `icon` `actionLabel` `action` `dismissible` `close` | [`ArenaAlert.prompt.md`](./components/feedback/arena-alert/ArenaAlert.prompt.md) |
| `ArenaConfirmDialog` | Confirmation of a high-consequence action. Never closes on click-outside. `requireText` locks the confirm button until a word is typed. | `open*` `title*` `eyebrow` `content` `confirmLabel` `cancelLabel` `destructive` `requireText` `cancel` `confirm` | [`ArenaConfirmDialog.prompt.md`](./components/feedback/arena-confirm-dialog/ArenaConfirmDialog.prompt.md) |
| `ArenaDialog` | Modal dialog over a blurred scrim. Takes the whole interaction until dismissed. | `open*` `title*` `eyebrow` `width` `content` `footer` `close` | [`ArenaDialog.prompt.md`](./components/feedback/arena-dialog/ArenaDialog.prompt.md) |
| `ArenaEmptyState` | A placeholder for an empty collection: an icon, a title, a message, and an optional action. | `icon` `title*` `message` `action` | [`ArenaEmptyState.prompt.md`](./components/feedback/arena-empty-state/ArenaEmptyState.prompt.md) |
| `ArenaErrorState` | Section/screen-level failure, with recovery and an optional diagnostic code. | `icon` `title` `message` `code` `retryLabel` `retry` `secondaryAction` | [`ArenaErrorState.prompt.md`](./components/feedback/arena-error-state/ArenaErrorState.prompt.md) |
| `ArenaOnboarding` | Guided coachmark tour (H10): presents features within the product with progress dots, Skip and Next. Controlled: the host owns index and answers the four events. | `open*` `steps*` `index` `anchor` `next` `back` `skip` `done` | [`ArenaOnboarding.prompt.md`](./components/feedback/arena-onboarding/ArenaOnboarding.prompt.md) |
| `ArenaProgressBar` | Determinate progress by default; indeterminate for a wait with no percentage. | `progressPercentage` `indeterminate` `tone` `label*` `showPercentage` `size` | [`ArenaProgressBar.prompt.md`](./components/feedback/arena-progress-bar/ArenaProgressBar.prompt.md) |
| `ArenaSheet` | A non-modal panel anchored to one edge of the page: a cart, a filter drawer, a detail pane. It carries no scrim, traps no focus and takes nothing away from the page behind it, which is the whole difference from a dialog. Its header stays on screen while its body folds away, so a reader keeps the panel without keeping its bulk. | `open*` `placement` `title*` `collapsed` `collapsedChange` `dismissible` `close` `content` `footer` | [`ArenaSheet.prompt.md`](./components/feedback/arena-sheet/ArenaSheet.prompt.md) |
| `ArenaSpinner` | Indeterminate wait indicator. For a measurable process use ArenaProgressBar instead. | `size` `tone` `label` | [`ArenaSpinner.prompt.md`](./components/feedback/arena-spinner/ArenaSpinner.prompt.md) |
| `ArenaToast` | Ephemeral notification with a tone-coloured side bar and one optional action. | `title` `message` `tone` `actionLabel` `action` `persist` `dismissible` `close` | [`ArenaToast.prompt.md`](./components/feedback/arena-toast/ArenaToast.prompt.md) |
| `ArenaToastHost` | The fixed box a stack of notices renders into. It decides where the stack sits, how far it stands off the viewport edges and how much air separates two notices, and it decides nothing else: it reads no notice, counts none, and owns no clock. | `placement` `content` | [`ArenaToastHost.prompt.md`](./components/feedback/arena-toast-host/ArenaToastHost.prompt.md) |
| `ArenaTooltip` | A short label revealed on pointer intent. Bone over dark for contrast. It waits before appearing and before withdrawing, so a pointer crossing a toolbar reveals nothing. | `label*` `content*` | [`ArenaTooltip.prompt.md`](./components/feedback/arena-tooltip/ArenaTooltip.prompt.md) |

## forms

| Component | What it is | Takes | Usage |
|---|---|---|---|
| `ArenaButton` | Action button. One primary per view; danger stays outline. | `content` `variant` `size` `icon` `iconRight` `loading` `full` `disabled` `type` `name` `value` `autoFocus` `form` `tabStop` `click` | [`ArenaButton.prompt.md`](./components/forms/arena-button/ArenaButton.prompt.md) |
| `ArenaCheckbox` | A single checkbox. Checked shows a crimson fill with a check. | `checked` `label` `disabled` `required` `name` `value` `change` | [`ArenaCheckbox.prompt.md`](./components/forms/arena-checkbox/ArenaCheckbox.prompt.md) |
| `ArenaIconButton` | Icon-only button. Carries an accessible name in every state, not only on hover. | `icon*` `label*` `size` `variant` `showLabel` `pressed` `disabled` `type` `name` `value` `autoFocus` `form` `tabStop` `click` | [`ArenaIconButton.prompt.md`](./components/forms/arena-icon-button/ArenaIconButton.prompt.md) |
| `ArenaInput` | Text field with validation. Focus is a gold ring; error crimson; valid green with a check. The four states are ordered and the order is normative: error, then focus, then valid, then neutral: an errored field stays crimson while it has focus, because the validation signal must not disappear at the moment the user acts on it. | `label` `id` `hint` `error` `valid` `required` `validate` `validateOn` `type` `icon` `prefix` `value` `disabled` `readOnly` `placeholder` `name` `autoComplete` `min` `max` `step` `maxLength` `pattern` `change` `blur` | [`ArenaInput.prompt.md`](./components/forms/arena-input/ArenaInput.prompt.md) |
| `ArenaRadio` | One option inside an ArenaRadioGroup. Selected shows a crimson dot inside the ring. | `value*` `label` `hint` `disabled` | [`ArenaRadio.prompt.md`](./components/forms/arena-radio/ArenaRadio.prompt.md) |
| `ArenaRadioGroup` | Single-selection group. Governs the value and distributes it to its child Radios. | `ariaLabel*` `content` `value` `name` `change` | [`ArenaRadioGroup.prompt.md`](./components/forms/arena-radio-group/ArenaRadioGroup.prompt.md) |
| `ArenaSelect` | Styled native dropdown selector, with the same validation vocabulary ArenaInput carries. The four states are ordered and the order is the same normative one: error, then focus, then valid, then neutral -- an errored control stays crimson while it has focus, because the validation signal must not disappear at the moment the user acts on it. A form that mixes ArenaInput and ArenaSelect is a form whose fields must report a failure the same way, or it gets validated by hand or not at all. | `label` `placeholder` `options` `value` `disabled` `required` `hint` `error` `valid` `icon` `name` `change` | [`ArenaSelect.prompt.md`](./components/forms/arena-select/ArenaSelect.prompt.md) |
| `ArenaSwitch` | A controlled on/off switch showing an icon per state. `confirm` gates a high-impact change through an ArenaConfirmDialog before it applies. | `state` `orientation` `size` `iconOn` `iconOff` `label*` `disabled` `confirm` `funcOn` `funcOff` `requestChange` | [`ArenaSwitch.prompt.md`](./components/forms/arena-switch/ArenaSwitch.prompt.md) |
| `ArenaTextarea` | Multi-line text field with validation and an optional counter. | `label` `id` `hint` `error` `required` `counter` `autoResize` `value` `disabled` `readOnly` `placeholder` `name` `maxLength` `rows` `change` | [`ArenaTextarea.prompt.md`](./components/forms/arena-textarea/ArenaTextarea.prompt.md) |

## layout

| Component | What it is | Takes | Usage |
|---|---|---|---|
| `ArenaGrid` | A grid that decides its own column count from the room it is given, rather than from a breakpoint anyone had to pick. Cells are as wide as they can be at or above a minimum, and the count falls as the room does, all the way to one. | `min` `gap` `maxWidth` `content` | [`ArenaGrid.prompt.md`](./components/layout/arena-grid/ArenaGrid.prompt.md) |

## navigation

| Component | What it is | Takes | Usage |
|---|---|---|---|
| `ArenaBottomNav` | The bar of destinations pinned to the bottom edge of a phone screen. A compound component: the consumer writes one ArenaBottomNavItem per destination, and the coordination that tells each child which id is active and how to report `nav` is the parent's. That coordination is a member of no contract and each layer wires it in its own idiom. It is a row of equal columns with the glyph above the label, which is what separates it from a sidebar's stack of indented rows. | `active` `ariaLabel*` `content` `nav` | [`ArenaBottomNav.prompt.md`](./components/navigation/arena-bottom-nav/ArenaBottomNav.prompt.md) |
| `ArenaBottomNavItem` | One destination in an ArenaBottomNav. The consumer writes one per destination; which id is currently active and how it reports `nav` are settled between it and its parent, and none of that is a member of this contract, the same shape and the same reason as ArenaSideNavItem and as the name an ArenaRadioGroup settles with each ArenaRadio. It draws its glyph above its label and takes an equal share of the bar's width, however many destinations there are. | `id*` `label*` `icon*` `badge` `href` `disabled` | [`ArenaBottomNavItem.prompt.md`](./components/navigation/arena-bottom-nav-item/ArenaBottomNavItem.prompt.md) |
| `ArenaBreadcrumbs` | A trail of ancestor locations ending at the current one. An explicit return path for hierarchies deeper than tabs. | `ariaLabel*` `items*` `separator` `navigate` | [`ArenaBreadcrumbs.prompt.md`](./components/navigation/arena-breadcrumbs/ArenaBreadcrumbs.prompt.md) |
| `ArenaBulkActionBar` | Appears when rows are selected and operates on the selection as a set. Renders nothing at a count of zero. | `count*` `noun` `actions*` `run` `layout` `clearable` `clear` | [`ArenaBulkActionBar.prompt.md`](./components/navigation/arena-bulk-action-bar/ArenaBulkActionBar.prompt.md) |
| `ArenaCommandPalette` | Power-user accelerator (Cmd/Ctrl+K): search and run actions without a mouse. Controlled: the host owns whether it is open. | `open*` `commands*` `placeholder` `maxResults` `close` `run` | [`ArenaCommandPalette.prompt.md`](./components/navigation/arena-command-palette/ArenaCommandPalette.prompt.md) |
| `ArenaMenu` | Dropdown menu of actions on a trigger -- overflow, more actions, context. | `trigger*` `items*` `align` `select` | [`ArenaMenu.prompt.md`](./components/navigation/arena-menu/ArenaMenu.prompt.md) |
| `ArenaPageHead` | A page heading: a required title, an optional subtitle, and an optional actions slot. | `title*` `subtitle` `actions` `align` | [`ArenaPageHead.prompt.md`](./components/navigation/arena-page-head/ArenaPageHead.prompt.md) |
| `ArenaPagination` | Page selector for a paged list. Renders a windowed range, never every page. | `page*` `pageCount*` `ariaLabel*` `change` | [`ArenaPagination.prompt.md`](./components/navigation/arena-pagination/ArenaPagination.prompt.md) |
| `ArenaSegmentedControl` | A compact inline filter over mutually exclusive options. A real radio group, never a tab list, and it carries no crimson. | `options*` `value` `defaultValue` `size` `ariaLabel*` `name` `change` | [`ArenaSegmentedControl.prompt.md`](./components/navigation/arena-segmented-control/ArenaSegmentedControl.prompt.md) |
| `ArenaSideNav` | The sidebar's navigation list -- the list alone, not the frame around it. A compound component: the consumer writes one ArenaSideNavItem per destination, and the coordination that tells each child where it sits, which id is active and how to report `nav` is the parent's. That coordination is a member of no contract and each layer wires it in its own idiom. | `active` `ariaLabel*` `content` `indentStep` `nav` | [`ArenaSideNav.prompt.md`](./components/navigation/arena-side-nav/ArenaSideNav.prompt.md) |
| `ArenaSideNavCollapsible` | A named group inside an ArenaSideNav that shows and hides its own contents. It may contain items, sections and further collapsibles to any depth; the indent compounds with depth, which is why ArenaSideNav.indentStep is a step rather than a total. It binds the `disclosure` pattern and deliberately does NOT claim to be a treeview: there is no aria-level, no roving tab stop and no arrow navigation, because each collapsible is an independent disclosure. Its expanded state lives in the component, seeded by defaultExpanded, and it additionally opens itself when it COMES TO HOLD ArenaSideNav.active -- a transition, not a standing condition, which is what leaves a user free to collapse a group again while the route stays inside it. Implicit behaviour, stated here and in its .prompt.md rather than left to be discovered. | `id*` `label*` `icon` `defaultExpanded` `content` `toggle` | [`ArenaSideNavCollapsible.prompt.md`](./components/navigation/arena-side-nav-collapsible/ArenaSideNavCollapsible.prompt.md) |
| `ArenaSideNavItem` | One destination in an ArenaSideNav. The consumer writes one per destination; the nesting depth it sits at, which id is currently active and how it reports `nav` are settled between it and its parent, and none of that is a member of this contract -- the same shape, and the same reason, as the name, checked state and selection callback an ArenaRadioGroup settles with each ArenaRadio. It used to be api/types/side-nav-item.json, a predefined object Arena read out of an array; it is an element the consumer writes now, which is what makes a section, a collapsible and arbitrary nesting expressible at all. | `id*` `label*` `icon` `disabled` `badge` `href` | [`ArenaSideNavItem.prompt.md`](./components/navigation/arena-side-nav-item/ArenaSideNavItem.prompt.md) |
| `ArenaSideNavSection` | A named group of navigation items inside an ArenaSideNav. It wraps what the consumer wrote and never replaces it; its accessible name is the same heading a sighted user reads. A section always has children -- a childless one is guarded against at runtime, because two shapes would be one more thing a single behaviour binding cannot describe. Having sections at all is optional: loose SideNavItems at the root are legal and may sit beside them. | `label*` `content*` | [`ArenaSideNavSection.prompt.md`](./components/navigation/arena-side-nav-section/ArenaSideNavSection.prompt.md) |
| `ArenaTab` | One tab in an ArenaTabs strip, and the panel it shows. ArenaTab draws the button; its content fills the tabpanel ArenaTabs renders beside the tablist. | `value*` `label*` `content` | [`ArenaTab.prompt.md`](./components/navigation/arena-tab/ArenaTab.prompt.md) |
| `ArenaTabs` | A row of tabs and the one panel they switch between. Write one `ArenaTab` per view; ArenaTabs renders the tablist, the panel, and the keyboard. | `content` `value` `defaultValue` `change` | [`ArenaTabs.prompt.md`](./components/navigation/arena-tabs/ArenaTabs.prompt.md) |

59 components across 7 categories in this layer.
