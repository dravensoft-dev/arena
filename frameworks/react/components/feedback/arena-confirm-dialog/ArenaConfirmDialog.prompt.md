Protects irreversible actions (H3, H5). Does not close on click-outside. For the most destructive actions, require typing a word with `requireText`.

```tsx
<ArenaConfirmDialog open={o} destructive requireText="DELETE"
  title="Delete project" confirmLabel="Delete permanently"
  onCancel={close} onConfirm={remove}>
  This action cannot be undone. 4 deployments and their history will be deleted.
</ArenaConfirmDialog>
```

<!-- @api GENERATED from contracts/api/components/ArenaConfirmDialog.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `open*` | primitive | `boolean` |  | Whether the dialog is shown. The host owns it, as in the other three modals: defaulting it would let an ArenaConfirmDialog whose open was never wired render nothing forever and look like a working closed dialog. |
| `title*` | primitive | `string` |  | The dialog heading, and the name the panel's aria-labelledby points at. Required: nothing can derive a name for a confirmation, because its subject is editorial, and a modal announcing only its role is worse than none at all. |
| `eyebrow` | primitive | `string` | `"Confirm"` | Small uppercase label above the title. |
| `children` | slot |  |  | The dialog body: the question and any detail. |
| `confirmLabel` | primitive | `string` | `"Confirm"` | The confirm button's label. |
| `cancelLabel` | primitive | `string` | `"Cancel"` | The cancel button's label. |
| `destructive` | primitive | `boolean` | `false` | Gives the confirm button Arena's only filled danger surface. |
| `requireText` | primitive | `string` |  | Locks the confirm button until this exact word is typed. |
| `onCancel` | event |  |  | The dialog was dismissed -- by the Cancel action or by the Escape key, in both layers. A scrim click is deliberately NOT one of them: this component never closes on click-outside. No payload. |
| `onConfirm` | event |  |  | The action was confirmed. |

<!-- @api end -->

`destructive` fills the confirm button with `--danger-fill`, and this is the only place in Arena where danger is filled. Everywhere else danger is an outline.

`title` is **required** and throws when missing. It is what names the dialog for
assistive technology, the panel's `aria-labelledby` points at it, and nothing can
derive a name for a confirmation, because its subject is editorial.

Two things dismiss it, and both go through `onCancel`: **Escape** and the Cancel
button. A click on the scrim does **not**, and that is the point of the component,
losing a half-finished decision to a stray click is the failure it exists to prevent.
Opening moves focus to the first focusable inside the panel (the confirmation input
when `requireText` is set, Cancel otherwise); closing returns it to whatever had focus
before. Tab and Shift+Tab wrap at the panel's edges rather than walking out into the
page behind the scrim.

### Do / Don't

- **Do** let `destructive` paint the button. The fill is `--danger-fill` over `--color-error-content`, and it is the only surface entitled to it.
- **Don't** rebuild the filled button yourself with `--danger`. That token is tuned to be read *as text* on the base surfaces, so it is too light to carry white: you get 3.67:1 in the dark theme, under WCAG AA. `--danger-fill` exists precisely for this.
- **Don't** reach for `destructive` on a merely important action. A filled red competes with the primary button; if it is not a point of no return, an ordinary `<ArenaButton variant="danger">` outline is the right shape.
- **Do** add `requireText` when the action destroys data that cannot be rebuilt.
- **Do** give every confirmation a `title` that says what is about to happen, not what the component is ("Delete project", never "Confirm").
- **Don't** put a `tabIndex={-1}` on a control the user has to reach: it is how the trap decides what is focusable, so a control held out of the Tab order is one the wrap skips over.
## Verifying the focus trap by hand

A suite proves the boundary wrap: Arena's own `.focus()` call, which happy-dom
honours. It cannot prove the **interior**, that Tab from a middle control reaches
the next one, because that is the browser's native sequential focus navigation. A
browser-driven gate stays refused, so the interior is a person's job.

Serve the tree with `bun run demos` and open
`frameworks/react/components/feedback/arena-confirm-dialog/ArenaConfirmDialog.demo.generated.html`.

**Start by pressing Escape.** That card renders with `open` already `true`, because a
specimen has to show something. Pressing the trigger while the dialog is already open
is correctly a no-op, because the hook keys its effect on `open` changing, precisely so a
re-render never steals focus back from a field the user is typing in, so a check that
skips this step measures nothing and looks like a defect.

Then, with the dialog closed:

1. **Tab to "Delete project…" and press Enter.** Focus must land on the require-text
   **input**, the first focusable in the panel.
2. **Tab once.** Focus moves to **Cancel**. Native navigation, not Arena's.
3. **Tab again.** Focus wraps back to the input. Note that Cancel is the *last*
   focusable, not "Delete permanently": the confirm button is `disabled` until the
   word is typed, and the trap recomputes what is focusable on every key rather than
   caching it. Type `DELETE` and repeat: the wrap must now pass through the confirm
   button.
4. **Shift+Tab from the input.** Focus wraps to the last focusable.
5. **Escape.** The dialog closes and focus returns to the trigger. The scrim stays
   inert on purpose: clicking outside must NOT close a destructive confirmation.

Driving this through CDP: Enter must be `keyDown` with `text: '\r'`; a `rawKeyDown`
does not activate a button.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
