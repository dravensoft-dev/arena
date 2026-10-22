# What each package exports besides the components

Which helpers, hooks, services and constants does the React or Angular package export besides components? Which ones carry a compatibility promise? How do I raise a toast or a confirmation from code, trap focus in an overlay of my own, route my own anchor, or change density below a breakpoint? Which Angular marker directives must I import? How do I bind Angular reactive forms? How do I take the files a file input holds? Read this before you write a second copy of something a package already exports.

A name on this page may be leaned on. A symbol you found by autocomplete may not. [`media-register.md`](./media-register.md) says when the markup is yours and which of these exports to reach for.

## Does every export carry a compatibility promise?

Only the names listed on this page do. Every other symbol reaching a package root is an internal of that layer. The barrel is generated wholesale and not curated. Such a symbol carries no compatibility promise. The symbol carries the `Arena` prefix too, since the convention is about the name and not about the promise. Reading `Arena` on a symbol tells you where it comes from. The prefix never tells you the symbol is yours to depend on.

## What does the React package export besides components?

Every component is imported from the package root, and its types ship with it. The types are emitted from the components' own source. Everything else that reaches the root is in this table.

| export | what it is |
| --- | --- |
| `initArenaTheme`, `useArenaTheme`, `getArenaTheme`, `setArenaTheme`, `toggleArenaTheme`, `arenaPalettes`, `ArenaPalette`, `ArenaThemeConfig` | the theme surface, covered in [`theme.md`](./theme.md) |
| `useArenaPalette` | the palette of the nearest `ArenaPaletteScope`, else the page theme, covered in [`theme.md`](./theme.md#how-do-i-put-a-palette-on-part-of-a-page) |
| `ArenaLocaleProvider`, `useArenaLocale`, `arenaMergeLocale`, `ARENA_DEFAULT_LOCALE` | Arena's own words, covered in [`locale.md`](./locale.md) |
| `useArenaContainerWidth(target?)` | `[ref, width]`: attach the ref to the box and read its outer width, the border box with no transform applied. Subtract your own padding and border when you need the content width. For a component or a panel that has to fit the room it was given. **The hook measures when React attaches the ref, before the browser paints**, then a `ResizeObserver` follows the box. A phone's first frame is already narrow, as Arena's own components are. `width` is `null` in a server render and for a box that has never had a width, such as one first drawn in a hidden parent. A box hidden later keeps its last width. Render the wide branch while `width` is `null`, which is what a server's HTML carries. Pass a `useRef` as `target`; a sealed ref is measured after the paint |
| `useArenaViewportBelow(name)` | a boolean over `not all and (min-width: N)`, where `name` is `'sm' \| 'md' \| 'lg'` and resolves the same `--bp-*` token Arena's own components branch on. For a page's own layout, such as swapping `arena-compact` for `arena-comfortable` below a breakpoint, and **never for a component**: that is wrong the first time somebody puts it in a narrow column. [How do I change density below a breakpoint?](#how-do-i-change-density-below-a-breakpoint) has it in use. Call `forgetArenaBreakpoints()` if your app swaps its stylesheet at runtime. **It answers in the first client render.** A server render answers `false` until the client takes over, so a frame a server renders takes the `md:` and `max-md:` variants instead |
| `useArenaRowWindow(options)` | `{ ref, style, offset, count, padTop, padBottom, slice, scrollToRow, onRowRequest }`: attach `ref` and `style` to the box that scrolls a long table, and render only the `count` rows from `offset`. `total` is the length of the whole list. `rowHeight` is the estimate before the first reading, `overscan` is the rows kept beyond each edge, and `enabled` false projects the first rows with no padding. **The hook measures every mounted row after layout**, so rows may wrap and differ in height, and a table below `md` windows its cards the same way. A server render and the first client render project the same first rows, so the HTML agrees. `scrollToRow(index)` puts a row at the top edge and `onRowRequest(index)` scrolls only as far as the row needs. Neither moves focus. [How do I window a long table?](#how-do-i-window-a-long-table) has it in use |
| `arenaCatColor(slot)`, `arenaCatIndex(slot)`, `arenaCatSurface(slot)`, `arenaCatTint(colour)`, `arenaCatSlotFor(key)`, `arenaCatRotate(start, position)`, `ARENA_CAT_SLOTS` | the chart ramp, for a legend or a chip you draw yourself. The ramp's order is its identity, so a slot means the same thing in every chart on the screen. `arenaCatIndex` clamps and rounds a number to the ramp's 1..8, the value `data-arena-color-id` carries. `arenaCatTint` is the soft surface an identity colour stands on, over whatever answers `fill-surface`; it takes a colour, not a slot, and fills `arenaCatSurface`, which returns `{ fill, border }`. `arenaCatSlotFor` hashes a key to a stable slot, so two keys may share one; give series their slots in order when they must differ. `arenaCatRotate` counts a position from a start slot and wraps after the last slot |
| `useArenaToasts()` | the notice queue: it holds their identity and their order, and runs the clock `ArenaToastHost` deliberately does not own. `raise(notice)` returns an id, `dismiss(id)` takes one away, `clear()` takes them all, and `toasts` is what you render into the host. Each is an `ArenaToastEntry`, the notice plus its `id`. The queue applies the dismissal rule in [How long does a raised toast stay?](#how-long-does-a-raised-toast-stay) |
| `useArenaConfirm()` | the confirmation queue. `ask(request)` returns a promise of the answer, `current` is the one open entry, an `ArenaConfirmEntry`: the request plus its `id`. `settle(id, answer)` resolves it and opens the next |
| `arenaToastDelay(notice, dismiss)`, `ARENA_TOAST_DISMISS` | the dismissal rule of [How long does a raised toast stay?](#how-long-does-a-raised-toast-stay) on its own, for a queue of your own: the interval a notice runs on, or `null` when it must not be taken away. Pass `ARENA_TOAST_DISMISS` as `dismiss` |
| `isArenaPrimaryActivation(event)` | the predicate behind the anchor rule: true for a primary click with no modifier, false for every modified click, middle click and context menu. The predicate reads a pointer event, so Enter on an element of yours is a `keydown` you handle beside it |
| `isArenaOwnActivation(target, container)` | true when an activation landed on the container itself rather than on a link, a button, a field or any other interactive element inside it. The predicate is what lets a clickable row hold a checkbox and a row action without taking their presses. A `label` counts as interactive too, and so does an element whose `role` is a control's, such as a radio, a slider, a combobox or a tree item. A cell, a row or a panel is not a control, so a press on one is still the container's. [How do I route an activation of my own?](#how-do-i-route-an-activation-of-my-own) has both in use |
| `useArenaDialogModal({ open, panelRef, onDismiss })`, `arenaFocusableElements(container)`, `arenaFocusFirstFocusable(container)`, `arenaTrapTabKey(container, event, activeElement)` | the modal contract, for an overlay Arena does not ship. Arena's own dialogs run on these. A lightbox or a viewer of yours traps Tab, takes focus on open and restores the invoker on close. One piece of code does that, rather than a second one written from memory. Reach for this surface whenever the answer is that the markup is yours. The hook returns the `onKeyDown` handler for the element around the panel, and [How do I trap focus in an overlay of my own in React?](#how-do-i-trap-focus-in-an-overlay-of-my-own-in-react) wires it |
| `ARENA_MAIN_ID` | the id `ArenaMain` writes on its landmark and `ArenaSkipLink` points at, as a string. A page has one main region, so the id is a constant rather than something coordinated at the call site. Read it when you write a second route into the content, an anchor of your own, or a test that has to find the region |
| `arenaToneColor(tone)` | `tone` is an `ArenaTone`: `'neutral'`, `'success'`, `'warning'`, `'danger'` or `'info'`. The colour a status tone resolves to, for a shape you draw yourself and want to keep meaning what the components mean by it. Status colours are meaning and the chart ramp is identity, so this is never a series colour. `neutral` returns the body ink at its own level as a `color-mix()` value. A status tone returns a `var()` of its colour. Keep the string it returns and never test it against a variable name |
| `arenaSrOnly` | the style object that hides an element from sight and keeps it for a screen reader, for markup of yours that needs a label the design does not show. The class `arena-sr-only`, from `css/vocabulary/sr-only.css`, is the same thing, and `arena-num` beside it sets a figure in tabular digits; [`style.md`](./style.md) has both |
| `arenaBreadcrumbList(items, origin?)` | the `schema.org` `BreadcrumbList` for a trail of your own, as a string of JSON-LD already escaped by `arenaEscapeJsonLd`, ready to be the text of a `<script type="application/ld+json">`. `items` is a list of `ArenaCrumb`, each a `label` and an optional `href`, absent on the current page. Pass `origin` and each `href` is published as an absolute address; without it the addresses go out as written. For breadcrumbs that do not use `ArenaBreadcrumbs`, which publishes this itself. [`seo.md`](./seo.md) has the script |

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

## How long does a raised toast stay?

<!-- @shared toast GENERATED by bun run generate:npm-pages. Edit that script, not this copy. -->

**A notice leaves on one of three branches.** The default interval is 4200 ms. The interval for a notice carrying an `actionLabel` is 7000 ms, because that notice asks the reader to decide and not only to read. A notice raised with `persist`, or with `tone: 'danger'`, has no timer at all and stays until it is dismissed. A `danger` notice ignores a `persist` of false.

<!-- @shared toast end -->

## What does a notice or a confirmation request carry?

<!-- @shared queues GENERATED by bun run generate:npm-pages. Edit that script, not this copy. -->

**`raise(notice)` takes an `ArenaToastNotice`.** Every field is optional.

| field | type | required | default | what it means |
| --- | --- | --- | --- | --- |
| `title` | `string` | no | none | The bold lead line. |
| `message` | `string` | no | none | The body. |
| `tone` | `ArenaToastTone` | no | `neutral` | The side bar's colour: neutral reports no outcome, success and danger report one. A danger notice persists. |
| `actionLabel` | `string` | no | none | The label of the single inline action. Absent, or blank, renders no action and the notice takes the plain interval. |
| `persist` | `boolean` | no | `false` | Disables the auto-dismiss and shows the Pinned marker. A danger notice persists whatever this says. |
| `dismissible` | `boolean` | no | `false` | Whether the × is shown. |

**`ask(request)` takes an `ArenaConfirmRequest`.** Only `title` is required.

| field | type | required | default | what it means |
| --- | --- | --- | --- | --- |
| `title` | `string` | yes | none | Names the dialog. Required: asking with a blank title is refused at once. |
| `message` | `string` | no | none | The dialog's body text. |
| `eyebrow` | `string` | no | none | The short kicker above the title. |
| `confirmLabel` | `string` | no | none | The confirming button. |
| `cancelLabel` | `string` | no | none | The cancelling button. |
| `destructive` | `boolean` | no | `false` | Whether confirming is the final irreversible step, drawn as the one filled danger surface. |
| `requireText` | `string` | no | none | Text the reader must type before the confirming button is enabled. |

<!-- @shared queues end -->

## How do I raise a toast from code in React?

`useArenaToasts()` holds local state: each call makes a queue of its own. Mount it once in the app shell, render `toasts` into `ArenaToastHost`, whose prompt is [`ArenaToastHost.prompt.md`](../../../frameworks/react/components/feedback/arena-toast-host/ArenaToastHost.prompt.md), and hand the queue down by React context to every component that raises one. `useArenaConfirm()` is local state too, so a second call in a child opens a separate queue.

```tsx
import { createContext, useContext, type ReactNode } from 'react';
import {
  ArenaButton, ArenaConfirmDialog, ArenaToast, ArenaToastHost, useArenaConfirm, useArenaToasts,
  type ArenaConfirmQueue, type ArenaToastQueue,
} from '@dravensoft/arena-react';

const ToastContext = createContext<ArenaToastQueue | null>(null);
export const useToasts = () => {
  const queue = useContext(ToastContext);
  if (!queue) throw new Error('useToasts needs the shell above it');
  return queue;
};

const ConfirmContext = createContext<ArenaConfirmQueue | null>(null);
export const useConfirms = () => {
  const queue = useContext(ConfirmContext);
  if (!queue) throw new Error('useConfirms needs the shell above it');
  return queue;
};

export function Shell({ children }: { children: ReactNode }) {
  const queue = useArenaToasts();
  const confirms = useArenaConfirm();
  const open = confirms.current;
  const undo = (id: number) => { restore(id); queue.dismiss(id); };
  return (
    <ToastContext.Provider value={queue}>
      <ConfirmContext.Provider value={confirms}>
        {children}
        {open && (
          <ArenaConfirmDialog open title={open.title} eyebrow={open.eyebrow}
            confirmLabel={open.confirmLabel} cancelLabel={open.cancelLabel}
            destructive={open.destructive} requireText={open.requireText}
            onConfirm={() => confirms.settle(open.id, true)} onCancel={() => confirms.settle(open.id, false)}>
            {open.message}
          </ArenaConfirmDialog>
        )}
        <ArenaToastHost>
          {queue.toasts.map((t) => (
            <ArenaToast key={t.id} tone={t.tone} title={t.title} message={t.message}
              actionLabel={t.actionLabel} persist={t.persist} dismissible={t.dismissible}
              onAction={() => undo(t.id)} onClose={() => queue.dismiss(t.id)} />
          ))}
        </ArenaToastHost>
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

function SaveButton() {
  const toasts = useToasts();
  return <ArenaButton onClick={() => toasts.raise({ title: 'Saved', actionLabel: 'Undo' })}>Save</ArenaButton>;
}

function DeleteButton() {
  const confirms = useConfirms();
  return (
    <ArenaButton onClick={async () => {
      if (await confirms.ask({ title: 'Delete the project?', destructive: true })) remove();
    }}>Delete</ArenaButton>
  );
}
```

A notice is data: it carries the action's label and never its handler, so `restore` is yours, keyed by the id `raise` returned, and the notice closes after it.

## How do I trap focus in an overlay of my own in React?

Call the hook above the early return, put its handler on the element around the panel, and give the panel its role, its name and `tabindex="-1"`. The hook focuses the panel itself when nothing inside it can take focus.

```tsx
import { useRef } from 'react';
import { useArenaDialogModal } from '@dravensoft/arena-react';

function Lightbox({ open, label, onClose, children }: { open: boolean; label: string; onClose: () => void; children: React.ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onKeyDown = useArenaDialogModal({ open, panelRef, onDismiss: onClose });
  if (!open) return null;
  return (
    <div className="lightbox" onKeyDown={onKeyDown}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
```

Tab wraps inside the panel and Escape calls `onDismiss`. Focus goes back to the invoker when `open` turns false. Close the overlay through `open` and keep the component calling the hook mounted, because unmounting it at once leaves focus nowhere. [`media-register.md`](./media-register.md) says what the overlay itself draws.

## What does the Angular package export besides components?

Every component is standalone, so import the ones a template uses. **A parent does not bring its children with it.** A table needs `ArenaTableRow` and `ArenaTableCell` in the same `imports` array. So does every other family whose parts are separate elements. Everything else that reaches the package root is in this table.

| export | what it is |
| --- | --- |
| `provideArenaThemes`, `ArenaThemeService`, `arenaThemeClass`, `ArenaPalette`, `ArenaThemeConfig` | the theme surface, covered in [`theme.md`](./theme.md) |
| `injectArenaPalette`, `ARENA_PALETTE` | `injectArenaPalette()` is a `Signal<string>` over the palette of the nearest `ArenaPaletteScope`, else the page theme, and `ARENA_PALETTE` is the token the scope provides it under, covered in [`theme.md`](./theme.md#how-do-i-put-a-palette-on-part-of-a-page) |
| `provideArenaLocale`, `ARENA_LOCALE`, `arenaMergeLocale`, `ARENA_DEFAULT_LOCALE` | Arena's own words, covered in [`locale.md`](./locale.md) |
| `arenaContainerWidth(target?)` | `Signal<number \| null>` over the host's box, or the `ElementRef` you pass: its outer width, the border box with no transform, so subtract your padding and border for the content width. For a component or panel that has to fit its room. **The box is read in the render hook of the tick that first draws it, before the paint**, then a `ResizeObserver` follows it. A phone's first frame is already narrow. The width is `null` in a server render and for a box that never had a width, such as one first drawn hidden. A box hidden later keeps its last width. Render the wide branch while it is `null`, as a server's HTML does |
| `arenaViewportBelow(name)` | `Signal<boolean>` over `not all and (min-width: N)`, where `name` is `'sm' \| 'md' \| 'lg'` and resolves the same `--bp-*` token Arena's own components branch on. For a page's own layout, such as swapping `arena-compact` for `arena-comfortable` below a breakpoint, and **never for a component**: that is wrong the first time somebody puts it in a narrow column. [How do I change density below a breakpoint?](#how-do-i-change-density-below-a-breakpoint) has it in use. Call `forgetArenaBreakpoints()` if your app swaps its stylesheet at runtime. **It answers from construction**, so the first change detection draws the right frame. A server render answers `false` until the client takes over, so a frame a server renders takes the `md:` and `max-md:` variants instead |
| `arenaCatColor(slot)`, `arenaCatIndex(slot)`, `arenaCatSurface(slot)`, `arenaCatTint(colour)`, `arenaCatSlotFor(key)`, `arenaCatRotate(start, position)`, `ARENA_CAT_SLOTS` | the chart ramp, for a legend or a chip you draw yourself. The ramp's order is its identity, so a slot means the same thing in every chart on the screen. `arenaCatIndex` clamps and rounds a number to the ramp's 1..8, the value `data-arena-color-id` carries. `arenaCatTint` is the soft surface an identity colour stands on, over whatever answers `fill-surface`; it takes a colour, not a slot, and fills `arenaCatSurface`, which returns `{ fill, border }`. `arenaCatSlotFor` hashes a key to a stable slot, so two keys may share one; give series their slots in order when they must differ. `arenaCatRotate` counts a position from a start slot and wraps after the last slot |
| `ArenaRowWindow` | the directive `arenaRowWindow` on the box that scrolls a long table, exported as `#w="arenaRowWindow"`. The directive offers `offset`, `count`, `padTop`, `padBottom` and `slice` as signals, and sets the box's `overflow-anchor` and `scroll-padding-top` itself. `total` is the length of the whole list. `rowHeight` is the estimate before the first reading, `overscan` is the rows kept beyond each edge, and `enabled` false projects the first rows with no padding. **The directive measures every mounted row after the render**, so rows may wrap and differ in height, and a table below `md` windows its cards the same way. The first render projects the first rows before anything is measured. `scrollToRow(index)` puts a row at the top edge and `onRowRequest(index)` scrolls only as far as the row needs. Neither moves focus. [How do I window a long table in Angular?](#how-do-i-window-a-long-table-in-angular) has it in use |
| `ArenaToastQueue` | the notice queue, provided in root: it holds their identity and their order, and runs the clock `arena-toast-host` deliberately does not own. `raise(notice)` returns an id, `dismiss(id)` takes one away, `clear()` takes them all, and `toasts` is the signal you render into the host. Each is an `ArenaToastEntry`, the notice plus its `id`. The queue applies the dismissal rule in [How long does a raised toast stay?](#how-long-does-a-raised-toast-stay) |
| `ArenaConfirmQueue` | the confirmation queue, provided in root. `ask(request)` returns a promise of the answer, `current` is the signal holding the one open entry, an `ArenaConfirmEntry`: the request plus its `id`. `settle(id, answer)` resolves it and opens the next |
| `arenaToastDelay(notice, dismiss)`, `ARENA_TOAST_DISMISS` | the dismissal rule of [How long does a raised toast stay?](#how-long-does-a-raised-toast-stay) on its own, for a queue of your own: the interval a notice runs on, or `null` when it must not be taken away. Pass `ARENA_TOAST_DISMISS` as `dismiss` |
| `isArenaPrimaryActivation(event)` | the predicate behind the anchor rule: true for a primary click with no modifier, false for every modified click, middle click and context menu. The predicate reads a pointer event, so Enter on an element of yours is a `keydown` you handle beside it |
| `isArenaOwnActivation(target, container)` | true when an activation landed on the container itself rather than on a link, a button, a field or any other interactive element inside it. The predicate is what lets a clickable row hold a checkbox and a row action without taking their presses. A `label` counts as interactive too, and so does an element whose `role` is a control's, such as a radio, a slider, a combobox or a tree item. A cell, a row or a panel is not a control, so a press on one is still the container's. [How do I route an activation of my own?](#how-do-i-route-an-activation-of-my-own) has both in use |
| `arenaFocusableElements(container)`, `arenaFocusFirstFocusable(container)`, `arenaTrapTabKey(container, event, activeElement)`, `arenaHandleOpenTransition(state, isOpen, panel, activeElement)`, `FocusTrapState` | the modal contract, for an overlay Arena does not ship. Arena's own dialogs run on these. A lightbox or a viewer of yours traps Tab, takes focus on open and restores the invoker on close. One piece of code does that, rather than a second one written from memory. Reach for this surface whenever the answer is that the markup is yours. `state` is a `FocusTrapState`, `{ wasOpen: false, restoreTo: null }` when you create it, and [How do I trap focus in an overlay of my own in Angular?](#how-do-i-trap-focus-in-an-overlay-of-my-own-in-angular) wires all of it |
| `arenaToneColor(tone)` | `tone` is an `ArenaTone`: `'neutral'`, `'success'`, `'warning'`, `'danger'` or `'info'`. The colour a status tone resolves to, for a shape you draw yourself and want to keep meaning what the components mean by it. Status colours are meaning and the chart ramp is identity, so this is never a series colour. `neutral` returns the body ink at its own level as a `color-mix()` value. A status tone returns a `var()` of its colour. Keep the string it returns and never test it against a variable name |
| `ARENA_MAIN_ID` | the id `arena-main` writes on its landmark and `arena-skip-link` points at, as a string. A page has one main region, so the id is a constant rather than something coordinated at the call site. Read it when you write a second route into the content, an anchor of your own, or a test that has to find the region |
| `ARENA_SR_ONLY` | the style object that hides an element from sight and keeps it for a screen reader, for markup of yours that needs a label the design does not show. The class `arena-sr-only`, from `css/vocabulary/sr-only.css`, is the same thing, and `arena-num` beside it sets a figure in tabular digits; [`style.md`](./style.md) has both |
| `arenaBreadcrumbList(items, origin?)` | the `schema.org` `BreadcrumbList` for a trail of your own, as a string of JSON-LD already escaped by `arenaEscapeJsonLd`, ready to be the text of a `<script type="application/ld+json">`. `items` is a list of `ArenaCrumb`, each a `label` and an optional `href`, absent on the current page. Pass `origin` and each `href` is published as an absolute address; without it the addresses go out as written. For breadcrumbs that do not use `ArenaBreadcrumbs`, which publishes this itself. [`seo.md`](./seo.md) has the script |

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

## How do I raise a toast from code in Angular?

`ArenaToastQueue` is provided in root, so any component or service injects it and calls `raise`. Render `toasts()` once in the app shell, inside `arena-toast-host`, whose prompt is [`ArenaToastHost.prompt.md`](../../../frameworks/angular/components/feedback/arena-toast-host/ArenaToastHost.prompt.md).

```ts
import { Component, inject } from '@angular/core';
import { ArenaToast, ArenaToastHost, ArenaToastQueue } from '@dravensoft/arena-angular';

@Component({
  selector: 'app-shell',
  imports: [ArenaToastHost, ArenaToast],
  template: `
    <arena-toast-host class="arena-placement-bottom-end">
      @for (notice of toasts.toasts(); track notice.id) {
        <arena-toast [title]="notice.title" [message]="notice.message" [tone]="notice.tone"
          [actionLabel]="notice.actionLabel" [persist]="notice.persist" [dismissible]="notice.dismissible"
          (action)="retry(notice.id)" (close)="toasts.dismiss(notice.id)" />
      }
    </arena-toast-host>`,
})
export class Shell {
  protected readonly toasts = inject(ArenaToastQueue);
  protected retry(id: number) { /* yours, keyed by the id raise returned */ }
}
```

Any other component or service injects the queue as a field and calls `raise` from a method.

```ts
@Component({ selector: 'app-save', template: `<button type="button" (click)="save()">Save</button>` })
export class Save {
  private readonly toasts = inject(ArenaToastQueue);
  protected save() {
    this.toasts.raise({ title: 'Saved', actionLabel: 'Undo' });
  }
}
```

A notice is data: it carries the action's label and never its handler.

## How do I trap focus in an overlay of my own in Angular?

Keep a `FocusTrapState`, run the open transition in an `afterRenderEffect`, and trap Tab and close on Escape from the host's `keydown`. `arena-dialog` runs on the same functions the same way.

```ts
import { Component, DOCUMENT, ElementRef, afterRenderEffect, inject, input, output, untracked, viewChild } from '@angular/core';
import { type FocusTrapState, arenaHandleOpenTransition, arenaTrapTabKey } from '@dravensoft/arena-angular';

@Component({
  selector: 'app-lightbox',
  host: { '(keydown)': 'onKeydown($event)' },
  template: `@if (open()) {
    <div #panel role="dialog" aria-modal="true" [attr.aria-label]="label()" tabindex="-1"><ng-content /></div>
  }`,
})
export class Lightbox {
  readonly open = input.required<boolean>();
  readonly label = input.required<string>();
  readonly close = output<void>();
  private readonly doc = inject(DOCUMENT);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly trap: FocusTrapState = { wasOpen: false, restoreTo: null };

  constructor() {
    afterRenderEffect(() => {
      const isOpen = this.open();
      untracked(() => arenaHandleOpenTransition(this.trap, isOpen, this.panel()?.nativeElement ?? null, this.doc.activeElement));
    });
  }

  protected onKeydown(event: KeyboardEvent) {
    if (!this.open()) return;
    if (event.key === 'Escape') { event.preventDefault(); this.close.emit(); return; }
    const panel = this.panel()?.nativeElement;
    if (event.key === 'Tab' && panel) arenaTrapTabKey(panel, event, this.doc.activeElement);
  }
}
```

The transition focuses the first focusable element on open, or the panel itself when there is none, and gives focus back to the invoker on close. Escape is yours to wire, as above. [`media-register.md`](./media-register.md) says what the overlay itself draws.

## Is there a roving-focus helper?

No layer exports one. In Angular use the key managers of `@angular/cdk/a11y`, a peer the package already requires: [`install.md`](./install.md#what-comes-down-with-the-angular-package) says why. In React write the keys yourself, as the behaviour contract of the pattern names them. The React package carries them as `contracts/behaviour/<pattern>.json`, and [`contracts.md`](./contracts.md) says how to read one.

## How do I hide a label or align figures in markup of my own?

The classes `arena-num` and `arena-sr-only` arrive with Arena's stylesheet, `arena.css`, through `css/vocabulary/num.css` and `css/vocabulary/sr-only.css`. [`style.md`](./style.md) says what each does.

```tsx
// React: the style object, or the class
<button type="button" onClick={close}><span style={arenaSrOnly}>Close</span></button>
<td className="arena-num">{total}</td>
```

```ts
// Angular: expose the constant as a field, then bind it with [style]
protected readonly ARENA_SR_ONLY = ARENA_SR_ONLY;
// template: <button type="button" (click)="close()"><span [style]="ARENA_SR_ONLY">Close</span></button>
//           <td class="arena-num">{{ total }}</td>
```

## How do I colour a legend or a chip of my own?

`arenaCatColor(slot)` returns `var(--color-cat-n)` for a slot of the ramp, and a slot past the ramp takes the last one. `arenaCatSurface(slot)` returns `{ fill, border }`, the tinted surface and edge of that colour. `arenaToneColor(tone)` returns the colour of a status tone. All three read the `--color-cat-*` properties and the tone colours that `arena build` writes from your palette. Load the stylesheet that build produces. `arenaCatRotate(start, position)` returns the slot a chart assigns by position, counted from its `colorStart` and wrapping after the last slot. A legend of your own then matches a chart drawn with `colorStart`.

```tsx
// React
const surface = arenaCatSurface(2);

<i style={{ background: arenaCatColor(2) }} />
<i style={{ background: arenaCatColor(arenaCatRotate(6, index)) }} /> {/* the series at index in a chart with colorStart={6} */}
<span style={{ background: surface.fill, border: `var(--bw-surface) solid ${surface.border}` }}>Deploy</span>
<b style={{ color: arenaToneColor('danger') }}>Failed</b>
```

```ts
// Angular: expose the functions as fields
protected readonly catColor = arenaCatColor;
protected readonly catSurface = arenaCatSurface;
protected readonly toneColor = arenaToneColor;
// template: <i [style.background]="catColor(2)"></i>
//           <span [style.background]="catSurface(2).fill" [style.border]="'var(--bw-surface) solid ' + catSurface(2).border">Deploy</span>
//           <b [style.color]="toneColor('danger')">Failed</b>
```

## How do I colour a chart library of my own?

An SVG or DOM library takes the strings the helpers above return as they are, because `var(--color-cat-1)` resolves where the element is painted. A canvas library cannot paint a `var()`. Resolve the custom property to a colour first, from the element the canvas sits in, so a canvas inside a palette island reads the island's colours and not the page's.

```ts
function readColours(canvas: HTMLCanvasElement) {
  const style = getComputedStyle(canvas);
  return [1, 2, 3].map((slot) => style.getPropertyValue(`--color-cat-${slot}`).trim());
}
```

The colours change with the palette, so resolve them again when the palette of that element changes. The two examples below are allowed, untested: Arena ships no chart-library adapter, and the calls follow each library's documented API.

Chart.js paints a bar chart on a canvas. The categorical array is the `backgroundColor`.

```ts
import { Chart } from 'chart.js/auto';

const read = (el: Element, name: string) => getComputedStyle(el).getPropertyValue(name).trim();
const categorical = (el: Element) => [1, 2, 3].map((slot) => read(el, `--color-cat-${slot}`));

function drawBars(canvas: HTMLCanvasElement) {
  return new Chart(canvas, {
    type: 'bar',
    data: { labels: ['Deploy', 'Build', 'Test'], datasets: [{ data: [12, 19, 7], backgroundColor: categorical(canvas) }] },
  });
}
```

D3 draws an SVG heat cell scale over the heat array.

```ts
import { scaleQuantize, select } from 'd3';

const heat = (el: Element) => [1, 2, 3, 4, 5].map((step) => read(el, `--heat-step-${step}`));
const cells = [{ x: 0, y: 0, value: 3 }, { x: 1, y: 0, value: 8 }, { x: 2, y: 0, value: 14 }];

function drawHeat(svg: SVGSVGElement) {
  const scale = scaleQuantize<string>().domain([0, 14]).range(heat(svg));
  select(svg).selectAll('rect').data(cells).join('rect')
    .attr('x', (d) => d.x * 24).attr('y', (d) => d.y * 24)
    .attr('width', 22).attr('height', 22)
    .attr('fill', (d) => scale(d.value));
}
```

In React `useArenaPalette()` re-renders its component with the palette of the nearest `ArenaPaletteScope`, or the page theme outside one. An effect keyed on that name updates the Chart.js instance and joins the D3 selection again. A bare palette class is not a scope the hook sees. A chart therefore sits inside an `ArenaPaletteScope` that its parent mounts, and not under a bare class.

```tsx
import { useEffect } from 'react';
import { useArenaPalette } from '@dravensoft/arena-react';

function useChartRedraw(chart: Chart, canvas: HTMLCanvasElement, svg: SVGSVGElement) {
  const palette = useArenaPalette();
  useEffect(() => {
    chart.data.datasets[0].backgroundColor = categorical(canvas);
    chart.update();
    drawHeat(svg);
  }, [palette]);
}
```

In Angular `injectArenaPalette()` is a signal, and an `afterRenderEffect` that reads it runs once the new palette is applied to the document and to the scope.

```ts
import { afterRenderEffect, Component, ElementRef, viewChild } from '@angular/core';
import { injectArenaPalette } from '@dravensoft/arena-angular';

@Component({
  selector: 'app-chart-panel',
  template: `<canvas #canvas></canvas><svg #svg width="72" height="22"></svg>`,
})
export class ChartPanel {
  private readonly palette = injectArenaPalette();
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly svg = viewChild.required<ElementRef<SVGSVGElement>>('svg');
  private chart?: Chart;

  constructor() {
    afterRenderEffect(() => {
      this.palette();
      const canvas = this.canvas().nativeElement;
      this.chart ??= drawBars(canvas);
      this.chart.data.datasets[0].backgroundColor = categorical(canvas);
      this.chart.update();
      drawHeat(this.svg().nativeElement);
    });
  }
}
```

[`theme.md`](./theme.md) covers both layers.

The sequential ramp is the heat ladder, `--heat-step-1` to `--heat-step-5`. `ArenaHeatmapChart` paints those roles. Order is magnitude: step 1 is the least and each step is further from the surface, in a light palette and in a dark one. The palette's `--color-heat-1` to `--color-heat-5` is what the roles take by default, and a style plugin may answer them with other colours, in the same order of magnitude. A chart reads the roles. A change of palette or of plugin redraws the same way.

```ts
function readHeat(el: Element) {
  const style = getComputedStyle(el);
  return [1, 2, 3, 4, 5].map((step) => style.getPropertyValue(`--heat-step-${step}`).trim());
}
```

The ladder reads from the element the chart is drawn in, as the categorical colours do.

No diverging ramp ships.

## How do I route an activation of my own?

**An Arena component with an `href` reports its activation through its own event, and your router's navigate in that handler is the whole bridge.** Never wrap the component in your router's link. An element you draw yourself takes the same split through the two predicates: a primary click is routed, and every other press stays the browser's or the control's.

```tsx
// React: an anchor of your own, and a surface of your own holding controls
<a href={`/orders/${id}`} onClick={(event) => {
  if (!isArenaPrimaryActivation(event)) return;
  event.preventDefault();
  navigate(`/orders/${id}`);
}}>{label}</a>

<article onClick={(event) => { if (isArenaOwnActivation(event.target, event.currentTarget)) open(id); }}>
  <button type="button" onClick={like}>Like</button>
</article>
```

```ts
// Angular: the same two handlers in a component
protected follow(event: MouseEvent, url: string) {
  if (!isArenaPrimaryActivation(event)) return;
  event.preventDefault();
  void this.router.navigateByUrl(url);
}
protected openPost(event: MouseEvent, row: HTMLElement, id: string) {
  if (isArenaOwnActivation(event.target, row)) this.open(id);
}
```

A surface of yours that is not an anchor handles Enter in its own `keydown`. There `isArenaOwnActivation` keeps an Enter pressed inside a control it holds from opening the surface. Enter on a real anchor already arrives as a click, so the anchor example above covers it.

```tsx
// React
<article tabIndex={0} onKeyDown={(event) => {
  if (event.key === 'Enter' && isArenaOwnActivation(event.target, event.currentTarget)) open(id);
}}>
  <button type="button" onClick={like}>Like</button>
</article>
```

```ts
// Angular: template <article #row tabindex="0" (keydown.enter)="openOnEnter($event, row, id)">
protected openOnEnter(event: Event, row: HTMLElement, id: string) {
  if (isArenaOwnActivation(event.target, row)) this.open(id);
}
```

With React Router, the navigate is `useNavigate()` and the path is `useLocation().pathname`. With the Next.js App Router, they are `useRouter().push` and `usePathname()`. Allowed, untested: no Arena test exercises either router.

An active id comes from the router. The `ArenaSideNav` prompt has that bridge: [React](../../../frameworks/react/components/navigation/arena-side-nav/ArenaSideNav.prompt.md) and [Angular](../../../frameworks/angular/components/navigation/arena-side-nav/ArenaSideNav.prompt.md).

## How do I change density below a breakpoint?

Read the viewport helper in the frame of the page and swap the density class there, never inside a component.

```tsx
// React
const narrow = useArenaViewportBelow('md');
return <div className={narrow ? 'arena-comfortable' : 'arena-compact'}>{children}</div>;
```

```ts
// Angular: call the helper in a field initializer, an injection context
protected readonly narrow = arenaViewportBelow('md');
// template: <div [class.arena-comfortable]="narrow()" [class.arena-compact]="!narrow()">…</div>
```

The two classes are exclusive and reach every component inside the element, and [`VOCABULARY.md`](../../../frameworks/VOCABULARY.md) says what each one changes. The helper needs Arena's stylesheet loaded, because it reads the `--bp-*` threshold from it.

## How do I window a long table?

Give the table a box with a bounded block size, then hand the box the hook's `ref` and `style`. A wrapper inside the box takes its `padding-block` from `padTop` and `padBottom`, so the scrollbar keeps the height of the whole list.

```tsx
const win = useArenaRowWindow({ total: records.length });
const shown = records.slice(win.offset, win.offset + win.count);

<div ref={win.ref} style={{ ...win.style, blockSize: '32rem', overflowY: 'auto' }}>
  <div style={{ paddingBlock: `${win.padTop}px ${win.padBottom}px` }}>
    <ArenaTable label="Deployments" columns={columns} slice={win.slice}
      onRowRequest={win.onRowRequest} className="arena-sticky-head">
      {shown.map(renderRow)}
    </ArenaTable>
  </div>
</div>
```

The hook reads the rows the table mounted and keeps each height by position in the list. A row that wraps costs its measured height. A row not yet read costs the mean of the rest. The box scrolls on its own, so the table never owns a scrollbar.

Pass `slice` so the reader hears the true size of the list. `arena-sticky-head` keeps the header row in view, and the hook's `style` pads the scroll by the header's height. Call `scrollToRow(0)` when a new sort or filter changes the list. Row 0 scrolls to the very top of the box, so the header row shows.

The hook's `slice` turns PageUp, PageDown and Control plus Home and End on, and `onRowRequest` lets them leave the window. Bind the two together. The table asks for a row it does not project, and the box scrolls to it.

## How do I window a long table in Angular?

Give the table a box with a bounded block size, then put `arenaRowWindow` on the box. A wrapper inside the box takes its padding from `padTop()` and `padBottom()`, so the scrollbar keeps the height of the whole list.

```html
<div arenaRowWindow #w="arenaRowWindow" [total]="records.length" style="block-size: 32rem; overflow-y: auto">
  <div [style.padding-top.px]="w.padTop()" [style.padding-bottom.px]="w.padBottom()">
    <arena-table label="Deployments" [columns]="columns" [slice]="w.slice()"
                 (rowRequest)="w.onRowRequest($event)" class="arena-sticky-head">
      @for (record of records.slice(w.offset(), w.offset() + w.count()); track record.id) {
        <tr arena-table-row>...</tr>
      }
    </arena-table>
  </div>
</div>
```

The directive reads the rows the table mounted and keeps each height by position in the list. A row that wraps costs its measured height. A row not yet read costs the mean of the rest. The box scrolls on its own, so the table never owns a scrollbar.

Bind `slice` so the reader hears the true size of the list. `arena-sticky-head` keeps the header row in view, and the directive pads the scroll by the header's height. Call `scrollToRow(0)` when a new sort or filter changes the list. Row 0 scrolls to the very top of the box, so the header row shows.

The directive's `slice` turns PageUp, PageDown and Control plus Home and End on, and `(rowRequest)` lets them leave the window. Bind the two together. The table asks for a row it does not project, and the box scrolls to it.

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

`formControl`, `formControlName` and `ngModel` work on `arena-input`, `arena-textarea`, `arena-select`, `arena-combobox`, `arena-multi-select`, `arena-checkbox`, `arena-checkbox-group`, `arena-radio-group`, `arena-switch`, `arena-file-input`, `arena-number-field`, `arena-slider` and `arena-pin-input`. Each directive is also exported alone: `ArenaInputControl`, `ArenaTextareaControl`, `ArenaSelectControl`, `ArenaComboboxControl`, `ArenaMultiSelectControl`, `ArenaCheckboxControl`, `ArenaCheckboxGroupControl`, `ArenaRadioGroupControl`, `ArenaSwitchControl`, `ArenaFileInputControl`, `ArenaNumberFieldControl`, `ArenaSliderControl` and `ArenaPinInputControl`.

What a control carries as its value:

- The input carries a `string`, or a `number` when its `type` is `number`. An emptied number field reports `null`.
- The checkbox and the switch carry a `boolean`.
- The select, the combobox and the radio group carry a `string`, the chosen option's value. A value no option holds draws an empty combobox field and a radio group with no radio checked. A `null` draws the empty field, the placeholder or no radio checked.
- The checkbox group carries a `string[]`, the ticked values in the order they were ticked. A `null` draws no box ticked.
- The multi-select carries a `string[]`, the chosen values in the order they were chosen, and never the event object. A `null` draws no chip.
- The number field carries a `number`, and `null` once it is emptied. A `null`, an empty string or `NaN` draws the empty field.
- The slider carries a `number`, and a range slider a `[start, end]` array. A `null` puts each thumb back at its own bound.
- The pin input carries a `string`, the whole code. A `null` draws empty cells. Focus leaving the group marks it touched, and a move between cells does not.
- The file input carries a `File[]`, the files it holds. `setValue(null)`, `setValue([])` and `reset()` clear it. A value holding files is ignored with a warning, because a file selection cannot be set from outside.

`disable()` disables the control. Leaving the control marks it touched.

**While a form binds a control, the form's value is drawn.** The control's own `value`, `checked` or `state` is ignored. Binding both warns once.

A switch with `confirm` reports nothing when pressed. Confirm first, then call `setValue`.

**Arena never turns a validator's error into words.** Copy is yours. Pass `error` from your own messages, as the example does.

## How do I take the files a file input holds?

`ArenaFileInput` reports names, sizes and types in its events, never a `File`. Inside a `<form>`, give the field a `name`. A native submission and `new FormData(form)` then carry exactly the files shown. Code that uploads without a form reads the files through two methods, `files()` and `clear()`.

In React the methods are on a forwarded ref, typed by `ArenaFileInputHandle`, which is imported beside the component.

```tsx
import { useRef } from 'react';
import { ArenaFileInput, type ArenaFileInputHandle } from '@dravensoft/arena-react';

const attachments = useRef<ArenaFileInputHandle>(null);

async function upload() {
  for (const file of attachments.current?.files() ?? []) await send(file);
  attachments.current?.clear();
}

<ArenaFileInput ref={attachments} label="Attachments" multiple droppable />
```

In Angular the methods are on the component class, reached through a `viewChild`.

```ts
import { Component, inject, viewChild } from '@angular/core';
import { ArenaFileInput } from '@dravensoft/arena-angular';
import { UploadService } from './upload.service';

@Component({
  imports: [ArenaFileInput],
  template: `<arena-file-input label="Attachments" multiple droppable />`,
})
export class Attachments {
  private readonly field = viewChild.required(ArenaFileInput);
  private readonly uploads = inject(UploadService);

  async upload(): Promise<void> {
    for (const file of this.field().files()) await this.uploads.send(file);
    this.field().clear();
  }
}
```

`files()` returns the `File` objects held when you call it. `clear()` empties the field and fires no event, because the call is yours. A reset of the containing form empties the field without an event too. In a reactive form, the reset of a form directive (`FormGroupDirective` or `NgForm`) also clears the model. A native reset of a plain `<form>` holding a lone `formControl` empties the field only. Call `reset()` on the control there.
