Text field with validation (H5). Focus = gold ring, error = crimson with icon, valid = green with check. Requires the Phosphor sheets loaded for the state icons.

```tsx
<ArenaInput label="Repository" required prefix="git@" placeholder="org/project" />
<ArenaInput label="Email" validateOn="change" value={email} onChange={setEmail}
  validate={(v) => /.+@.+\..+/.test(v) ? null : 'Invalid email format'} />
<ArenaInput label="Slug" valid value={slug} onChange={setSlug} hint="Available" />
```

<!-- @api GENERATED from contracts/api/components/ArenaInput.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label` | primitive | `string` |  | Field label above the control. |
| `id` | primitive | `string` |  | The control's id, and what the label's `for` points at. Generated from `label` when omitted, as `in-` followed by the label with each run of whitespace replaced by a single hyphen and the whole lowercased. The derivation is normative, and the prefix differs per component on purpose: the same markup must get the same id in every layer, and an ArenaInput and an ArenaTextarea sharing a label must not collide. |
| `hint` | primitive | `string` |  | A line of help under the field. |
| `error` | primitive | `string` |  | Controlled error message; wins over `validate`. |
| `valid` | primitive | `boolean` | `false` | Force the valid (green check) state. |
| `required` | primitive | `boolean` | `false` | Marks the label and the control required. |
| `validate` | functionInput | `(value: string) => string` |  | Called on the value; returns the error message, or empty for valid. |
| `validateOn` | enum | `ArenaValidateOn` | `"blur"` | When `validate` runs. |
| `type` | enum | `ArenaInputType` | `"text"` | Native input type. |
| `icon` | primitive | `string` |  | Phosphor class name drawn at the field's start. |
| `prefix` | primitive | `string` |  | Static text Arena draws before the value, e.g. `git@`. |
| `value` | primitive | `string` |  | The controlled text. |
| `disabled` | primitive | `boolean` | `false` | Blocks editing and dims it. |
| `readOnly` | primitive | `boolean` | `false` | Shows the value but blocks editing. |
| `placeholder` | primitive | `string` |  | Shown when empty. |
| `name` | primitive | `string` |  | Submitted with the form. |
| `autoComplete` | primitive | `string` |  | The browser autofill hint. |
| `min` | primitive | `string` |  | Minimum, for number/date types. |
| `max` | primitive | `string` |  | Maximum, for number/date types. |
| `step` | primitive | `string` |  | Step, for number/date types. |
| `maxLength` | primitive | `number` |  | Caps the length. |
| `pattern` | primitive | `string` |  | A regex the value must match. |
| `onChange` | event | `string` |  | Edited; carries the new value. |
| `onBlur` | event | `string` |  | Left the field; carries the value. |

<!-- @api end -->

Rules: validates on `blur` by default; use `validateOn="change"` only for live feedback (passwords, availability). Mark required fields with `required`.

`validate` is the **ninth form**, a `functionInput`: the consumer hands Arena a function it calls on the field's value and whose result it uses. It takes the value as a string and returns the error message, or nothing when the value is valid. It is the only inbound function in the library, and it is legal only because `ArenaInput` is a data-entry control.

`onChange` and `onBlur` carry the **value as a string**, not the `ChangeEvent`/`FocusEvent`, because a platform's own event type never travels in a payload, so the event does not reach you. Read the value directly (`onChange={setEmail}`); there is no `e.target` and no `preventDefault()`.

`icon` is a **Phosphor class name Arena draws** (`icon="ph-bold ph-magnifying-glass"`), not a node you pass in; Arena renders the `<i>` and hides it from assistive tech. `prefix` is likewise **static text Arena draws** before the value (`prefix="git@"`).

The members are `label`, `id`, `hint`, `error`, `valid`, `required`, `validate`, `validateOn`, `type`, `icon`, `prefix`, `value`, `disabled`, `readOnly`, `placeholder`, `name`, `autoComplete`, `min`, `max`, `step`, `maxLength` and `pattern`, plus `onChange` and `onBlur`. That is the whole API: there is no `InputHTMLAttributes` heritage clause and no `{...rest}` spread, so global attributes, `className`, `dir`, `tabIndex`, ARIA and `data-*`, do not reach the `<input>`, and neither does a consumer `style` object. **There is no `defaultValue` either**: the contract is about a controlled value, so give the field `value` and an `onChange`.

**`id` is the one global attribute that is a member**, because the component generates one from `label` to wire the label's `htmlFor`, and with no way to override it an external `<label>`, an `aria-describedby` or a form library addressing the field by name would have no path at all. Pass it and it wins; omit it and the label-derived value is still generated.

**`readOnly` and `disabled` look different because they mean different things.** A disabled field is dimmed and out of the conversation. A read-only field is at **full contrast**: its value is the point, and drops to the panel surface so it reads as a fact rather than a well you can type into. Reach for `readOnly` whenever the value must stay legible and copyable, and for `disabled` only when the field is genuinely inapplicable right now.

### Dates and times

Use the native types. Arena deliberately ships **no `DatePicker` and no `TimePicker`**: the native control is the sanctioned approach: it is keyboard accessible, localized, and it is what a phone user already knows how to drive. Arena's job is to make it look like Arena, which it does, in both themes.

```tsx
<ArenaInput label="Deploy date" type="date" required />
<ArenaInput label="Window start" type="time" hint="Local time" />
<ArenaInput label="Cutover" type="datetime-local" error="Pick a date in the future" />
```

`type` is the `ArenaInputType` enum: `text`, `email`, `password`, `search`, `tel`, `url`, `number`, `date`, `time`, `datetime-local`. `checkbox` and `radio` are not among them: those are `ArenaCheckbox` and `ArenaRadio`, their own components.

**Do**
- Use `type="date"` / `"time"` / `"datetime-local"`. Label, focus ring, error and valid states all work on them.
- Set `min` / `max` (they are members) so the browser does the range validation for free.

**Don't**
- Don't build a custom calendar popover to replace it. That is a deliberate non-goal: a custom picker is a large accessibility surface to re-earn, and the native one already has it.
- Don't fake a date field with `type="text"` and a mask. It loses the picker, the mobile keyboard and the locale.
- Don't reach for a wrapper attribute or an inline `style` to size the field; wrap it in a container you control instead.

### Taking focus, the one handle on the component

`ArenaInput` forwards a ref carrying `focus()` and `select()`. Reach them through it, and never by
querying the real `<input>` out of the DOM, which is Arena's markup and can move:

```tsx
const search = useRef<ArenaInputHandle>(null);

function completeSale() {
  record();
  search.current?.focus();
  search.current?.select();
}

<ArenaInput ref={search} label="Search" value={query} onChange={setQuery} />
```

They are a handle rather than props because no member is imperative, and an `autoFocus` prop
would answer a different question: it fires once at mount, and chaining sales needs focus back
after **every** completion. These two are the whole handle; `ArenaInput` exposes nothing else.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
