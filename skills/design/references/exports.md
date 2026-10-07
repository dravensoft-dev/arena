# What each package exports besides the components

Which helpers, hooks, services and constants does the React or Angular package export besides components? Which ones carry a compatibility promise? How do I raise a toast or a confirmation from code? Which Angular marker directives must I import? How do I bind Angular reactive forms? Read this before you write a second copy of something a package already exports.

A name on this page may be leaned on. A symbol you found by autocomplete may not. [`media-register.md`](./media-register.md) says when the markup is yours and which of these exports to reach for.

## Does every export carry a compatibility promise?

Only the names listed on this page do. Every other symbol reaching a package root is an internal of that layer. The barrel is generated wholesale and not curated. Such a symbol carries no compatibility promise. The symbol carries the `Arena` prefix too, since the convention is about the name and not about the promise. Reading `Arena` on a symbol tells you where it comes from. The prefix never tells you the symbol is yours to depend on.

## What does the React package export besides components?

Every component is imported from the package root, and its types ship with it. The types are emitted from the components' own source. Everything else that reaches the root is in this table.

| export | what it is |
| --- | --- |
| `initArenaTheme`, `useArenaTheme`, `getArenaTheme`, `setArenaTheme`, `toggleArenaTheme`, `arenaPalettes`, `ArenaPalette`, `ArenaThemeConfig` | the theme surface, covered in [`theme.md`](./theme.md) |
| `ArenaLocaleProvider`, `useArenaLocale`, `arenaMergeLocale`, `ARENA_DEFAULT_LOCALE` | Arena's own words, covered in [`locale.md`](./locale.md) |
| `useArenaContainerWidth(target?)` | `[ref, width]`: attach the ref to the box and read its outer width, the border box with no transform applied. Subtract your own padding and border when you need the content width. For a component or a panel that has to fit the room it was given. **The hook measures when React attaches the ref, before the browser paints**, then a `ResizeObserver` follows the box. A phone's first frame is already narrow, as Arena's own components are. `width` is `null` in a server render and for a box that has never had a width, such as one first drawn in a hidden parent. A box hidden later keeps its last width. Render the wide branch while `width` is `null`, which is what a server's HTML carries. Pass a `useRef` as `target`; a sealed ref is measured after the paint |
| `useArenaViewportBelow(name)` | a boolean over `not all and (min-width: N)`, where `name` is `'sm' \| 'md' \| 'lg'` and resolves the same `--bp-*` token Arena's own components branch on. For a page's own layout, and **never for a component**: that is wrong the first time somebody puts it in a narrow column. Call `forgetArenaBreakpoints()` if your app swaps its stylesheet at runtime. **It answers in the first client render.** A server render answers `false` until the client takes over, so a frame a server renders takes the `md:` and `max-md:` variants instead |
| `arenaCatColor(slot)`, `arenaCatIndex(slot)`, `arenaCatSurface(slot)`, `arenaCatTint(colour)`, `arenaCatSlotFor(key)`, `ARENA_CAT_SLOTS` | the chart ramp, for a legend or a chip you draw yourself. The ramp's order is its identity, so a slot means the same thing in every chart on the screen. `arenaCatIndex` clamps and rounds a number to the ramp's 1..8, the value `data-arena-color-id` carries. `arenaCatTint` is the soft surface an identity colour stands on, over whatever answers `fill-surface`; it takes a colour, not a slot, and fills `arenaCatSurface` |
| `useArenaToasts()` | the notice queue: it holds their identity and their order, and runs the clock `ArenaToastHost` deliberately does not own. `raise(notice)` returns an id, `dismiss(id)` takes one away, and `toasts` is what you render into the host. The three-branch dismissal rule is inside it, including the one invisible in a signature: a `danger` notice is never put on a timer, and it ignores a `persist` of false |
| `useArenaConfirm()` | the confirmation queue. `ask(request)` returns a promise of the answer, `current` is the one open request, an `ArenaConfirmEntry`, and `settle(id, answer)` resolves it and opens the next |
| `arenaToastDelay(notice, dismiss)` | that rule on its own, for a queue of your own: the interval a notice runs on, or `null` when it must not be taken away |
| `isArenaPrimaryActivation(event)` | the predicate behind the anchor rule: true for a primary click with no modifier, false for every modified click, middle click and context menu |
| `isArenaOwnActivation(target, container)` | true when an activation landed on the container itself rather than on a link, a button, a field or any other interactive element inside it. The predicate is what lets a clickable row hold a checkbox and a row action without taking their presses |
| `useArenaDialogModal({ open, panelRef, onDismiss })`, `arenaFocusableElements(container)`, `arenaFocusFirstFocusable(container)`, `arenaTrapTabKey(container, event, activeElement)` | the modal contract, for an overlay Arena does not ship. Arena's own dialogs run on these. A lightbox or a viewer of yours traps Tab, takes focus on open and restores the invoker on close. One piece of code does that, rather than a second one written from memory. Reach for this surface whenever the answer is that the markup is yours |
| `ARENA_MAIN_ID` | the id `ArenaMain` writes on its landmark and `ArenaSkipLink` points at, as a string. A page has one main region, so the id is a constant rather than something coordinated at the call site. Read it when you write a second route into the content, an anchor of your own, or a test that has to find the region |
| `arenaToneColor(tone)` | the colour a status tone resolves to, for a shape you draw yourself and want to keep meaning what the components mean by it. Status colours are meaning and the chart ramp is identity, so this is never a series colour. `neutral` returns the body ink at its own level as a `color-mix()` value. A status tone returns a `var()` of its colour. Keep the string it returns and never test it against a variable name |
| `arenaSrOnly` | the style object that hides an element from sight and keeps it for a screen reader, for markup of yours that needs a label the design does not show. `css/vocabulary/sr-only.css` is the same thing as a class |

