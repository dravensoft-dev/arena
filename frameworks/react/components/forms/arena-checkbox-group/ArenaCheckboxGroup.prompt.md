A set of independent choices reported as one value. `ArenaCheckboxGroup` holds the `value`, an array of the ticked boxes' values, and reports the whole set on every toggle; each `ArenaCheckbox` declares its own `value`.

```tsx
<ArenaFieldset legend="Notify me about" error={notify.length === 0 ? 'Choose at least one.' : undefined}>
  <ArenaCheckboxGroup ariaLabel="Notify me about" name="notify" value={notify} onValueChange={(set) => setNotify(set.values)}>
    <ArenaCheckbox value="deploys" label="Deploys" />
    <ArenaCheckbox value="incidents" label="Incidents" />
    <ArenaCheckbox value="digest" label="Weekly digest" />
  </ArenaCheckboxGroup>
</ArenaFieldset>
```

<!-- @api GENERATED from contracts/api/components/ArenaCheckboxGroup.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `ariaLabel*` | primitive | `string` |  | Names the group: what the choices are about, not that they are choices. Required, and guarded at runtime: a group with no accessible name is announced unlabelled, and each box's own label says what that box is, never what the set is for. "Notify me about", not "Options". Distinct from `name`, which is the boxes' shared form name and never reaches a screen reader. |
| `children` | slot |  |  | The Checkboxes, each with a `value`: the set holds that value while the box is ticked. The group owns each box's ticked state, and how the two are wired is not this contract's business. |
| `value` | array | `readonly string[]` | `[]` | The ticked boxes' values, in the order they were ticked. A value that matches no box is kept rather than dropped. |
| `name` | primitive | `string` |  | Shared form name for the underlying checkboxes, so a form submits every ticked value under one key; generated when omitted or blank. |
| `disabled` | primitive | `boolean` | `false` | Whether the whole group is unavailable. Every box it holds is disabled whatever its own disabled says, and the group reflects aria-disabled. |
| `onChange` | event | `ArenaValueSet` |  | A box was ticked or unticked; carries the whole set after the change. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none (`group`).
<!-- @keys end -->

`ariaLabel` names the set and is **required**, throwing when blank. The label says what the choices are about, never that they are choices: each box's own label already says what that box is. `name` is not a substitute. The boxes share it as a form name, so a native form submits every ticked value under one key, and a screen reader never hears it. One is generated when you omit it.

**The group is controlled.** The group draws `value` and holds no state of its own. A page that ignores `onValueChange` shows boxes that never move. `onValueChange` carries an `ArenaValueSet`, the whole set after the toggle, never a DOM event: write `set.values` back into `value`. The set keeps the order the boxes were ticked in and adds a value once. A value matching no box is kept.

**Every box needs a `value`, and the group owns its `checked`.** A box with no value throws inside a group. A `checked` or `name` written on a box inside a group is overridden by the group, silently. A box's own `onValueChange` still fires, before the group's. The group reaches its boxes by cloning its direct children. A box inside a fragment or inside a component of yours is out of its reach, so keep each `ArenaCheckbox` a direct child.

**The group draws no legend, hint or error.** A visible name, a line of help and a message about the set ("Choose at least one") come from an `ArenaFieldset` around it. Make the legend and `ariaLabel` say the same words. There is no "select all" parent and no `required`: a native checkbox's `required` means that one box must be ticked, and "at least one" is the fieldset's error.

**Do / Don't**
- **Do** use it for a handful of independent choices that are all worth seeing at once. Past a dozen, a searchable multiple choice serves better.
- **Do** disable the group rather than each box when the whole set is unavailable: the group reflects `aria-disabled` and every box is disabled whatever its own `disabled` says.
- **Don't** hold the options as data. Each box is a component, so it carries its own label.
- **Don't** reach for it for a single choice of one among many; that is `ArenaRadioGroup`.

**By hand.** Tab visits each box once and Space toggles it. A native form submits every ticked value under the one `name`. A screen reader announces the group by its name on entering it.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
