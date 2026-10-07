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

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the behaviour binding and its pattern. Edit the binding or the pattern, not this list. -->

**Keys**, from the [`radiogroup`](../../../../../contracts/behaviour/radiogroup.json) pattern this component binds:

- `ArrowKeys` Right/Down or Left/Up moves focus to the next/previous button, unchecking the previously focused one and checking the newly focused one, wrapping at the ends.
- `Space` checks the focused radio button if it is not already checked.

<!-- @keys end -->

**Do / Don't** - Always render an ArenaRadio inside an `ArenaRadioGroup`. The group injects the shared name and the selected state, so a standalone ArenaRadio is never selected and never groups.
- To toggle a single thing on/off, use `ArenaSwitch` or `ArenaCheckbox`, not a standalone ArenaRadio.
- Don't pass `style` or stray DOM attributes. ArenaRadio declares `value`, `label`, `hint` and `disabled`, and renders nothing else. To lay options out differently, style the container you put the group in.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
