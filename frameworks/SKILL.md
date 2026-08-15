<!-- GENERATED from the contracts by bun run generate:skills. Edit the contracts, not this file. -->

# Arena components

Every component Arena ships, by the category it is filed under. **This page answers one question:
whether a component exists at all, and which layers ship it.** It is not a stop on the way to
writing one: what a member is called where you are building, and how to write it, is your own
layer's index and then the component's own prompt, and reading this page first buys nothing when
you already know what you are reaching for.

**The rules of the language every component below answers to are stated in
[`../SKILL.md`](../SKILL.md) before any component on this page.** Nothing here restates them, so
a screen built from this page alone breaks the rules where nothing will report it.

| Layer | Index | Package |
|---|---|---|
| Angular | [`angular/SKILL.md`](./angular/SKILL.md) | `@dravensoft/arena-angular` |
| React | [`react/SKILL.md`](./react/SKILL.md) | `@dravensoft/arena-react` |

- **Takes** is the members its API contract declares, in contract order, under the neutral names
  the contract gives them. A member marked `*` is required. Your layer's index gives the name
  each one binds to there, and the component's own prompt gives its type and its default.
- **Behaviour** is the accessibility pattern the component binds. `none` means no pattern
  applies, which is a claim the binding argues rather than an omission.
- **Layers** is which layers ship the component today.

## brand

| Component | What it is | Takes | Behaviour | Layers |
|---|---|---|---|---|
| `ArenaAppLogo` | Brand lock-up: a mark beside or above a product name. | `mark*` `name*` `dim` `size` `orientation` | none | angular, react |

## charts

| Component | What it is | Takes | Behaviour | Layers |
|---|---|---|---|---|
| `ArenaBarChart` | Categorical bars on one axis. Dependency-free SVG that reads the token layer directly, with a visually-hidden table of the same numbers. | `labels*` `series*` `label*` `stack` `valueSuffix` `valuePrefix` `valueFormat` `height` `minPointSpacing` | figure-with-data-table | angular, react |
| `ArenaChartCard` | A titled card frame around a chart, with an optional actions slot in its head. | `title` `actions` `content` | none | angular, react |
| `ArenaDoughnutChart` | Parts of one whole, as a ring with a legend beside it. Identity only: a slice is a category by definition, so there is no tone. Dependency-free SVG with a visually-hidden table of the same numbers. | `labels*` `series*` `label*` `valueSuffix` `valuePrefix` `shape` `legendLayout` `sliceActivate` `valueFormat` | figure-with-data-table | angular, react |
| `ArenaHorizontalBarChart` | Categorical bars running across the plot, with the categories down its left edge. The same data and the same table as ArenaBarChart with the axes transposed, which is a different component rather than an orientation flag because transposing changes what four of its members mean: the cursor answers the vertical arrows, the category gutter is its own token, height becomes the axis the data grows along, and there is no scrolling rail. | `labels*` `series*` `label*` `stack` `valueSuffix` `valuePrefix` `valueFormat` `height` | figure-with-data-table | angular, react |
| `ArenaLineChart` | One series over an ordered sequence, on one axis. Dependency-free SVG with a crosshair that snaps to the nearest point, and a visually-hidden table of the same numbers. | `labels*` `series*` `label*` `area` `curve` `valueSuffix` `valuePrefix` `valueFormat` `height` `minPointSpacing` | figure-with-data-table | angular, react |
| `ArenaPyramidChart` | A population pyramid: two counts per band, mirrored about a shared centre line, with the band names down the left edge. Diverging from a centre is the whole point rather than an option, which is why the two-series rule and the mirrored axis are the component instead of a flag on a bar chart. Dependency-free SVG with a visually-hidden table of the same numbers. | `labels*` `series*` `label*` `valueSuffix` `valuePrefix` `valueFormat` `height` | figure-with-data-table | angular, react |
| `ArenaRadarChart` | Several measures on one shape: an axis per label around a polar grid, one closed polygon per series. Reads a profile rather than a magnitude, which is what makes it a different chart from bars over the same numbers. Dependency-free SVG with a visually-hidden table of the same numbers. | `labels*` `series*` `label*` `fill` `valueSuffix` `valuePrefix` `valueFormat` `height` | figure-with-data-table | angular, react |
| `ArenaScatterChart` | Two quantities against each other, one mark per pair, and a third as the mark's size when a series carries one. The first chart here whose horizontal axis carries a value rather than a position, which is why it takes a series of parallel measurements and names every axis it draws. Dependency-free SVG with a visually-hidden table of the same numbers. | `series*` `label*` `xLabel*` `yLabel*` `sizeLabel` `sizeLegend` `valueSuffix` `valuePrefix` `valueFormat` `height` | figure-with-data-table | angular, react |

