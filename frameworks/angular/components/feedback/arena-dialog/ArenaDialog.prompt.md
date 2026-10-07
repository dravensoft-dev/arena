Arena dialog, the routine modal, over a blurred scrim. Standalone, `OnPush`, signal I/O.
The host **is** the scrim, so `<arena-dialog>` covers the viewport when open and takes the
`hidden` branch of its own `open` variant when closed, put it anywhere in the template.

```html
<arena-dialog [open]="dialogOpen()" class="arena-dialog-width-lg" title="Promote build 482 to production?" eyebrow="Deployment"
              (close)="dialogOpen.set(false)">
  The current production build stays available for rollback for seven days.
  <div footer>
    <arena-button (click)="dialogOpen.set(false)" class="arena-emphasis-ghost">Cancel</arena-button>
    <arena-button (click)="promote()">Promote</arena-button>
  </div>
</arena-dialog>
```

<!-- @api GENERATED from contracts/api/components/ArenaDialog.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `open*` | primitive | `boolean` |  | Whether the dialog is shown. The host owns it. |
| `title*` | primitive | `string` |  | Names the dialog for assistive technology and heads it visually. Required: aria-labelledby points at it, and a modal with no name is worse than none at all. |
| `eyebrow` | primitive | `string` |  | A short kicker above the title. |
| `content` | slot |  |  | The dialog's body. |
| `footer` | slot |  |  | The action row, right-aligned. |
| `fillBelow` | enum | `ArenaBreakpoint` |  | Below this breakpoint the panel fills the screen: full width and height, no radius and no shadow, the title bar pinned to the top and the footer to the bottom, the body scrolling between them, and every edge inset by the device's safe area. The measurement is the dialog's own box, which covers the viewport while open. Absent, the dialog never fills. The width is ignored while filling. |
| `close` | event |  |  | The dialog was dismissed -- by Escape or by a scrim click. No payload. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`dialog-width`](../../../../VOCABULARY.md#dialog-width): `arena-dialog-width-lg`, `arena-dialog-width-md` (default), `arena-dialog-width-sm`. Write one as `class="arena-dialog-width-lg"` on the component, or on a container whose components should all take it. Property: `--arena-dialog-width`, set on a container of yours for a value no option names.

<!-- @answers end -->

`title` and `open` are both **required inputs**. `title` names the dialog for assistive
technology, the panel's `aria-labelledby` points at it, and nothing can derive it, because a
dialog's subject is editorial. `open` is required because `false` is the closed state and not an
absence; the host owns it.

The dialog's width is the `arena-dialog-width` class, `sm`, `md` or `lg`, and `--arena-dialog-width` on a container takes a **CSS length** for a width no step names. Write a token expression such as `calc(var(--sp-1) * 200)`, never a bare `520`. A class on the dialog wins over a property on its container, and a dialog that fills the screen ignores both. Write `class="arena-dialog-width-lg"` on a form's dialog for the wide panel. A value that is not a width, such as `md` written as the property, sets a declaration the browser drops and leaves the panel at its default. Arena reports that once at runtime rather than letting it pass in silence. The panel already carries its own default, `arena-dialog-width-md`, and a `92vw` cap, so a wide dialog still fits a narrow viewport.

The footer is projected through the `[footer]` marker and is **optional**, with nothing marked,
the action row is not rendered at all rather than rendered empty. **Import `ArenaFooter` from `@dravensoft/arena-angular` in the component that writes the marker.** The gate is a `contentChild(ArenaFooter)`, which resolves the directive rather than the attribute. An un-imported marker leaves the query null and the whole footer silently unrendered, with no error and no template diagnostic. A bare `footer` attribute on a `<div>` is valid HTML whether or not a directive matches it. The component cannot detect it, because it cannot tell "the marker was not
imported" from "nothing was projected". Arena catches every such consumer inside its own tree;
nothing can reach one in yours.

Focus is Arena's own, and it implements
`contracts/behaviour/dialog-modal.json` clause by clause. Opening moves focus to the first
focusable element inside the panel; closing returns it to whatever held focus before. Tab and
Shift+Tab wrap at the panel's edges, and that wrap is verified against a real browser rather
than asserted. The CDK is **not** involved: this dialog is in flow, on `--z-modal`.

Arena dismisses two ways and both report through `close`: **Escape**, and a click on the scrim.
A click inside the panel is stopped before it reaches the host, so only the scrim dismisses. A
third path is yours, a button in `[footer]` wired to the same handler, and it adds no member.

**Do / Don't**
- **Do** give every dialog a `title` that says what it is about, not what it is ("Delete
  project", never "Dialog").
- **Do** keep the dismissing control in `[footer]`. Escape is a shortcut for it, never the only
  way out.
- **Don't** open a second modal inside a dialog by nesting one. `arena-confirm-dialog` sits on
  `--z-modal-nested` for exactly this and is the one that belongs on top; two traps nested inside
  one panel fight over the same Tab key.
- **Don't** put `tabindex="-1"` on content the user has to reach. The Tab order is how the trap decides what is focusable, so a control held out of it is one the wrap skips.

**By hand, in real Chromium.** The trap's **interior** is the browser's own sequential focus navigation, which Arena does not implement and happy-dom does not have. A suite asserting it would pass identically against a perfect trap and against none. The boundary wrap is Arena's own
`.focus()` call and is asserted for real; the rest is this list. Run `bun run demos` and open
`/frameworks/angular/components/feedback/arena-dialog/ArenaDialog.demo.generated.html`:

1. **Tab to "Promote build" and press Enter.** Focus lands on **Cancel**, the first focusable
   inside the panel, not on the trigger.
2. **Tab once.** Focus moves to **Promote**. The step below is the one no suite can make. Cancel is first rather than last, so Arena's handler does nothing and the browser moves focus on its own. If this
   fails, the trap is fighting native navigation rather than bounding it.
3. **Tab again.** Focus wraps from Promote back to Cancel. This one is Arena's.
4. **Shift+Tab.** Focus wraps from Cancel back to Promote.
5. **Escape**, then a click on the scrim, then a click inside the panel. The first two close and
   return focus to "Promote build"; the third does nothing.
6. The scrim blurs what is behind it, and the panel enters with `arena-pop`, which drops its
   travel and keeps its fade under `prefers-reduced-motion`.

Driving it through CDP costs an afternoon on one gotcha: a `rawKeyDown` does not activate a
button. Enter must be dispatched as `keyDown` carrying `text: '\r'`. Tab and Escape are fine as
`rawKeyDown`.

**On a phone.** A dialog holding a form reads better as the whole screen, so pass `fillBelow` with the breakpoint under which it should fill. The measurement is the dialog's own box, and that box covers the viewport while open. One dialog therefore fills on a phone and floats on a laptop. While it fills, the width is ignored, the title bar and the footer stay put and the body scrolls between them. `ArenaConfirmDialog` has no such member, because a confirmation is short on every screen.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
