One option inside an `ArenaRadioGroup`. Selected shows a crimson dot inside the ring. `value` is required and matched against the group's; `label` names the option and `hint` adds a line of help under it.

```tsx
<ArenaRadioGroup ariaLabel="Deployment target" value={env} onChange={setEnv}>
  <ArenaRadio value="prod" label="Production" hint="Real users, requires approval" />
  <ArenaRadio value="staging" label="Staging" />
  <ArenaRadio value="qa" label="QA" disabled />
</ArenaRadioGroup>
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
- Always render an ArenaRadio inside an `ArenaRadioGroup`, because the group injects the shared name and the selected state, so a standalone ArenaRadio is never selected and never groups.
- To toggle a single thing on/off, use `ArenaSwitch` or `ArenaCheckbox`, not a standalone ArenaRadio.
- Don't pass `style` or stray DOM attributes. ArenaRadio declares `value`, `label`, `hint` and `disabled`, and renders nothing else. To lay options out differently, style the container you put the group in.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