## display

| Component | What it is | Takes | Behaviour | Layers |
|---|---|---|---|---|
| `ArenaActivityFeed` | An event feed: someone did something to something, then. Arena draws every row. | `label*` `items*` `busy` | feed | angular, react |
| `ArenaAvatar` | A person or entity mark: the image when `src` is set, initials from `name` otherwise, with an optional presence dot. | `src` `name` `size` `shape` `status` | none | angular, react |
| `ArenaBadge` | Status label: mono, uppercase, short. Carries an object's actual state or an editorial emphasis, never decoration. | `content` `tone` `dot` | none | angular, react |
| `ArenaCalendar` | Week or day schedule on a time grid. Colour is identity, never state. | `content` `timeZone` `anchorDate` `view` `dayStart` `dayEnd` `weekStartsOn` `hideEmptyWeekend` `dayInteractive` `dateClick` `rangeChange` `actions` | grid | angular, react |
| `ArenaCalendarEvent` | One event on an ArenaCalendar's schedule. Times are ISO datetimes read in the calendar's timeZone, never the reader's. ArenaCalendar draws the chip; the consumer writes one of these per event and ArenaCalendar settles where it goes. | `id*` `title*` `start*` `end*` `colorId` `interactive` `actionsEnabled` `actions` `disabled` `click` | button, none | angular, react |
| `ArenaCard` | Surface container. Hairline border on the base surface scale; depth comes from the shadow, never a gradient. | `content` `interactive` `disabled` `href` `action` `title` `eyebrow` `floating` `accent` `click` | button, none | angular, react |
| `ArenaKeyValue` | A list of terms and the values against them, with an optional summed row ruled off at the bottom: a basket summary, an order, an invoice, a panel of facts about a resource. It renders a real definition list, so the association between a term and its value is the platform's rather than a class name's. | `rows*` `total` | none | angular, react |
| `ArenaSkeleton` | A loading placeholder that reserves the space real content will take. | `variant` `width` `height` `lines` `radius` | status | angular, react |
| `ArenaStatCard` | One metric on a card surface: a micro-label, the number, an optional delta pill and a sub-line. | `label*` `value*` `tone` `delta` `sub` `icon` | none | angular, react |
| `ArenaTable` | Data table on the density tokens. ArenaTable draws the header row from `columns`, owns the grid and its keyboard, and decides where each row sits; the consumer writes one ArenaTableRow per row and one ArenaTableCell per cell, so a cell's content is a value or one of Arena's own components rather than something returned from a per-item render function. Below --bp-md it becomes one card per row, measured on its own container rather than the viewport. | `label*` `columns*` `content` `empty` `sort` `sortChange` `page` `pageChange` `pageControl` `sortControl` `responsive` | grid, none | angular, react |
| `ArenaTableCell` | One cell of an ArenaTableRow. It draws the cell box (the padding, the alignment and the mono/gold treatment its column asks for, and in card mode the label/value pair or the full-width block), and shows whatever the consumer put in it. Its column config, its layout and its place in the grid's keyboard order come from ArenaTable and ArenaTableRow and are members of no contract. | `content` | none | angular, react |
| `ArenaTableRow` | One row of an ArenaTable. The consumer writes one per row and one ArenaTableCell inside it per cell. Where the row sits, the columns its cells are set against and how the keyboard reaches them are ArenaTable's, not this component's, and are members of no contract: the same shape, and for the same reason, as an ArenaRadioGroup and its Radios sharing which one is checked. | `content` `interactive` `disabled` `click` | button, none | angular, react |
| `ArenaTag` | A pill for filters, technologies and statuses. A tone for what state a thing is in or a ramp slot for which thing it is, and an optional dismiss. | `content` `tone` `colorId` `removable` `disabled` `remove` | button, none | angular, react |
| `ArenaUnauthCard` | The panel a signed-out screen needs: sign in, check your inbox, this link expired, a two-factor code. It knows nothing about credentials on purpose; the fields are composed inside it. | `brand` `eyebrow` `title` `content` `footer` | none | angular, react |

## feedback