## How do I raise a confirmation from code in React?

`useArenaConfirm()` asks from a handler and awaits the answer. You render the one open request once, with the dialog you already have.

```tsx
const confirms = useArenaConfirm();
const open = confirms.current;

return (
  <>
    {open && (
      <ArenaConfirmDialog open title={open.title} eyebrow={open.eyebrow}
        confirmLabel={open.confirmLabel} cancelLabel={open.cancelLabel}
        destructive={open.destructive} requireText={open.requireText}
        onConfirm={() => confirms.settle(open.id, true)} onCancel={() => confirms.settle(open.id, false)}>
        {open.message}
      </ArenaConfirmDialog>
    )}
  </>
);
```

`await confirms.ask({ title: 'Delete the project?', destructive: true })` answers `true` or `false`. One request is open at a time, in the order asked. A blank title throws at once. Every pending request answers `false` when the component that holds the queue unmounts.

## What does the Angular package export besides components?

Every component is standalone, so import the ones a template uses. **A parent does not bring its children with it.** A table needs `ArenaTableRow` and `ArenaTableCell` in the same `imports` array. So does every other family whose parts are separate elements. Everything else that reaches the package root is in this table.

| export | what it is |
| --- | --- |
| `provideArenaThemes`, `ArenaThemeService`, `arenaThemeClass`, `ArenaPalette`, `ArenaThemeConfig` | the theme surface, covered in [`theme.md`](./theme.md) |
| `provideArenaLocale`, `ARENA_LOCALE`, `arenaMergeLocale`, `ARENA_DEFAULT_LOCALE` | Arena's own words, covered in [`locale.md`](./locale.md) |
| `arenaContainerWidth(target?)` | `Signal<number \| null>` over the host's box, or the `ElementRef` you pass: its outer width, the border box with no transform, so subtract your padding and border for the content width. For a component or panel that has to fit its room. **The box is read in the render hook of the tick that first draws it, before the paint**, then a `ResizeObserver` follows it. A phone's first frame is already narrow. The width is `null` in a server render and for a box that never had a width, such as one first drawn hidden. A box hidden later keeps its last width. Render the wide branch while it is `null`, as a server's HTML does |
| `arenaViewportBelow(name)` | `Signal<boolean>` over `not all and (min-width: N)`, where `name` is `'sm' \| 'md' \| 'lg'` and resolves the same `--bp-*` token Arena's own components branch on. For a page's own layout, and **never for a component**: that is wrong the first time somebody puts it in a narrow column. Call `forgetArenaBreakpoints()` if your app swaps its stylesheet at runtime. **It answers from construction**, so the first change detection draws the right frame. A server render answers `false` until the client takes over, so a frame a server renders takes the `md:` and `max-md:` variants instead |
| `arenaCatColor(slot)`, `arenaCatIndex(slot)`, `arenaCatSurface(slot)`, `arenaCatTint(colour)`, `arenaCatSlotFor(key)`, `ARENA_CAT_SLOTS` | the chart ramp, for a legend or a chip you draw yourself. The ramp's order is its identity, so a slot means the same thing in every chart on the screen. `arenaCatIndex` clamps and rounds a number to the ramp's 1..8, the value `data-arena-color-id` carries. `arenaCatTint` is the soft surface an identity colour stands on, over whatever answers `fill-surface`; it takes a colour, not a slot, and fills `arenaCatSurface` |
| `ArenaToastQueue` | the notice queue, provided in root: it holds their identity and their order, and runs the clock `arena-toast-host` deliberately does not own. `raise(notice)` returns an id, `dismiss(id)` takes one away, and `toasts` is the signal you render into the host. The three-branch dismissal rule is inside it, including the one invisible in a signature: a `danger` notice is never put on a timer, and it ignores a `persist` of false |
| `ArenaConfirmQueue` | the confirmation queue, provided in root. `ask(request)` returns a promise of the answer, `current` is the signal holding the one open request, an `ArenaConfirmEntry`, and `settle(id, answer)` resolves it and opens the next |
| `arenaToastDelay(notice, dismiss)` | that rule on its own, for a queue of your own: the interval a notice runs on, or `null` when it must not be taken away |
| `isArenaPrimaryActivation(event)` | the predicate behind the anchor rule: true for a primary click with no modifier, false for every modified click, middle click and context menu |
| `isArenaOwnActivation(target, container)` | true when an activation landed on the container itself rather than on a link, a button, a field or any other interactive element inside it. The predicate is what lets a clickable row hold a checkbox and a row action without taking their presses |
| `arenaFocusableElements(container)`, `arenaFocusFirstFocusable(container)`, `arenaTrapTabKey(container, event, activeElement)`, `arenaHandleOpenTransition(state, isOpen, panel, activeElement)` | the modal contract, for an overlay Arena does not ship. Arena's own dialogs run on these. A lightbox or a viewer of yours traps Tab, takes focus on open and restores the invoker on close. One piece of code does that, rather than a second one written from memory. Reach for this surface whenever the answer is that the markup is yours |
| `arenaToneColor(tone)` | the colour a status tone resolves to, for a shape you draw yourself and want to keep meaning what the components mean by it. Status colours are meaning and the chart ramp is identity, so this is never a series colour. `neutral` returns the body ink at its own level as a `color-mix()` value. A status tone returns a `var()` of its colour. Keep the string it returns and never test it against a variable name |
| `ARENA_MAIN_ID` | the id `arena-main` writes on its landmark and `arena-skip-link` points at, as a string. A page has one main region, so the id is a constant rather than something coordinated at the call site. Read it when you write a second route into the content, an anchor of your own, or a test that has to find the region |
| `ARENA_SR_ONLY` | the style object that hides an element from sight and keeps it for a screen reader, for markup of yours that needs a label the design does not show. `css/vocabulary/sr-only.css` is the same thing as a class |

