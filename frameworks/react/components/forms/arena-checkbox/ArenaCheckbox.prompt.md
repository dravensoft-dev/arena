A single checkbox. Checked shows a crimson fill with a check. `onChange` carries the **new checked state** as a boolean, not the DOM event, so a `useState` setter can be passed straight to it. `name` and `value` are what a native form submits when the box is ticked, and `required` makes the tick mandatory for submission.

```tsx
<ArenaCheckbox checked={notify} onChange={setNotify} label="Notify on approval" />
<ArenaCheckbox checked={terms} onChange={setTerms} required name="terms" value="accepted" label="I accept the terms" />
<ArenaCheckbox checked disabled label="Locked by policy" />
```

<!-- @api GENERATED from contracts/api/components/ArenaCheckbox.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `checked` | primitive | `boolean` | `false` | Whether it is ticked. |
| `label` | primitive | `string` |  | Text beside the box. |
| `disabled` | primitive | `boolean` | `false` | Blocks toggling and dims it. |
| `required` | primitive | `boolean` | `false` | Must be checked for the form to submit. |
| `name` | primitive | `string` |  | Submitted with the form. |
| `value` | primitive | `string` |  | The value submitted under `name` when checked. |
| `onChange` | event | `boolean` |  | Toggled; carries the new checked state. |

<!-- @api end -->

**Do / Don't**
- Read the boolean the handler hands you (`onChange={next => …}`); there is no event to reach into, so `e.target.checked` reaches nothing.
- Use `name` and `value` together when the checkbox is submitted by a real form: `value` is the string sent under `name` while the box is ticked, and it is not the checked state.
- To toggle a setting that takes effect immediately, prefer `ArenaSwitch`; an ArenaCheckbox states a choice a form will submit.
- Don't pass `style` or stray DOM attributes. ArenaCheckbox declares `checked`, `label`, `disabled`, `required`, `name` and `value`, and renders nothing else. To place or size it, style the container you put it in.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
