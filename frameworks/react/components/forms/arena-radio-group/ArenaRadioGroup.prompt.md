Single selection among options that are all visible at once. `ArenaRadioGroup` holds the `value` and distributes each child's selected state; each `ArenaRadio` declares its own `value`.

```tsx
<ArenaRadioGroup ariaLabel="Deployment target" value={env} onChange={setEnv}>
  <ArenaRadio value="prod" label="Production" hint="Real users, requires approval" />
  <ArenaRadio value="staging" label="Staging" />
  <ArenaRadio value="qa" label="QA" />
</ArenaRadioGroup>
```

<!-- @api GENERATED from contracts/api/components/ArenaRadioGroup.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `ariaLabel*` | primitive | `string` |  | Names the group: what is being chosen, not that it is a choice. Required, and guarded at runtime: a radiogroup with no accessible name is announced unlabelled, and each option's own label says what that option is, never what the set is for. "Deployment target", not "Options". Distinct from `name`, which is the radios' shared form name and never reaches a screen reader. |
| `children` | slot |  |  | The Radios. An option never holds a selected state of its own -- the group owns it, and how the two are wired is each layer's business rather than this contract's. |
| `value` | primitive | `string` |  | The selected option's value. |
| `name` | primitive | `string` |  | Shared name for the underlying radios; generated when omitted. |
| `onChange` | event | `string` |  | A different option was chosen; carries its value. |

<!-- @api end -->

`ariaLabel` names the group and is **required**, throwing when absent. It says what is being
chosen, not that a choice is happening: each `ArenaRadio`'s own label already says what that option
is, and nothing else in the group says what the SET is for. `name` is not a substitute: it is the shared form name
for the underlying native radios and never reaches a screen reader. One is generated when you
omit it.

`onChange` carries the chosen option's **value**, never a DOM event.

**Do / Don't**
- Use ArenaRadio when it helps to see all the options (2–5) and they're mutually exclusive.
- For more than ~6 options or limited space, use `ArenaSelect`.
- Don't pass `style` or stray DOM attributes. ArenaRadioGroup declares its `content` slot plus `ariaLabel`, `value`, `name` and `onChange`, and renders nothing else. To space or constrain the group differently, wrap it in your own element rather than reaching through it.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
