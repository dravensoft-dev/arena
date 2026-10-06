<!-- GENERATED from frameworks/tailwind/vocabulary/ by bun run generate:vocabulary. Edit a family there, not this page. -->

# The vocabulary

**Every vocabulary class you write is on this page.** A component family's class goes on the component, or on a container of yours whose components should all take it. The class nearest the component wins, whatever order your stylesheets load in. A markup family's box class goes on an element you wrote, never on a component. A markup family's context class, density, goes on an element you wrote or on a component. A markup class beats a rule of yours of equal specificity, whatever order the sheets load in. Write yours more specific to override it. A class that is not on this page does nothing on an Arena component, and the audit reports it. A project compiling Tailwind through `css/tailwind-theme.css` also has utilities such as `arena-spinner` and `arena-fade`. Those utilities are Tailwind utilities that a manifest names, and not vocabulary classes.

| Family | Reach | Options | Property | Answered by |
|---|---|---|---|---|
| [`band`](#band) | box | `arena-band` |  | markup you write |
| [`density`](#density) | context | `arena-comfortable`, `arena-compact` |  | markup you write |
| [`fill`](#fill) | box | `arena-fill`, `arena-fit` (default) |  | ArenaButton, ArenaIconButton, ArenaMenu, ArenaSegmentedControl, ArenaTooltip |
| [`num`](#num) | box | `arena-num` |  | markup you write |
| [`orientation`](#orientation) | box | `arena-orientation-horizontal` (default), `arena-orientation-vertical` |  | ArenaAppLogo, ArenaSwitch |
| [`prose`](#prose) | box | `arena-prose` |  | markup you write |
| [`row`](#row) | box | `arena-row`, `arena-row--baseline`, `arena-row--between`, `arena-row--component`, `arena-row--start` |  | markup you write |
| [`shell`](#shell) | box | `arena-shell`, `arena-shell__main` |  | markup you write |
| [`size`](#size) | context | `arena-size-2xl`, `arena-size-lg`, `arena-size-md` (default), `arena-size-sm`, `arena-size-xl`, `arena-size-xs` |  | ArenaAppLogo (`arena-size-lg`, `arena-size-md`, `arena-size-sm`, `arena-size-xl`), ArenaAvatar (`arena-size-lg`, `arena-size-md`, `arena-size-sm`, `arena-size-xs`), ArenaButton, ArenaIconButton, ArenaPeopleList, ArenaProgressBar and ArenaSpinner (`arena-size-lg`, `arena-size-md`, `arena-size-sm`), ArenaSegmentedControl (`arena-size-md`, `arena-size-sm`), ArenaSwitch (`arena-size-2xl`, `arena-size-lg`, `arena-size-md`, `arena-size-sm`, `arena-size-xl`) |
| [`sr-only`](#sr-only) | box | `arena-sr-only` |  | markup you write |
| [`stack`](#stack) | box | `arena-stack`, `arena-stack--end`, `arena-stack--group`, `arena-stack--section`, `arena-stack--start` |  | markup you write |

## band

The column a page's content sits in, at the page width with a gutter either side, centred. Both lengths are roles, so a style plugin narrows or widens every page at once. The gutter is a ceiling rather than a fixed inset. Below the page width the band stands off by the same share of the space it has. A phone then keeps a content column instead of spending two fifths of the screen on margin. The band carries no block air; the space above and below is yours, on the spacing scale.

- **Options:** `arena-band`.
- **Reach:** box: it goes on an element you wrote, and it decides that element alone.
- **Written on:** an element you wrote, never a component.

## density

How much a region holds, which is a question about who is pointing at it rather than about the register the product speaks in. arena-compact re-densifies the controls, the rows and their text, for an expert view that has to hold more. arena-comfortable grows the controls to a 48px touch target for a screen a thumb drives, and leaves the text the size it was. The two are exclusive: a container wearing both gets arena-comfortable. Write it on an element of yours or on a component, and it reaches every component inside until a nearer density answers it again. The air between components does not re-densify.

- **Options:** `arena-comfortable`, `arena-compact`.
- **Reach:** context: it goes on an element you wrote or on a component, and reaches every component inside until a nearer class answers it again.
- **Values:** `arena-compact` restates `contracts/design/density.compact.json`, `arena-comfortable` restates `contracts/design/density.comfortable.json`.
- **Written on:** an element you wrote, or a component.

## fill

Whether a component takes the width of the box it sits in or the width of its own content. An inline control fits its content wherever it is placed, including in a flex column or grid cell. An action spanning the foot of a card or a form is a decision about that one instance. Write this on the instance, or on a container whose components should all take it. The setting stops at the content of the component it reaches.

- **Options:** `arena-fill`, `arena-fit` (default).
- **Reach:** box: it reaches the nearest component, and stops at the content that component projects.
- **Answered by:** ArenaButton, ArenaIconButton, ArenaMenu, ArenaSegmentedControl, ArenaTooltip.

## num

The mono face and tabular figures for a figure you draw yourself, in a definition list, a KPI or a cart line, and no colour. A column of them aligns by digit and does not jitter as it counts. The class is the half of a table's mono column that travels: the gold ink says identifier, and a sale total in gold says the wrong thing.

- **Options:** `arena-num`.
- **Reach:** box: it goes on an element you wrote, and it decides that element alone.
- **Written on:** an element you wrote, never a component.

## orientation

Whether a component lies along the line it sits in or stands across it. Orientation changes the drawing and never the behaviour: a vertical switch is operated exactly as a horizontal one.

- **Options:** `arena-orientation-horizontal` (default), `arena-orientation-vertical`.
- **Reach:** box: it reaches the nearest component, and stops at the content that component projects.
- **Answered by:** ArenaAppLogo, ArenaSwitch.

## prose

The reading column for a document you write, an article, a changelog, a release note. The class holds the line to a measure in ch rather than a pixel width, so the column tracks the font size the way a measure has to. The measure is a maximum and not a width, so a narrow viewport keeps the whole column. The measure is a role, so a style plugin written for reading re-answers it.

- **Options:** `arena-prose`.
- **Reach:** box: it goes on an element you wrote, and it decides that element alone.
- **Written on:** an element you wrote, never a component.

## row

Things side by side that read as one unit, at the group step: a mark beside a name, a label beside its badge, an icon and the word after it. Two elements side by side are already a row, however short the line, and each is where a display: flex with a gap of somebody's choosing gets written instead. arena-row--component is the step for things that are separate things, a bar's links or a toolbar's buttons. arena-row--start, arena-row--baseline and arena-row--between line the items up and carry no length. The row wraps when the line runs out. Write it on an element of yours: a component's own element may carry no box.

- **Options:** `arena-row`, `arena-row--baseline`, `arena-row--between`, `arena-row--component`, `arena-row--start`.
- **Reach:** box: it goes on an element you wrote, and it decides that element alone.
- **Written on:** an element you wrote, never a component.

## shell

The window a page fills, so a short page's footer sits at the bottom rather than floating halfway up. arena-shell__main goes on the one child that takes the slack. A shell with a header, a main and a footer has exactly one child that should grow, and no rule can know which. When that child is an Arena component, put a div of yours around it and the class on the div. A component's own element may carry no box, so the slack would go to nothing.

- **Options:** `arena-shell`, `arena-shell__main`.
- **Reach:** box: it goes on an element you wrote, and it decides that element alone.
- **Written on:** an element you wrote, never a component.

## size

How big a control, a meter, a face or a mark is drawn. The region a component sits in answers it as much as the component does, so it crosses components. Written on a toolbar, it reaches every button in it, and a nearer class answers it again. An option a component does not have leaves that component at the nearest option it does answer.

- **Options:** `arena-size-2xl`, `arena-size-lg`, `arena-size-md` (default), `arena-size-sm`, `arena-size-xl`, `arena-size-xs`.
- **Reach:** context: it reaches every component inside, until a nearer class answers it again.
- **Answered by:**
  - ArenaAppLogo (`arena-size-lg`, `arena-size-md`, `arena-size-sm`, `arena-size-xl`).
  - ArenaAvatar (`arena-size-lg`, `arena-size-md`, `arena-size-sm`, `arena-size-xs`).
  - ArenaButton, ArenaIconButton, ArenaPeopleList, ArenaProgressBar and ArenaSpinner (`arena-size-lg`, `arena-size-md`, `arena-size-sm`).
  - ArenaSegmentedControl (`arena-size-md`, `arena-size-sm`).
  - ArenaSwitch (`arena-size-2xl`, `arena-size-lg`, `arena-size-md`, `arena-size-sm`, `arena-size-xl`).

## sr-only

A label a screen reader announces and nothing paints, such as the name of an icon-only control you drew yourself. The one-pixel clipped box is the pattern every implementation settled on rather than a length anybody chose: a zero-size element is skipped by several screen readers. Shipping it here is what keeps that pixel out of your own sheet.

- **Options:** `arena-sr-only`.
- **Reach:** box: it goes on an element you wrote, and it decides that element alone.
- **Written on:** an element you wrote, never a component.

## stack

The air between peers in a column of yours, as three named steps rather than a number you pick. Arena draws no outer margin on anything. The space between one component and the next is always yours to place, and this class applies the rhythm tokens to it. arena-stack is the step between peers, arena-stack--group the step inside one unit, and arena-stack--section the step between two sections. arena-stack--start and arena-stack--end line the items up and carry no length, because where items line up is a question about your content. Write it on an element of yours: a component's own element may carry no box.

- **Options:** `arena-stack`, `arena-stack--end`, `arena-stack--group`, `arena-stack--section`, `arena-stack--start`.
- **Reach:** box: it goes on an element you wrote, and it decides that element alone.
- **Written on:** an element you wrote, never a component.
