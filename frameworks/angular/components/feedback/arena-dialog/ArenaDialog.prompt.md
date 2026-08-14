Arena dialog, the routine modal, over a blurred scrim. Standalone, `OnPush`, signal I/O.
The host **is** the scrim, so `<arena-dialog>` covers the viewport when open and takes the
`hidden` branch of its own `open` variant when closed, put it anywhere in the template.

```html
<arena-dialog [open]="dialogOpen()" title="Promote build 482 to production?" eyebrow="Deployment"
              (close)="dialogOpen.set(false)">
  The current production build stays available for rollback for seven days.
  <div footer>
    <arena-button variant="ghost" (click)="dialogOpen.set(false)">Cancel</arena-button>
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
| `width` | primitive | `string` | `"calc(var(--sp-1) * 120)"` | A CSS width for the panel. It defaults to 480px, which each layer reaches in its own idiom, and the input overrides whichever. |
| `content` | slot |  |  | The dialog's body. |
| `footer` | slot |  |  | The action row, right-aligned. |
| `close` | event |  |  | The dialog was dismissed -- by Escape or by a scrim click. No payload. |

<!-- @api end -->

`title` and `open` are both **required inputs**. `title` names the dialog for assistive
technology, the panel's `aria-labelledby` points at it, and nothing can derive it, because a
dialog's subject is editorial. `open` is required because `false` is the closed state and not an
absence; the host owns it.

`width` is a **CSS string** and an override, not a requirement: the panel already carries its own
default and a `92vw` cap, so a wide dialog still fits a narrow viewport. Pass a token expression
(`width="calc(var(--sp-1) * 200)"`), never a bare number. A named size is not one of the things it takes: `width="md"` compiles, sets a declaration the browser drops, and leaves the panel at its default, so Arena reports that once at runtime rather than letting it pass in silence.

The footer is projected through the `[footer]` marker and is **optional**, with nothing marked,
the action row is not rendered at all rather than rendered empty. **Import `ArenaFooter` from
`@dravensoft/arena-angular` in the component that writes the marker.** The gate is a
`contentChild(ArenaFooter)`, which resolves the directive rather than the attribute, so an
un-imported marker leaves the query null and the whole footer silently unrendered, no error, no
template diagnostic, since a bare `footer` attribute on a `<div>` is valid HTML whether or not a
directive matches it. The component cannot detect it, because it cannot tell "the marker was not
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
- **Don't** put `tabindex="-1"` on content the user has to reach. It is how the trap decides what
  is focusable, so a control held out of the Tab order is one the wrap skips.

**By hand, in real Chromium**: the trap's **interior** is the browser's own sequential focus
navigation, which Arena does not implement and happy-dom does not have, so a suite asserting it
would pass identically against a perfect trap and against none. The boundary wrap is Arena's own
`.focus()` call and is asserted for real; the rest is this list. Run `bun run demos` and open
`/frameworks/angular/components/feedback/arena-dialog/ArenaDialog.demo.generated.html`:

1. **Tab to "Promote build" and press Enter.** Focus lands on **Cancel**, the first focusable
   inside the panel, not on the trigger.
2. **Tab once.** Focus moves to **Promote**. This is the step no suite can make: Cancel is first
   and not last, so Arena's handler does nothing and the browser moves focus on its own. If this
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

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