| Component | What it is | Takes | Behaviour | Layers |
|---|---|---|---|---|
| `ArenaAlert` | A tone-coloured message with an optional icon, a single action, and optional dismissal. | `tone` `title` `content` `icon` `actionLabel` `action` `dismissible` `close` | alert, status | angular, react |
| `ArenaConfirmDialog` | Confirmation of a high-consequence action. Never closes on click-outside. `requireText` locks the confirm button until a word is typed. | `open*` `title*` `eyebrow` `content` `confirmLabel` `cancelLabel` `destructive` `requireText` `cancel` `confirm` | alertdialog | angular, react |
| `ArenaDialog` | Modal dialog over a blurred scrim. Takes the whole interaction until dismissed. | `open*` `title*` `eyebrow` `width` `content` `footer` `close` | dialog-modal | angular, react |
| `ArenaEmptyState` | A placeholder for an empty collection: an icon, a title, a message, and an optional action. | `icon` `title*` `message` `action` | none | angular, react |
| `ArenaErrorState` | Section/screen-level failure, with recovery and an optional diagnostic code. | `icon` `title` `message` `code` `retryLabel` `retry` `secondaryAction` | alert | angular, react |
| `ArenaOnboarding` | Guided coachmark tour (H10): presents features within the product with progress dots, Skip and Next. Controlled: the host owns index and answers the four events. | `open*` `steps*` `index` `anchor` `next` `back` `skip` `done` | dialog-modal | angular, react |
| `ArenaProgressBar` | Determinate progress by default; indeterminate for a wait with no percentage. | `progressPercentage` `indeterminate` `tone` `label*` `showLabel` `showPercentage` `size` | progressbar | angular, react |
| `ArenaSheet` | A non-modal panel anchored to one edge of the page: a cart, a filter drawer, a detail pane. It carries no scrim, traps no focus and takes nothing away from the page behind it, which is the whole difference from a dialog. Its header stays on screen while its body folds away, so a reader keeps the panel without keeping its bulk. | `open*` `placement` `title*` `collapsed` `collapsedChange` `dismissible` `close` `content` `footer` | disclosure | angular, react |
| `ArenaSpinner` | Indeterminate wait indicator. For a measurable process use ArenaProgressBar instead. | `size` `tone` `label` | progressbar | angular, react |
| `ArenaToast` | Ephemeral notification with a tone-coloured side bar and one optional action. | `title` `message` `tone` `actionLabel` `action` `persist` `dismissible` `close` | alert, status | angular, react |
| `ArenaToastHost` | The fixed box a stack of notices renders into. It decides where the stack sits, how far it stands off the viewport edges and how much air separates two notices, and it decides nothing else: it reads no notice, counts none, and owns no clock. | `placement` `content` | none | angular, react |
| `ArenaTooltip` | A short label revealed on pointer intent. Bone over dark for contrast. It waits before appearing and before withdrawing, so a pointer crossing a toolbar reveals nothing. | `label*` `content*` | tooltip | angular, react |

## forms

| Component | What it is | Takes | Behaviour | Layers |
|---|---|---|---|---|
| `ArenaButton` | Action button. One primary per view; danger stays outline. | `content` `variant` `size` `icon` `iconRight` `loading` `full` `disabled` `type` `name` `value` `autoFocus` `form` `tabStop` `click` | button | angular, react |
| `ArenaCheckbox` | A single checkbox. Checked shows a crimson fill with a check. | `checked` `label` `disabled` `required` `name` `value` `change` | checkbox | angular, react |
| `ArenaIconButton` | Icon-only button. Carries an accessible name in every state, not only on hover. | `icon*` `label*` `size` `variant` `showLabel` `pressed` `disabled` `type` `name` `value` `autoFocus` `form` `tabStop` `click` | button | angular, react |
| `ArenaInput` | Text field with validation. Focus is a gold ring; error crimson; valid green with a check. The four states are ordered and the order is normative: error, then focus, then valid, then neutral: an errored field stays crimson while it has focus, because the validation signal must not disappear at the moment the user acts on it. | `label` `id` `hint` `error` `valid` `required` `validate` `validateOn` `type` `icon` `prefix` `value` `disabled` `readOnly` `placeholder` `name` `autoComplete` `min` `max` `step` `maxLength` `pattern` `change` `blur` | textbox | angular, react |
| `ArenaRadio` | One option inside an ArenaRadioGroup. Selected shows a crimson dot inside the ring. | `value*` `label` `hint` `disabled` | radiogroup | angular, react |
| `ArenaRadioGroup` | Single-selection group. Governs the value and distributes it to its child Radios. | `ariaLabel*` `content` `value` `name` `change` | radiogroup | angular, react |
| `ArenaSelect` | Styled native dropdown selector, with the same validation vocabulary ArenaInput carries. The four states are ordered and the order is the same normative one: error, then focus, then valid, then neutral -- an errored control stays crimson while it has focus, because the validation signal must not disappear at the moment the user acts on it. A form that mixes ArenaInput and ArenaSelect is a form whose fields must report a failure the same way, or it gets validated by hand or not at all. | `label` `placeholder` `options` `value` `disabled` `required` `hint` `error` `valid` `icon` `name` `change` | select | angular, react |
| `ArenaSwitch` | A controlled on/off switch showing an icon per state. `confirm` gates a high-impact change through an ArenaConfirmDialog before it applies. | `state` `orientation` `size` `iconOn` `iconOff` `label*` `disabled` `confirm` `funcOn` `funcOff` `requestChange` | switch | angular, react |
| `ArenaTextarea` | Multi-line text field with validation and an optional counter. | `label` `id` `hint` `error` `required` `counter` `autoResize` `value` `disabled` `readOnly` `placeholder` `name` `maxLength` `rows` `change` | textbox | angular, react |

