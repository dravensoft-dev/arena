Arena select, a styled **native** `<select>`. Standalone, `OnPush`, signal I/O. The host is
the field's column, label above, control below, so put `<arena-select>` straight into a form
row.

Native is the whole design, not a shortcut. The browser draws the popup, runs its keyboard and
gives a phone its own platform picker; Arena supplies the surface, the caret and the focus ring.
That is why it binds the `select` pattern rather than `combobox`, and why `aria-expanded`,
`aria-controls` and `aria-activedescendant` are absent, because authoring them would be a claim about a
popup this component does not own.

```html
<arena-select label="Environment" [options]="environments" [value]="env()" name="env"
              (change)="env.set($event)" />

<arena-select label="Customer" [options]="customers" [value]="customer()"
              placeholder="Choose a customer" icon="ph-bold ph-user"
              [error]="customerError()" (change)="customer.set($event)" />
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
| `change` | event | `string` |  | A different option was chosen; carries its value. |

<!-- @api end -->

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

```ts
protected readonly environments: ArenaSelectOption[] = [
  { value: 'staging', label: 'Staging' },
  { value: 'production', label: 'Production' },
];
```

`label` is what names the control for assistive technology; Arena renders a real `<label for>`
pointing at the control's own generated id. It is optional in the contract, but a select with no
label and no surrounding `<label>` has no accessible name at all, so supply one or name it from
outside.

`change` carries the chosen **value**, not the event. The native `change` a `<select>` fires
shares that name, so Arena stops it inside the host: a consumer listening on an ancestor is told
once, by the output, and never by the raw DOM event. That is measured rather than asserted in
prose.

**Do / Don't**
- **Do** give every option a `value` distinct from its `label`. `value` is what submits and what
  `value` is matched against; `label` is free to read differently.
- **Do** pair it with `name` when the control is inside a real form. The attribute lands on the
  control, never on `<arena-select>`.
- **There is no `multiple`, and that is a decision rather than an omission.** A multi-selection
  is a *set* of values and `change` carries one `string`, so the member could only ever have set
  an attribute whose result the event could not report. A native multi-select is a list box shown
  open, a different control from the styled dropdown this is.
- **Don't** put more than a handful of options in it. A long or searchable list is
  `arena-command-palette`'s job, and a set of three or four mutually exclusive choices already
  visible on the page is `arena-segmented-control`'s.

**By hand, in real Chromium**: the popup is the browser's and happy-dom has none, so nothing
below is provable by a suite. Run `bun run demos` and open
`/frameworks/angular/components/forms/arena-select/ArenaSelect.demo.generated.html`:
- The popup opens on click and on Space, walks with the arrow keys and type-ahead, and commits on
  Enter, all of it the platform's, none of it Arena's.
- The caret sits inside the field's right padding and swallows no click: pressing it opens the
  control beneath it.
- The focus ring is Arena's `--focus-width` in `--color-secondary`, and the platform outline is
  gone.
- Disabled dims the whole column, label included, and the control refuses the pointer.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
