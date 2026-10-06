<!-- GENERATED from frameworks/tailwind/vocabulary/ by bun run generate:vocabulary. Edit a family there, not this page. -->

# The vocabulary

**Every vocabulary class you write is on this page.** A component family's class goes on the component, or on a container of yours whose components should all take it. The class nearest the component wins, whatever order your stylesheets load in. A markup family's box class goes on an element you wrote, never on a component. A markup family's context class, density, goes on an element you wrote or on a component. A markup class beats a rule of yours of equal specificity, whatever order the sheets load in. Write yours more specific to override it. A class that is not on this page does nothing on an Arena component, and the audit reports it. A project compiling Tailwind through `css/tailwind-theme.css` also has utilities such as `arena-spinner` and `arena-fade`. Those utilities are Tailwind utilities that a manifest names, and not vocabulary classes.

| Family | Reach | Options | Property | Answered by |
|---|---|---|---|---|
| [`accent`](#accent) | box | `arena-accent-gold`, `arena-accent-ink`, `arena-accent-muted`, `arena-accent-plain` (default), `arena-accent-primary` |  | ArenaActivityFeed and ArenaProgressBar (`arena-accent-gold`, `arena-accent-primary`; default `arena-accent-primary`), ArenaBadge and ArenaStatCard (`arena-accent-gold`, `arena-accent-plain`, `arena-accent-primary`), ArenaCard and ArenaTag (`arena-accent-plain`, `arena-accent-primary`), ArenaSpinner (`arena-accent-gold`, `arena-accent-ink`, `arena-accent-muted`, `arena-accent-primary`; default `arena-accent-primary`), ArenaToast (`arena-accent-gold`, `arena-accent-plain`) |
| [`align`](#align) | box | `arena-align-center`, `arena-align-start` (default) |  | ArenaHero, ArenaPageHead |
| [`band`](#band) | box | `arena-band` |  | markup you write |
| [`board-column`](#board-column) | box | `arena-board-column-lg`, `arena-board-column-md` (default), `arena-board-column-sm` | `--arena-board-column` | ArenaBoard |
| [`density`](#density) | context | `arena-comfortable`, `arena-compact` |  | markup you write |
| [`dialog-width`](#dialog-width) | box | `arena-dialog-width-lg`, `arena-dialog-width-md` (default), `arena-dialog-width-sm` | `--arena-dialog-width` | ArenaDialog |
| [`elevation`](#elevation) | box | `arena-elevation-flat` (default), `arena-elevation-floating` |  | ArenaCard |
| [`emphasis`](#emphasis) | context | `arena-emphasis-ghost`, `arena-emphasis-primary` (default), `arena-emphasis-secondary`, `arena-emphasis-solid` |  | ArenaButton (`arena-emphasis-ghost`, `arena-emphasis-primary`, `arena-emphasis-secondary`), ArenaIconButton (`arena-emphasis-ghost`, `arena-emphasis-solid`; default `arena-emphasis-ghost`) |
| [`fill`](#fill) | box | `arena-fill`, `arena-fit` (default) |  | ArenaButton, ArenaIconButton, ArenaMenu, ArenaSegmentedControl, ArenaTooltip |
| [`grid-gap`](#grid-gap) | box | `arena-grid-gap-component` (default), `arena-grid-gap-group`, `arena-grid-gap-none`, `arena-grid-gap-section` | `--arena-grid-gap` | ArenaGrid |
| [`grid-max`](#grid-max) | box | `arena-grid-max-lg`, `arena-grid-max-md`, `arena-grid-max-none` (default), `arena-grid-max-sm` | `--arena-grid-max` | ArenaGrid |
| [`grid-min`](#grid-min) | box | `arena-grid-min-lg`, `arena-grid-min-md` (default), `arena-grid-min-sm` | `--arena-grid-min` | ArenaGrid |
| [`layout`](#layout) | box | `arena-layout-bleed`, `arena-layout-split` (default), `arena-layout-stacked` |  | ArenaHero |
| [`num`](#num) | box | `arena-num` |  | markup you write |
| [`orientation`](#orientation) | box | `arena-orientation-horizontal` (default), `arena-orientation-vertical` |  | ArenaAppLogo, ArenaSwitch |
| [`placement`](#placement) | box | `arena-placement-bottom` (default), `arena-placement-bottom-end`, `arena-placement-bottom-start`, `arena-placement-end`, `arena-placement-start`, `arena-placement-top-end`, `arena-placement-top-start` |  | ArenaSheet (`arena-placement-bottom`, `arena-placement-end`, `arena-placement-start`), ArenaToastHost (`arena-placement-bottom-end`, `arena-placement-bottom-start`, `arena-placement-top-end`, `arena-placement-top-start`; default `arena-placement-bottom-end`) |
| [`prose`](#prose) | box | `arena-prose` |  | markup you write |
| [`ratio`](#ratio) | box | `arena-ratio-media` (default), `arena-ratio-portrait`, `arena-ratio-square`, `arena-ratio-video`, `arena-ratio-wide` | `--arena-ratio` | ArenaFigure |
| [`rhythm`](#rhythm) | box | `arena-rhythm-component` (default), `arena-rhythm-group`, `arena-rhythm-none`, `arena-rhythm-section` | `--arena-rhythm` | ArenaSection |
| [`row`](#row) | box | `arena-row`, `arena-row--baseline`, `arena-row--between`, `arena-row--component`, `arena-row--start` |  | markup you write |
| [`scroller-item`](#scroller-item) | box | `arena-scroller-item-lg`, `arena-scroller-item-md` (default), `arena-scroller-item-sm` | `--arena-scroller-item` | ArenaScroller, ArenaScrollerItem |
| [`shell`](#shell) | box | `arena-shell`, `arena-shell__main` |  | markup you write |
| [`size`](#size) | context | `arena-size-2xl`, `arena-size-lg`, `arena-size-md` (default), `arena-size-sm`, `arena-size-xl`, `arena-size-xs` |  | ArenaAppLogo (`arena-size-lg`, `arena-size-md`, `arena-size-sm`, `arena-size-xl`), ArenaAvatar (`arena-size-lg`, `arena-size-md`, `arena-size-sm`, `arena-size-xs`), ArenaButton, ArenaIconButton, ArenaPeopleList, ArenaProgressBar and ArenaSpinner (`arena-size-lg`, `arena-size-md`, `arena-size-sm`), ArenaSegmentedControl (`arena-size-md`, `arena-size-sm`), ArenaSwitch (`arena-size-2xl`, `arena-size-lg`, `arena-size-md`, `arena-size-sm`, `arena-size-xl`) |
| [`sr-only`](#sr-only) | box | `arena-sr-only` |  | markup you write |
| [`stack`](#stack) | box | `arena-stack`, `arena-stack--end`, `arena-stack--group`, `arena-stack--section`, `arena-stack--start` |  | markup you write |

## accent

Which editorial colour a component wears when nothing it says calls for a hue. Accent carries no meaning, so a status a component states always wins over it: a success badge stays success whatever accent it is given. ink paints the ink of the surface the component sits on, which is what a spinner on a filled banner needs.

- **Options:** `arena-accent-gold`, `arena-accent-ink`, `arena-accent-muted`, `arena-accent-plain` (default), `arena-accent-primary`.
- **Reach:** box: it reaches the nearest component, and stops at the content that component projects.
- **Answered by:**
  - ArenaActivityFeed and ArenaProgressBar (`arena-accent-gold`, `arena-accent-primary`; default `arena-accent-primary`).
  - ArenaBadge and ArenaStatCard (`arena-accent-gold`, `arena-accent-plain`, `arena-accent-primary`).
  - ArenaCard and ArenaTag (`arena-accent-plain`, `arena-accent-primary`).
  - ArenaSpinner (`arena-accent-gold`, `arena-accent-ink`, `arena-accent-muted`, `arena-accent-primary`; default `arena-accent-primary`).
  - ArenaToast (`arena-accent-gold`, `arena-accent-plain`).

## align

Whether a block of words and actions runs from the start edge or is centred in its column. The alignment is a decision about one composition, separate from its layout.

- **Options:** `arena-align-center`, `arena-align-start` (default).
- **Reach:** box: it reaches the nearest component, and stops at the content that component projects.
- **Answered by:** ArenaHero, ArenaPageHead.

## band

The column a page's content sits in, at the page width with a gutter either side, centred. Both lengths are roles, so a style plugin narrows or widens every page at once. The gutter is a ceiling rather than a fixed inset. Below the page width the band stands off by the same share of the space it has. A phone then keeps a content column instead of spending two fifths of the screen on margin. The band carries no block air; the space above and below is yours, on the spacing scale.

- **Options:** `arena-band`.
- **Reach:** box: it goes on an element you wrote, and it decides that element alone.
- **Written on:** an element you wrote, never a component.

## board-column

How narrow a column of a board may get before the board scrolls sideways rather than squeezing. The question is the adopter's, because a tracker of many lanes wants slim columns and a board of a few wants room for its cards, from the same markup. arena-board-column-md is the default and reads board-column-md. arena-board-column-sm and arena-board-column-lg read board-column-sm and board-column-lg. Set --arena-board-column on a container for a width no step names. Write a length, or a token such as var(--board-column-md) or calc(var(--board-column-md) * 1.5). A class on the board wins over a property on its container.

- **Options:** `arena-board-column-lg`, `arena-board-column-md` (default), `arena-board-column-sm`.
- **Reach:** box: it reaches the nearest component, and stops at the content that component projects.
- **Property:** `--arena-board-column`, set on a container of yours for a value no option names, with a token or a derivation of tokens.
- **Answered by:** ArenaBoard.

## density

How much a region holds, which is a question about who is pointing at it rather than about the register the product speaks in. arena-compact re-densifies the controls, the rows and their text, for an expert view that has to hold more. arena-comfortable grows the controls to a 48px touch target for a screen a thumb drives, and leaves the text the size it was. The two are exclusive: a container wearing both gets arena-comfortable. Write it on an element of yours or on a component, and it reaches every component inside until a nearer density answers it again. The air between components does not re-densify.

- **Options:** `arena-comfortable`, `arena-compact`.
- **Reach:** context: it goes on an element you wrote or on a component, and reaches every component inside until a nearer class answers it again.
- **Values:** `arena-compact` restates `contracts/design/density.compact.json`, `arena-comfortable` restates `contracts/design/density.comfortable.json`.
- **Written on:** an element you wrote, or a component.

## dialog-width

How wide the panel of a dialog is, which decides how much of a form or a message fits on a line. The question is the adopter's, because a confirmation wants a narrow panel and a form wants a wide one from the same component. arena-dialog-width-md is the default and reads dialog-width-md. arena-dialog-width-sm and arena-dialog-width-lg read dialog-width-sm and dialog-width-lg. Set --arena-dialog-width on a container for a width no step names. Write a length, or a token such as var(--dialog-width-md) or calc(var(--dialog-width-md) * 1.5). A class on the dialog wins over a property on its container, and a dialog that fills the screen ignores both.

- **Options:** `arena-dialog-width-lg`, `arena-dialog-width-md` (default), `arena-dialog-width-sm`.
- **Reach:** box: it reaches the nearest component, and stops at the content that component projects.
- **Property:** `--arena-dialog-width`, set on a container of yours for a value no option names, with a token or a derivation of tokens.
- **Answered by:** ArenaDialog.

## elevation

Whether a surface rests on the page or lifts off it. Depth comes from the shadow and the surface scale, never a gradient.

- **Options:** `arena-elevation-flat` (default), `arena-elevation-floating`.
- **Reach:** box: it reaches the nearest component, and stops at the content that component projects.
- **Answered by:** ArenaCard.

## emphasis

How loudly an action speaks: filled in the accent, a quiet surface, or no surface at all. Emphasis is the treatment channel, and meaning composes with it: a destructive action keeps whichever emphasis it is given and draws it in danger. At most one primary stands in a view.

- **Options:** `arena-emphasis-ghost`, `arena-emphasis-primary` (default), `arena-emphasis-secondary`, `arena-emphasis-solid`.
- **Reach:** context: it reaches every component inside, until a nearer class answers it again.
- **Answered by:**
  - ArenaButton (`arena-emphasis-ghost`, `arena-emphasis-primary`, `arena-emphasis-secondary`).
  - ArenaIconButton (`arena-emphasis-ghost`, `arena-emphasis-solid`; default `arena-emphasis-ghost`).

## fill

Whether a component takes the width of the box it sits in or the width of its own content. An inline control fits its content wherever it is placed, including in a flex column or grid cell. An action spanning the foot of a card or a form is a decision about that one instance. Write this on the instance, or on a container whose components should all take it. The setting stops at the content of the component it reaches.

- **Options:** `arena-fill`, `arena-fit` (default).
- **Reach:** box: it reaches the nearest component, and stops at the content that component projects.
- **Answered by:** ArenaButton, ArenaIconButton, ArenaMenu, ArenaSegmentedControl, ArenaTooltip.

## grid-gap

The air between the cells of a grid, on both axes. The question is the adopter's, because rhythm is the page's and a grid is where a hand-picked gap shows worst. The options are the page rhythm scale itself. arena-grid-gap-group groups related cells, arena-grid-gap-component, the default, sets two peers apart, arena-grid-gap-section reads as two sections, and arena-grid-gap-none closes the gap. Set --arena-grid-gap on a container for a gap no step names. Write a length, or a derivation of tokens such as calc(var(--rhythm-group) / 2). A class on the grid wins over a property on its container.

- **Options:** `arena-grid-gap-component` (default), `arena-grid-gap-group`, `arena-grid-gap-none`, `arena-grid-gap-section`.
- **Reach:** box: it reaches the nearest component, and stops at the content that component projects.
- **Property:** `--arena-grid-gap`, set on a container of yours for a value no option names, with a token or a derivation of tokens.
- **Answered by:** ArenaGrid.

## grid-max

The widest a grid runs before it centres in whatever contains it. The question is the adopter's, because a page's own reading width is a decision about one page, and a grid nested in a page should fill its container. arena-grid-max-none is the default and sets no ceiling. arena-grid-max-sm, arena-grid-max-md and arena-grid-max-lg read grid-max-sm, grid-max-md and grid-max-lg. Set --arena-grid-max on a container for a ceiling no step names. Write a length, or a token such as var(--container-max). A class on the grid wins over a property on its container.

- **Options:** `arena-grid-max-lg`, `arena-grid-max-md`, `arena-grid-max-none` (default), `arena-grid-max-sm`.
- **Reach:** box: it reaches the nearest component, and stops at the content that component projects.
- **Property:** `--arena-grid-max`, set on a container of yours for a value no option names, with a token or a derivation of tokens.
- **Answered by:** ArenaGrid.

## grid-min

How narrow a cell of a grid may get before the grid drops a column, which decides how many cards a viewport shows. The question is the adopter's, because a gallery wants a dense wall and a ledger wants a wide column from the same markup. arena-grid-min-md is the default and reads grid-min. arena-grid-min-sm and arena-grid-min-lg read grid-min-sm and grid-min-lg. Set --arena-grid-min on a container for a width no step names. Write a length, or a token such as var(--grid-min) or calc(var(--grid-min) * 1.5). A class on the grid wins over a property on its container.

- **Options:** `arena-grid-min-lg`, `arena-grid-min-md` (default), `arena-grid-min-sm`.
- **Reach:** box: it reaches the nearest component, and stops at the content that component projects.
- **Property:** `--arena-grid-min`, set on a container of yours for a value no option names, with a token or a derivation of tokens.
- **Answered by:** ArenaGrid.

## layout

How the words of a hero sit against its figure. Split puts them side by side and falls to one column when the room runs out. Stacked keeps one column at every width. Bleed lays them on the figure, over the wash the media overlay role paints.

- **Options:** `arena-layout-bleed`, `arena-layout-split` (default), `arena-layout-stacked`.
- **Reach:** box: it reaches the nearest component, and stops at the content that component projects.
- **Answered by:** ArenaHero.

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

## placement

Which edge or corner of the viewport a fixed surface is pinned to. Each placement clears the device inset on the edges it touches.

- **Options:** `arena-placement-bottom` (default), `arena-placement-bottom-end`, `arena-placement-bottom-start`, `arena-placement-end`, `arena-placement-start`, `arena-placement-top-end`, `arena-placement-top-start`.
- **Reach:** box: it reaches the nearest component, and stops at the content that component projects.
- **Answered by:**
  - ArenaSheet (`arena-placement-bottom`, `arena-placement-end`, `arena-placement-start`).
  - ArenaToastHost (`arena-placement-bottom-end`, `arena-placement-bottom-start`, `arena-placement-top-end`, `arena-placement-top-start`; default `arena-placement-bottom-end`).

## prose

The reading column for a document you write, an article, a changelog, a release note. The class holds the line to a measure in ch rather than a pixel width, so the column tracks the font size the way a measure has to. The measure is a maximum and not a width, so a narrow viewport keeps the whole column. The measure is a role, so a style plugin written for reading re-answers it.

- **Options:** `arena-prose`.
- **Reach:** box: it goes on an element you wrote, and it decides that element alone.
- **Written on:** an element you wrote, never a component.

## ratio

The shape of the frame a figure clips its picture to, as the ratio of its width to its height. The question is the adopter's. A shop crops portrait where a gallery tiles square, and a video is sixteen by nine whatever the page sounds like. arena-ratio-media is the default and reads aspect-media, which a style plugin answers for every figure at once. arena-ratio-square, arena-ratio-video, arena-ratio-portrait and arena-ratio-wide read aspect-square, aspect-video, aspect-portrait and aspect-wide. Set --arena-ratio on a container for a shape no step names. Write a number, a fraction such as 3 / 2, or a token such as var(--aspect-video). A class on the figure wins over a property on its container.

- **Options:** `arena-ratio-media` (default), `arena-ratio-portrait`, `arena-ratio-square`, `arena-ratio-video`, `arena-ratio-wide`.
- **Reach:** box: it reaches the nearest component, and stops at the content that component projects.
- **Property:** `--arena-ratio`, set on a container of yours for a value no option names, with a token or a derivation of tokens.
- **Answered by:** ArenaFigure.

## rhythm

How far the head of a section stands from its body. The question is the adopter's, because the distance depends on what the body holds, and a body that carries its own top edge wants none. The options are the page rhythm scale itself. arena-rhythm-group reads as one unit, arena-rhythm-component, the default, as a head over its own content, arena-rhythm-section as a head over a region of the page, and arena-rhythm-none closes the distance. Set --arena-rhythm on a container for a distance no step names. Write a length, or a derivation of tokens such as calc(var(--rhythm-group) * 1.5). A class on the section wins over a property on its container.

- **Options:** `arena-rhythm-component` (default), `arena-rhythm-group`, `arena-rhythm-none`, `arena-rhythm-section`.
- **Reach:** box: it reaches the nearest component, and stops at the content that component projects.
- **Property:** `--arena-rhythm`, set on a container of yours for a value no option names, with a token or a derivation of tokens.
- **Answered by:** ArenaSection.

## row

Things side by side that read as one unit, at the group step: a mark beside a name, a label beside its badge, an icon and the word after it. Two elements side by side are already a row, however short the line, and each is where a display: flex with a gap of somebody's choosing gets written instead. arena-row--component is the step for things that are separate things, a bar's links or a toolbar's buttons. arena-row--start, arena-row--baseline and arena-row--between line the items up and carry no length. The row wraps when the line runs out. Write it on an element of yours: a component's own element may carry no box.

- **Options:** `arena-row`, `arena-row--baseline`, `arena-row--between`, `arena-row--component`, `arena-row--start`.
- **Reach:** box: it goes on an element you wrote, and it decides that element alone.
- **Written on:** an element you wrote, never a component.

## scroller-item

How wide each item of a scrolling row is laid out, which makes the row a rail rather than a line of whatever the children measured. The question is the adopter's, because a rail of posters wants narrow items and a rail of cards wants wide ones from the same markup. arena-scroller-item-md is the default and reads scroller-item-md. arena-scroller-item-sm and arena-scroller-item-lg read scroller-item-sm and scroller-item-lg. Set --arena-scroller-item on a container for a width no step names. Write a length, or a token such as var(--scroller-item-md) or calc(var(--scroller-item-md) * 1.5). A class on the row reaches each item, because the row is transparent and the item is the box that reads it.

- **Options:** `arena-scroller-item-lg`, `arena-scroller-item-md` (default), `arena-scroller-item-sm`.
- **Reach:** box: it reaches the nearest component, and stops at the content that component projects.
- **Property:** `--arena-scroller-item`, set on a container of yours for a value no option names, with a token or a derivation of tokens.
- **Answered by:** ArenaScroller, ArenaScrollerItem.

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
