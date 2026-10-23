A named set of related fields. A legend says what the set is and the fields sit under it. One line under them carries the help or the error that belongs to the set, not to any field in it.

```tsx
<ArenaFieldset legend="Notifications" hint="We write at most once a day." error={none ? 'Choose at least one.' : undefined}>
  <ArenaCheckbox label="Deploys" name="notify" value="deploys" checked={deploys} onChange={setDeploys} />
  <ArenaCheckbox label="Incidents" name="notify" value="incidents" checked={incidents} onChange={setIncidents} />
</ArenaFieldset>
```

<!-- @api GENERATED from contracts/api/components/ArenaFieldset.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `legend*` | primitive | `string` |  | Names the set, on screen and to assistive technology, which announces it on entering the set. Required, and guarded at runtime after trimming: a set with no name announces only that a group began. Say what the set is ("Billing address"), not that it is a group. Plain text. |
| `children*` | slot |  |  | The fields. Required, and guarded at runtime: a fieldset renders a legend naming a set, so a childless one names nothing. The guard counts as the render path does: a false conditional is no child. |
| `hint` | primitive | `string` |  | A line of help for the whole set, under the fields, and part of the set's description. |
| `error` | primitive | `string` |  | A message about the set rather than about one field ("Choose at least one"), under the fields with a warning glyph. Wins over `hint`, and is part of the set's description while it shows. |
| `disabled` | primitive | `boolean` | `false` | Whether the whole set is unavailable. Every native control inside it is disabled by the platform, and the set dims. A control that only reflects an unavailable state, and stays focusable, does not inherit it. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none (`group`).
<!-- @keys end -->

**`legend` and `children` are both required, and both are guarded at runtime.** The legend names the set on screen and to a screen reader, which announces it on entering the first field. Say what the set is, "Billing address", never that it is a group. The guard trims first, so a legend of spaces throws. With no children the legend names nothing. The guard counts as the render does: `{show && <Field />}` with `show` false is no child.

**The component renders a real `<fieldset>` with its `<legend>` as the first child**, and the legend is the set's whole accessible name: no `aria-labelledby` is written beside it. The hint or the error line has its own id, and the fieldset names it in `aria-describedby`, so a reader hears the set's help on entering it. `aria-invalid` is not written. A group does not support it, so the error travels as text, a warning glyph and the danger ink.

**`disabled` is the platform's own cascade.** `<fieldset disabled>` disables every native control inside it, with no wiring per field: `ArenaInput`, `ArenaTextarea`, `ArenaSelect`, `ArenaCheckbox`, `ArenaRadio`, `ArenaSwitch` and `ArenaButton` all stop. A component that shows an unavailable state through `aria-disabled` and stays focusable, `ArenaCard` and `ArenaTableRow`, does not inherit it. The remove button of a removable `ArenaTag` is a native button, so it stops with the set. The set dims itself as well, so a field you also disabled on its own dims twice: disable the set, not each field.

**There is no `required` and no border.** A group cannot carry `aria-required`, so a mark on the legend would promise what nothing keeps; say it in the hint. A bordered group of fields is an `ArenaCard` holding the fieldset.

**Do / Don't**
- **Do** give `ArenaCheckboxGroup` and `ArenaRadioGroup` a visible name, help and error from a fieldset around them. Make the legend and the group's `ariaLabel` say the same words.
- **Do** put the message that belongs to one field on that field, and only the one about the set here.
- **Don't** wrap fields in a fieldset to disable an `aria-disabled` component; the cascade stops at it.
- **Don't** hide the legend. A name only a reader hears is a group's `ariaLabel`, not a fieldset.

**By hand.** In a browser, a disabled fieldset disables the checkboxes inside it. The legend sits above the fields at 390px, and a long legend wraps. A field disabled on its own inside a disabled set dims twice, and that reads as acceptable.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
