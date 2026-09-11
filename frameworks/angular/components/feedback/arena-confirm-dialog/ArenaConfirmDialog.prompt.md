Arena confirmation for a high-consequence action. The dialog does not close on click-outside. Losing a half-finished decision to a stray click is the failure this component exists to prevent. `requireText` makes the user type a word before the confirm button
enables. `destructive` turns the eyebrow red and gives the confirm button Arena's
**only filled danger surface**.

```html
<arena-confirm-dialog [open]="confirming()" [destructive]="true"
                      [title]="'Delete project Ardennes?'"
                      eyebrow="Irreversible" confirmLabel="Delete project"
                      requireText="Ardennes"
                      (cancel)="confirming.set(false)" (confirm)="destroy()">
  Every deployment, log and artifact under this project is removed. This cannot be
  undone.
</arena-confirm-dialog>
```

<!-- @api GENERATED from contracts/api/components/ArenaConfirmDialog.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `open*` | primitive | `boolean` |  | Whether the dialog is shown. The host owns it, as in the other three modals: defaulting it would let an ArenaConfirmDialog whose open was never wired render nothing forever and look like a working closed dialog. |
| `title*` | primitive | `string` |  | The dialog heading, and the name the panel's aria-labelledby points at. Required: nothing can derive a name for a confirmation, because its subject is editorial, and a modal announcing only its role is worse than none at all. Required whatever open is, since a required member absent is a caller bug rather than a state to render: render the component when there is something to confirm, and hold on to the subject across a cancel so it still has a name while it closes. |
| `eyebrow` | primitive | `string` |  | Small uppercase label above the title. Absent, the provided locale's confirmDialogEyebrow answers it. |
| `content` | slot |  |  | The dialog body: the question and any detail. |
| `confirmLabel` | primitive | `string` |  | The confirm button's label. Absent, the provided locale's confirmDialogConfirm answers it. |
| `cancelLabel` | primitive | `string` |  | The cancel button's label. Absent, the provided locale's confirmDialogCancel answers it. |
| `destructive` | primitive | `boolean` | `false` | Gives the confirm button Arena's only filled danger surface. |
| `requireText` | primitive | `string` |  | Locks the confirm button until this exact word is typed. |
| `cancel` | event |  |  | The dialog was dismissed -- by the Cancel action or by the Escape key, in both layers. A scrim click is deliberately NOT one of them: this component never closes on click-outside. No payload. |
| `confirm` | event |  |  | The action was confirmed. |

<!-- @api end -->

`title` is **required**: the panel's `aria-labelledby` points at it, and nothing can
derive a name for a confirmation because its subject is editorial. Escape dismisses
through `(cancel)`, focus moves into the panel on open and returns to the invoker on
close, and Tab wraps at the panel's edges.

**Do / Don't**
- Say what will be destroyed, in the body, in plain words. "Are you sure?" is not a
  confirmation, it is a speed bump.
- **Bind `title`, never write it as a static attribute.** `title="Delete project X"`
  compiles and does set the input, and it also lands on the host as the native HTML
  `title` attribute. The host here is the fixed full-viewport scrim. A native `title` on it would be a tooltip target the size of the page, which is why this host clears the attribute (`'[attr.title]': 'null'`). The layer holds that rule in both
  directions: a primitive taking the input and not clearing it fails, and so does one
  clearing an attribute it takes no input for. `[title]="'Delete project X'"` or
  `[title]="projectName()"` sets the input alone, and it is the spelling that says so.
- Use `requireText` when the action is genuinely irreversible, and use the name of the
  thing being destroyed as the word.
- **Don't hold one in the template with an empty `title` while it is closed.** Both are required inputs whatever the other is. A screen that keeps one confirmation and feeds it a subject per row fails on the first render, so put it behind an `@if` on the subject instead. Keep
  the subject through a cancel and toggle only `open`, or focus never returns to the control
  that opened it.
- Don't reach for `destructive` on a merely inconvenient action. The filled red is the
  system's loudest surface and it stops working once it is common.
- Don't use this for a routine question: that is `MatDialog` wearing Arena.
- Don't express a condition as an attribute string. `destructive` carries the
  `booleanAttribute` transform, so a bare `destructive` and `[destructive]="true"` both
  mean true, and the one literal string `"false"` means false. Every *other* string is
  true, `"0"`, `"off"` and `"no"` all give you the destructive button. Whether an
  action is irreversible is a computed fact, so bind it:
  `[destructive]="isIrreversible"`. Keep the bare attribute for a constant true.

**Words.** `eyebrow`, `confirmLabel` and `cancelLabel` answer first; when one is absent, the locale's `confirmDialogEyebrow`, `confirmDialogConfirm` or `confirmDialogCancel` does. `confirmDialogRequire` is the prompt above the field `requireText` asks for, with that text in `{text}`.

**Asked from code.** A service that needs a yes or a no before it goes on asks `ArenaConfirmQueue` rather than holding an `open` signal of its own. `ask` returns the answer as a promise, and the one open request is rendered once, in the shell, with this dialog. The dialog is still what draws the confirmation, its focus trap and its one filled danger surface included.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component is not a styling surface, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena-to-prod --audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