Call either measurement from an injection context, a field initializer or the constructor. `DestroyRef` disconnects the observer. `afterNextRender` decides when there is a box to measure at all.

The `<head>` writer is not in that table. The writer lives at `@dravensoft/arena-angular/metadata`, and [`seo.md`](./seo.md) covers it.

## How do I raise a confirmation from code in Angular?

`ArenaConfirmQueue` asks from a service and awaits the answer. You render the one open request once, in your shell, with the dialog you already have.

```html
@if (confirms.current(); as c) {
  <arena-confirm-dialog [open]="true" [title]="c.title" [eyebrow]="c.eyebrow"
    [confirmLabel]="c.confirmLabel" [cancelLabel]="c.cancelLabel"
    [destructive]="c.destructive" [requireText]="c.requireText"
    (confirm)="confirms.settle(c.id, true)" (cancel)="confirms.settle(c.id, false)">
    {{ c.message }}
  </arena-confirm-dialog>
}
```

`await confirms.ask({ title: 'Delete the project?', destructive: true })` answers `true` or `false`. One request is open at a time, in the order asked. A blank title throws at once. Every pending request answers `false` when the injector is destroyed.

## Which Angular projection markers must I import?

Each marker directive stands behind one attribute, and none is optional.

- `ArenaAction` behind `[action]`.
- `ArenaActions` behind `[actions]`.
- `ArenaBrand` behind `[brand]`.
- `ArenaFooter` behind `[footer]`.
- `ArenaSecondaryAction` behind `[secondaryAction]`.
- `ArenaFigureSlot` behind `[figure]`.
- `ArenaMedia` behind `[media]`.
- `ArenaFallback` behind `[fallback]`.
- `ArenaOverlay` behind `[overlay]`.
- `ArenaNav` behind `[nav]`.

