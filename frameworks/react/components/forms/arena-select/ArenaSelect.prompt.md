Styled native dropdown selector. `options` is an array of `{value, label}` objects.

```tsx
<ArenaSelect label="Environment" value={env} onChange={setEnv}
  options={[{value:'prod',label:'Production'},
            {value:'stg',label:'Staging'},
            {value:'qa',label:'QA'}]} />
```

<!-- @api GENERATED from contracts/api/components/ArenaSelect.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label` | primitive | `string` |  | Field label above the control. |
| `placeholder` | primitive | `string` |  | An empty-valued first option, drawn before the choices and unselectable once a real one is made -- "Choose a customer". It is an option rather than an attribute because a native select has no placeholder, and it is what makes "nothing chosen yet" distinguishable from "the first choice". |
| `options` | array | `readonly ArenaSelectOption[]` | `[]` | The choices, drawn as native options. |
| `value` | primitive | `string` |  | The selected option's value. |
| `disabled` | primitive | `boolean` | `false` | Blocks the control and dims it. |
| `required` | primitive | `boolean` | `false` | Must have a value for the form to submit. |
| `hint` | primitive | `string` |  | A line of help under the field. |
| `error` | primitive | `string` |  | Controlled error message. It is the whole validation surface here, unlike ArenaInput, which also takes a `validate` function: a native select offers a closed list, so there is no value to parse and nothing for a validator to reject that the options did not already prevent. |
| `valid` | primitive | `boolean` | `false` | Force the valid (green check) state. |
| `icon` | primitive | `string` |  | Phosphor class name drawn at the field's start. |
| `name` | primitive | `string` |  | Submitted with the form. |
| `onChange` | event | `string` |  | A different option was chosen; carries its value. |

<!-- @api end -->

`options` takes **only** `ArenaSelectOption` objects. The bare-string form
(`options={['Production','Staging']}`) is gone: `(string | ArenaSelectOption)[]` is a union
between two shapes, which a member never is, and the object form carries strictly more,
a stable `value` with a translatable `label` cannot be said in the string form at all.
Where value and label are the same, write it: `{value:'QA', label:'QA'}`.

`onChange` carries the **chosen option's value as a string**, not the `ChangeEvent`, because a
platform's own event type never travels in a payload, so the event does not reach you.
Read the value directly (`onChange={setEnv}`); there is no `e.target` and no
`preventDefault()`.

The members are `label`, `placeholder`, `options`, `value`, `disabled`, `required`, `hint`,
`error`, `valid`, `icon` and `name`, plus `onChange`. There is no `multiple`: a multi-selection is a *set* of values and `onChange`
carries one `string`, so the attribute could reach the element while the event reported only
the first selected option. A native multi-select is a list box shown open, which is a different
control from the styled dropdown this component is. That is the whole API: there is no `SelectHTMLAttributes` heritage
clause and no `{...rest}` spread, so global attributes, `id`, `className`, `dir`,
`tabIndex`, ARIA and `data-*`, do not reach the `<select>`, and neither does a consumer
`style` object.

**Validation is the same vocabulary `ArenaInput` carries, deliberately.** A form that mixes the two is
a form whose fields must report a failure the same way, or it gets validated by hand or not at
all. `hint` is a line of help, `error` is the controlled message, `valid` forces the green state,
and the state order is the same normative one: **error, then focus, then valid, then neutral**, so
an errored field stays crimson while it has focus. Arena names the note to the control with
`aria-describedby` and marks the control `aria-invalid`, so the failure is announced rather than
only drawn. `error` replaces `hint` rather than joining it: a field that still shows its advice
buries the failure under it.

**There is no `validate`, and that is not an omission.** `ArenaInput` takes one because a text field
holds a value the consumer must parse; a native select offers a closed list, so there is nothing
to reject that the options did not already prevent. Where the rule depends on something else on
the screen, hold `error` in your own state and pass it in, which is what a controlled message is
for.

**`placeholder` is an empty-valued first option, not an attribute**, because a native select has
none. It is disabled once a real choice is made, which is what keeps "nothing chosen yet"
distinguishable from "the first choice".

**Do / Don't**
- Use it for a short, known set of choices. Past roughly a dozen, reach for a searchable
  control instead of a dropdown the user has to scroll.
- Give `value` a stable identity and `label` the human wording, so the label can be
  translated without moving what the form submits.
- Pass `label` when the field needs a visible name; the control renders none otherwise.
- Don't report a failure with `hint`. It is drawn muted and announced as help, so the user is
  told what to do and never that something is wrong.
- Don't reach for a wrapper attribute or an inline `style` to size the field; wrap it in
  a container you control instead.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
