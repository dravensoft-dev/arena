Multi-line text input. Shares the same visual states as `ArenaInput`.

```tsx
<ArenaTextarea label="Deployment notes" rows={5} maxLength={280} counter
  value={notes} onChange={setNotes}
  hint="Attached to the delivery log." />
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
| `onChange` | event | `string` |  | Edited; carries the new text. |

<!-- @api end -->

`onChange` carries the **new text as a string**, not the `ChangeEvent`, because a platform
event type never travels in a payload, so the event does not reach you. Read the
value directly (`onChange={setNotes}`); there is no `e.target` and no `preventDefault()`.

The members are `label`, `id`, `hint`, `error`, `required`, `counter`, `autoResize`, `value`,
`disabled`, `readOnly`, `placeholder`, `name`, `maxLength` and `rows`, plus `onChange`.
That is the whole API: there is no `TextareaHTMLAttributes` heritage clause and no
`{...rest}` spread, so global attributes, `className`, `dir`, `tabIndex`, ARIA and
`data-*`, do not reach the `<textarea>`, and neither does a consumer `style` object.

**`id` is the one global attribute that is a member**, because the component
generates one from `label` to wire the label's `htmlFor` and a consumer had no way to
override it, which left an external `<label>`, an `aria-describedby` or a form library
addressing the field by name with no path at all. Pass it and it wins; omit it and the
label-derived value is still generated.

**`readOnly` and `disabled` look different because they mean different things.** A
disabled field is dimmed and out of the conversation. A read-only one is at **full
contrast**: its value is the point, and drops to the panel surface so it reads as a
fact rather than a well you can type into. Reach for `readOnly` whenever the value must
stay legible and copyable, and for `disabled` only when the field is genuinely
inapplicable right now.

**Do / Don't**
- Real multi-line content (descriptions, notes, messages). For a single line use `ArenaInput`.
- With `maxLength`, enable `counter` so the limit is visible; the counter renders only
  when both are set.
- Pass `label` when the field needs a visible name; it is also what the generated `id` is
  derived from, so a field with neither a `label` nor an `id` has no association to offer.
- Don't reach for a wrapper attribute or an inline `style` to size the field; compose it
  inside a container you control instead.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
