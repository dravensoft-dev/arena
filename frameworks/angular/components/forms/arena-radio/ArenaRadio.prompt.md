One option inside an `arena-radio-group`. Standalone, `OnPush`, signal I/O. The host stays bare
and out of layout: the root is a real `<label>` wrapping a real `<input type="radio">`, which is
what gives the option its role, its name and its place in the group's arrow cycle without a line
of authored ARIA.

```html
<arena-radio value="production" label="Production" hint="Serves real traffic" />
<arena-radio value="staging" label="Staging" />
<arena-radio value="qa" label="QA" disabled />
```

<!-- @api GENERATED from contracts/api/components/ArenaRadio.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `value*` | primitive | `string` |  | This option's value, matched against the group's. |
| `label` | primitive | `string` |  | The option's label. |
| `hint` | primitive | `string` |  | A line of help under the label. |
| `disabled` | primitive | `boolean` | `false` | Blocks selection and dims the option. |

<!-- @api end -->

**Do / Don't**
- It has **no `checked` and no event**, and that is the contract rather than an omission. The
  option reads the selected value from the `ArenaRadioGroupState` its group provides and reports a
  choice back through it, so there is nothing for a consumer to wire per option. Bind
  `(change)` on the group.
- `value` is required and is what the group's `change` carries. Two options with the same value in
  one group is a group that cannot tell them apart.
- `label` is optional in the contract, and an option without one is announced by its value at
  best. Pass it.
- `hint` is a second line under the label, at the smaller type level. Use it for the consequence of
  choosing, "Serves real traffic", not to restate the label. The ring aligns to the top of the
  text precisely so a hint does not push it off centre.
- `disabled` sets the native attribute, so the browser skips this option while arrowing and it
  cannot be reached by Tab. The JS guard beside it exists because the `<label>` is clickable and a
  label carries no disabled state of its own.
- The ring and the dot are decoration; the input is the control. Don't attach a handler to either:
  the `<label>` already forwards a click, and a second handler double-reports.
- To toggle one thing on and off, this is the wrong control: use `arena-switch` for an immediate
  effect and `arena-checkbox` for a pending form value.

**By hand, in real Chromium**: the option's own visuals, on the group's page (`bun run demos`,
`/frameworks/angular/components/forms/arena-radio-group/ArenaRadioGroup.demo.generated.html`):
- Selecting changes **only** the ring's border colour and adds the dot; the ring's size and
  surface do not move, so the row does not shift by a pixel.
- With a hint present, the ring stays level with the first line of the label rather than centring
  against both lines.
- `disabled` dims the whole option, label and hint included, and the cursor is not-allowed over
  the text as well as the ring.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
