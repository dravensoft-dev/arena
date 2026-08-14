Arena multi-line text field, label above, hint or error and an optional counter below.
Standalone, `OnPush`, signal I/O. The host binds the root slot, so `<arena-textarea>` is
itself the column its parent lays out. The control is
a real `<textarea>`, named by a real `<label for>`.

```html
<arena-textarea label="Release notes" [value]="notes()" (change)="notes.set($event)"
                hint="Markdown is supported" [rows]="6" />

<arena-textarea label="Summary" counter [maxLength]="280"
                [value]="summary()" (change)="summary.set($event)" />

<arena-textarea label="Commit message" autoResize
                [value]="message()" (change)="message.set($event)" />

<arena-textarea label="Reason" required [error]="reasonError()"
                [value]="reason()" (change)="reason.set($event)" />
<arena-textarea label="Generated changelog" readOnly [value]="changelog()" />
```

<!-- @api GENERATED from contracts/api/components/ArenaTextarea.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label` | primitive | `string` |  | Field label; the counter and error sit under the field. |
| `id` | primitive | `string` |  | The control's id, and what the label's `for` points at. Generated from `label` when omitted, as `ta-` followed by the label with each run of whitespace replaced by a single hyphen and the whole lowercased: the derivation ArenaInput.id states, under this component's own prefix. |
| `hint` | primitive | `string` |  | A line of help under the field. |
| `error` | primitive | `string` |  | Error message; turns the border crimson and shows below. |
| `required` | primitive | `boolean` | `false` | Marks the label and the control required. |
| `counter` | primitive | `boolean` | `false` | Shows a live length/maxLength count, which warns once the length is STRICTLY past nine tenths of `maxLength`; exactly at the share is not yet near the limit. |
| `autoResize` | primitive | `boolean` | `false` | Grows with the content instead of scrolling. |
| `value` | primitive | `string` |  | The controlled text. |
| `disabled` | primitive | `boolean` | `false` | Blocks editing and dims it. |
| `readOnly` | primitive | `boolean` | `false` | Shows the value but blocks editing. |
| `placeholder` | primitive | `string` |  | Shown when empty. |
| `name` | primitive | `string` |  | Submitted with the form. |
| `maxLength` | primitive | `number` |  | Caps the length; feeds the counter. |
| `rows` | primitive | `number` | `4` | Initial visible rows. |
| `change` | event | `string` |  | Edited; carries the new text. |

<!-- @api end -->

**Do / Don't**
- It is **controlled**, and Angular will not force the DOM back: ignore `change` and the box keeps
  what the user typed. Wire the signal.
- There is **no validator here**, unlike `arena-input`. `error` is the only route to the error
  state, and it is the consumer's to compute, which is why the field has two state arms rather
  than three and there is no valid (green check) state at all.
- The counter needs **both** `counter` and `maxLength`. A `maxLength` alone caps the field; it
  does not ask for the count to be shown. Past nine tenths of the cap the counter switches to the
  warning slot, a different slot, not a variant, which is why Arena draws two.
- `autoResize` forces `resize: none` and grows the box from its own `scrollHeight`.
  **It resizes on mount and on every programmatic change, not only while typing**, through an
  `afterRenderEffect` that reads `value()`, so a draft loaded from a server or a template
  inserted by a button sizes the box immediately. **`scrollHeight` is content plus padding and never the border**, so a
  border-box element needs `offsetHeight - clientHeight` added or the box lands short and keeps a
  permanent scrollbar: measured before the fix at 720x340, `scrollHeight` 199 set as the height
  left `clientHeight` 197 and a scrollbar on a box just grown past it. Both layers carry the term,
  and no suite can see it, because happy-dom has no layout and reports `scrollHeight` as `0`.
- `rows` is the *initial* height and still applies under `autoResize`; it is what the box is
  before it has content to measure.
- `required` and `readOnly` land on the native attributes rather than on `aria-required` and
  `aria-readonly`; a native control already reports both, and writing them twice is two claims
  that can disagree. `aria-multiline` is likewise absent on purpose: a `<textarea>` is multiline
  by being one.
- `change` is an output named after a native DOM event, so the control calls `stopPropagation()`
  on the native `change` and a commit does not read as a second edit. Bind on the
  `<arena-textarea>` itself; the native event never reaches an ancestor.
- The error line **replaces** the hint. The foot keeps an empty placeholder when there is neither,
  so the counter stays hard right instead of sliding under the label.
- `id` is derived from `label` as `ta-<slug>`, the derivation `ArenaTextarea.json` states. Note the
  prefix differs from `arena-input`'s `in-`, so the two never collide on a form that labels
  both the same.

**By hand, in real Chromium**: none of these is provable in happy-dom, and the first one cannot
be: happy-dom has no layout, so `scrollHeight` is `0` and a growing box and a broken one look
identical to any suite. Run `bun run demos` and open
`/frameworks/angular/components/forms/arena-textarea/ArenaTextarea.demo.generated.html`:
- **`autoResize`**: the box grows line by line as you type and shrinks again when you delete, with
  no scrollbar ever appearing. The one seeded with a long value is already tall on load; that is
  the `afterRenderEffect` at work: the box is sized before the first paint, not on first keystroke.
- Without `autoResize` the grip in the corner resizes vertically and not horizontally.
- The gold focus ring lands on the textarea itself, where `arena-input`'s lands on a wrapping
  group.
- The counter turns amber between 90% and 100% of the cap, and the field stops accepting input at
  the cap because `maxlength` is native.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
