Protects irreversible actions (H3, H5). Does not close on click-outside. For the most destructive actions, require typing a word with `requireText`. The body is the dialog's description, announced with it when the dialog opens, so put the question and what it costs there.

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
| `open*` | primitive | `boolean` |  | Whether the dialog is shown. The host owns it, as in the other three modals. Defaulting it would let an ArenaConfirmDialog whose open was never wired render nothing forever and look like a working closed dialog. |
| `title*` | primitive | `string` |  | The dialog heading, and the name the panel's aria-labelledby points at. Required: nothing can derive a name for a confirmation, because its subject is editorial, and a modal announcing only its role is worse than none at all. Required whatever open is, since a required member absent is a caller bug rather than a state to render. Render the component when there is something to confirm, and hold on to the subject across a cancel so it still has a name while it closes. |
| `eyebrow` | primitive | `string` |  | Small uppercase label above the title. Absent, the provided locale's confirmDialogEyebrow answers it. |
| `children` | slot |  |  | The dialog body: the question and any detail. |
| `confirmLabel` | primitive | `string` |  | The confirm button's label. Absent, the provided locale's confirmDialogConfirm answers it. |
| `cancelLabel` | primitive | `string` |  | The cancel button's label. Absent, the provided locale's confirmDialogCancel answers it. |
| `destructive` | primitive | `boolean` | `false` | Draws the confirm button as the destructive option of the actions group. |
| `requireText` | primitive | `string` |  | Locks the confirm button until this exact word is typed. |
| `onCancel` | event |  |  | The dialog was dismissed -- by the Cancel action or by the Escape key, in both layers. A scrim click is deliberately NOT one of them: this component never closes on click-outside. No payload. |
| `onConfirm` | event |  |  | The action was confirmed. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys**, from [`modal-focus`](../../../../../contracts/behaviour/modal-focus.json):
- `Escape`: close.
<!-- @keys end -->

`destructive` draws the confirm button as the destructive option of the `actions` group: the danger edge and ink over `hue-danger-fill-strong`, the way a destructive `ArenaButton` is drawn.

`title` is **required** and throws when missing. The title is what names the dialog for assistive technology, and the panel's `aria-labelledby` points at it. Nothing can derive a name for a confirmation, because its subject is editorial.

Two things dismiss it, and both go through `onCancel`: **Escape** and the Cancel button. A
click on the scrim does **not**, and that is the point of the component, losing a
half-finished decision to a stray click is the failure it exists to prevent. Opening moves
focus to the first focusable inside the panel (the confirmation input when `requireText`
is set, Cancel otherwise); closing returns it to whatever had focus before. Removing the
confirmation while it is open counts as closing it for focus, though the removal reports
no `onCancel`. The rule holds only while focus is inside the confirmation or nowhere and
the element that opened it is still on the page. Tab and Shift+Tab wrap at the panel's
edges rather than walking out into the page behind the scrim.

### Do / Don't

- **Do** let `destructive` paint the button. The button reads the destructive option of the `actions` group, `actions-destructive-root-*`, so the answer that moves a destructive `ArenaButton` moves it.
- **Don't** rebuild the filled button yourself with `--danger`. That token is tuned to be read *as text* on the base surfaces, so it is too light to carry white. The measurement is 3.15:1 in the dark theme, under WCAG AA. `--danger-fill` exists precisely for this.
- **Don't** reach for `destructive` on a merely important action. The danger look competes with the primary button; if it is not a point of no return, an ordinary `<ArenaButton destructive>` is the right shape.
- **Do** add `requireText` when the action destroys data that cannot be rebuilt.
- **Do** give every confirmation a `title` that says what is about to happen, not what the component is ("Delete project", never "Confirm").
- **Don't** render it with an empty `title` while it is closed. `title` is required whatever `open` is. A screen that mounts one confirmation and feeds it a subject per row fails on the first render, so mount it when a subject exists instead. Keep the subject after a cancel and toggle only `open`, or focus never returns to the control that opened it.
- **Don't** put a `tabIndex={-1}` on a control the user has to reach. The Tab order is how the trap decides what is focusable, so a control held out of it is one the wrap skips over.
## Focus in the panel

With `requireText` the open dialog lands focus on the require-text input, the first focusable in the panel. Tab moves through the panel in the browser's own order and wraps at the ends: from the input Tab reaches Cancel, and Cancel is the last focusable while the confirm button is `disabled` until the word is typed, so Tab from Cancel wraps back to the input. Once the word is typed the wrap passes through the confirm button. Shift+Tab from the input wraps to the last focusable. Escape closes the dialog and returns focus to the control that opened it, and a click on the scrim does not close a destructive confirmation.

**Words.** `eyebrow`, `confirmLabel` and `cancelLabel` answer first; when one is absent, the locale's `confirmDialogEyebrow`, `confirmDialogConfirm` or `confirmDialogCancel` does. `confirmDialogRequire` is the prompt above the field `requireText` asks for, with that text in `{text}`.

**Asked from code.** A handler that needs a yes or a no before it goes on asks `useArenaConfirm()` rather than holding an `open` state of its own. `ask` returns the answer as a promise ([the wiring](../../../../../skills/design/references/exports.md#how-do-i-raise-a-confirmation-from-code-in-react)), and the one open request is rendered once, near the root, with this dialog. The dialog is still what draws the confirmation, its focus trap and its final confirmation, which reads the destructive option of the `actions` group, included.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