## layout

| Component | What it is | Takes | Behaviour | Layers |
|---|---|---|---|---|
| `ArenaFigure` | A framed piece of media with an optional caption: an image, a video, or a stand-in for the one that has not arrived. The frame is a shape and a corner a style plugin answers, and it clips whatever is put in it, so a wall of figures reads as a wall rather than as whatever sizes the pictures happened to be. | `media` `fallback` `overlay` `caption` `ratio` | none | angular, react |
| `ArenaGrid` | A grid that decides its own column count from the room it is given, rather than from a breakpoint anyone had to pick. Cells are as wide as they can be at or above a minimum, and the count falls as the room does, all the way to one. | `min` `gap` `maxWidth` `content` | none | angular, react |
| `ArenaHero` | The opening of a landing page: one line the page is built around, what sits above and below it, the actions it asks for, and a figure beside or behind it. Its title takes the hero register, which is the top rung of the title ladder and the only one above the page head. | `title*` `eyebrow` `lede` `actions` `figure` `layout` `align` | none | angular, react |
| `ArenaScroller` | A row that scrolls sideways because it holds more than fits, with no arrows pretending to be a slideshow. It is one tab stop carrying a group role and a name, which is what a scrolling region needs to be reachable by keyboard at all: without it, everything past the right edge belongs to the pointer alone. Each child is laid out at one width so the row reads as a rail rather than as a line of whatever the children happened to measure. | `label*` `content*` `itemWidth` `behaviour` | scrollable-region | angular, react |
| `ArenaScrollerItem` | One cell of an ArenaScroller: the box that carries the width the row decided and the point the row settles on. It exists because a row cannot reach inside its children to size them, and a child that is an Arena component may render no box of its own at all, so a rule aimed at the row's direct children lands on nothing in one layer and on the card in the other. The item is the box both layers agree about. | `content` | none | angular, react |
| `ArenaSection` | A named region of a page: a heading, optionally an eyebrow above it, a line under it and an action beside it, over whatever the region holds. It wraps what the consumer wrote and never replaces it. The title register is the section one, a step above a card's and a step below a page's, so a style plugin re-pitching the hierarchy moves this with the other two rather than leaving a page with three heads that disagree. | `title*` `content*` `eyebrow` `description` `action` `rhythm` | none | angular, react |
| `ArenaSiteFooter` | The band across the bottom of every screen: what a page says about itself once it has finished. It is the contentinfo landmark, so there is one per page, and like the bar at the top its contents line up with the page above them. | `content` `note` | contentinfo | angular, react |

## navigation