`ArenaFigureSlot` is the one whose name is not its attribute capitalised. `ArenaFigure` is the component that holds the slot.

**Put the marker your template writes in that component's own `imports`.** A component detects a projected slot with a `contentChild` on the directive. An un-imported marker leaves the query null and the slot silently unrendered. There is no error and no template diagnostic.

A bare `footer` attribute on a `<div>` is valid HTML whether or not a directive matches it. The component cannot tell an un-imported marker from an unfilled slot. Nothing can warn you at compile time. `arena check` reports the marker on every run, and [`cli.md`](./cli.md) says how.

## How do I bind Angular reactive forms to Arena controls?

`@dravensoft/arena-angular/forms` binds every data-entry control to `@angular/forms`, an optional peer. Install it and add the directives once.

```ts
import { ReactiveFormsModule } from '@angular/forms';
import { ARENA_FORM_CONTROLS } from '@dravensoft/arena-angular/forms';

@Component({
  imports: [ReactiveFormsModule, ArenaInput, ArenaSwitch, ...ARENA_FORM_CONTROLS],
  template: `<arena-input label="Name" formControlName="name" [error]="name.touched ? messageFor(name.errors) : ''" />`,
})
```

`formControl`, `formControlName` and `ngModel` work on `arena-input`, `arena-textarea`, `arena-select`, `arena-checkbox`, `arena-radio-group` and `arena-switch`. Each directive is also exported alone: `ArenaInputControl`, `ArenaTextareaControl`, `ArenaSelectControl`, `ArenaCheckboxControl`, `ArenaRadioGroupControl` and `ArenaSwitchControl`.

What a control carries as its value:

- The input carries a `string`, or a `number` when its `type` is `number`. An emptied number field reports `null`.
- The checkbox and the switch carry a `boolean`.
- The select and the radio group carry a `string`.

`disable()` disables the control. Leaving the control marks it touched.

**While a form binds a control, the form's value is drawn.** The control's own `value`, `checked` or `state` is ignored. Binding both warns once.

A switch with `confirm` reports nothing when pressed. Confirm first, then call `setValue`.

**Arena never turns a validator's error into words.** Copy is yours. Pass `error` from your own messages, as the example does.
