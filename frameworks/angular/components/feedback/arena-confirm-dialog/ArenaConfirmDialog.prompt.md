Arena confirmation for a high-consequence action. It does not close on click-outside,
losing a half-finished decision to a stray click is the failure this component exists
to prevent. `requireText` makes the user type a word before the confirm button
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
| `title*` | primitive | `string` |  | The dialog heading, and the name the panel's aria-labelledby points at. Required: nothing can derive a name for a confirmation, because its subject is editorial, and a modal announcing only its role is worse than none at all. |
| `eyebrow` | primitive | `string` | `"Confirm"` | Small uppercase label above the title. |
| `content` | slot |  |  | The dialog body: the question and any detail. |
| `confirmLabel` | primitive | `string` | `"Confirm"` | The confirm button's label. |
| `cancelLabel` | primitive | `string` | `"Cancel"` | The cancel button's label. |
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
  `title` attribute. The host here is the fixed full-viewport scrim, and a native
  `title` on it would be a tooltip target the size of the page, which is why this host
  clears the attribute (`'[attr.title]': 'null'`). The layer holds that rule in both
  directions: a primitive taking the input and not clearing it fails, and so does one
  clearing an attribute it takes no input for. `[title]="'Delete project X'"` or
  `[title]="projectName()"` sets the input alone, and it is the spelling that says so.
- Use `requireText` when the action is genuinely irreversible, and use the name of the
  thing being destroyed as the word.
- Don't reach for `destructive` on a merely inconvenient action. The filled red is the
  system's loudest surface and it stops working once it is common.
- Don't use this for a routine question: that is `MatDialog` wearing Arena.
- Don't express a condition as an attribute string. `destructive` carries the
  `booleanAttribute` transform, so a bare `destructive` and `[destructive]="true"` both
  mean true, and the one literal string `"false"` means false. Every *other* string is
  true, `"0"`, `"off"` and `"no"` all give you the destructive button. Whether an
  action is irreversible is a computed fact, so bind it:
  `[destructive]="isIrreversible"`. Keep the bare attribute for a constant true.