| Component | What it is | Takes | Behaviour | Layers |
|---|---|---|---|---|
| `ArenaAppBar` | The band across the top of every screen: the site's identity, the way through it, and the controls that follow the reader everywhere. It is the banner landmark, so there is one per page, and its contents line up with the page under it because the bar spans the viewport and the band inside it does not. | `brand` `nav` `actions` `sticky` | banner | angular, react |
| `ArenaBottomNav` | The bar of destinations pinned to the bottom edge of a phone screen. A compound component: the consumer writes one ArenaBottomNavItem per destination, and the coordination that tells each child which id is active and how to report `nav` is the parent's. That coordination is a member of no contract and each layer wires it in its own idiom. It is a row of equal columns with the glyph above the label, which is what separates it from a sidebar's stack of indented rows. | `active` `ariaLabel*` `content` `nav` | navigation | angular, react |
| `ArenaBottomNavItem` | One destination in an ArenaBottomNav. The consumer writes one per destination; which id is currently active and how it reports `nav` are settled between it and its parent, and none of that is a member of this contract, the same shape and the same reason as ArenaSideNavItem and as the name an ArenaRadioGroup settles with each ArenaRadio. It draws its glyph above its label and takes an equal share of the bar's width, however many destinations there are. | `id*` `label*` `icon*` `badge` `href` `disabled` | button, none | angular, react |
| `ArenaBreadcrumbs` | A trail of ancestor locations ending at the current one. An explicit return path for hierarchies deeper than tabs. | `ariaLabel*` `items*` `separator` `navigate` | navigation | angular, react |
| `ArenaBulkActionBar` | Appears when rows are selected and operates on the selection as a set. Renders nothing at a count of zero. | `count*` `noun` `actions*` `run` `layout` `clearable` `clear` | toolbar | angular, react |
| `ArenaCommandPalette` | Power-user accelerator (Cmd/Ctrl+K): search and run actions without a mouse. Controlled: the host owns whether it is open. | `open*` `commands*` `placeholder` `maxResults` `close` `run` | combobox | angular, react |
| `ArenaMenu` | Dropdown menu of actions on a trigger -- overflow, more actions, context. | `trigger*` `items*` `align` `select` | menu-button | angular, react |
| `ArenaPageHead` | A page heading: a required title, an optional subtitle, and an optional actions slot. | `title*` `subtitle` `actions` `align` | none | angular, react |
| `ArenaPagination` | Page selector for a paged list. Renders a windowed range, never every page. | `page*` `pageCount*` `ariaLabel*` `change` | navigation | angular, react |
| `ArenaSegmentedControl` | A compact inline filter over mutually exclusive options. A real radio group, never a tab list, and it carries no crimson. | `options*` `value` `defaultValue` `size` `ariaLabel*` `name` `change` | radiogroup | angular, react |
| `ArenaSideNav` | The sidebar's navigation list -- the list alone, not the frame around it. A compound component: the consumer writes one ArenaSideNavItem per destination, and the coordination that tells each child where it sits, which id is active and how to report `nav` is the parent's. That coordination is a member of no contract and each layer wires it in its own idiom. | `active` `ariaLabel*` `content` `indentStep` `nav` | navigation | angular, react |
| `ArenaSideNavCollapsible` | A named group inside an ArenaSideNav that shows and hides its own contents. It may contain items, sections and further collapsibles to any depth; the indent compounds with depth, which is why ArenaSideNav.indentStep is a step rather than a total. It binds the `disclosure` pattern and deliberately does NOT claim to be a treeview: there is no aria-level, no roving tab stop and no arrow navigation, because each collapsible is an independent disclosure. Its expanded state lives in the component, seeded by defaultExpanded, and it additionally opens itself when it COMES TO HOLD ArenaSideNav.active -- a transition, not a standing condition, which is what leaves a user free to collapse a group again while the route stays inside it. Implicit behaviour, stated here and in its .prompt.md rather than left to be discovered. | `id*` `label*` `icon` `defaultExpanded` `content` `toggle` | disclosure | angular, react |
| `ArenaSideNavItem` | One destination in an ArenaSideNav. The consumer writes one per destination; the nesting depth it sits at, which id is currently active and how it reports `nav` are settled between it and its parent, and none of that is a member of this contract -- the same shape, and the same reason, as the name, checked state and selection callback an ArenaRadioGroup settles with each ArenaRadio. It used to be api/types/side-nav-item.json, a predefined object Arena read out of an array; it is an element the consumer writes now, which is what makes a section, a collapsible and arbitrary nesting expressible at all. | `id*` `label*` `icon` `disabled` `badge` `href` | button, none | angular, react |
| `ArenaSideNavSection` | A named group of navigation items inside an ArenaSideNav. It wraps what the consumer wrote and never replaces it; its accessible name is the same heading a sighted user reads. A section always has children -- a childless one is guarded against at runtime, because two shapes would be one more thing a single behaviour binding cannot describe. Having sections at all is optional: loose SideNavItems at the root are legal and may sit beside them. | `label*` `content*` | none | angular, react |
| `ArenaTab` | One tab in an ArenaTabs strip, and the panel it shows. ArenaTab draws the button; its content fills the tabpanel ArenaTabs renders beside the tablist. | `value*` `label*` `content` | none | angular, react |
| `ArenaTabs` | A row of tabs and the one panel they switch between. Write one `ArenaTab` per view; ArenaTabs renders the tablist, the panel, and the keyboard. | `content` `value` `defaultValue` `change` | tabs | angular, react |

67 components across 7 categories.
