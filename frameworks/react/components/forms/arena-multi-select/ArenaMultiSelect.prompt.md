A text field that filters a list of options and holds a set of chosen values, drawn as chips inside the field. `onValueChange` carries the whole set as `{ values }`, in the order chosen.

```tsx
<ArenaMultiSelect label="Regions" value={regions} onValueChange={(set) => setRegions(set.values)}
  options={allRegions} maxVisible={3} clearable />
```

<!-- @api GENERATED from contracts/api/components/ArenaMultiSelect.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | The control's accessible name. Required, and guarded at runtime after trimming: a field with no name is announced as an unlabelled edit field. |
| `showLabel` | primitive | `boolean` | `true` | Whether the label is drawn above the field. False keeps the name for assistive technology and draws nothing, for a filter row with no room for a label. |
| `placeholder` | primitive | `string` |  | Shown in the empty field while no value is chosen. A hint about what to type, never an option. |
| `options` | array | `readonly ArenaSelectOption[]` | `[]` | The choices, in the order the list draws them. |
| `value` | array | `readonly string[]` | `[]` | The chosen values, in the order they were chosen. A value that neither the options nor an earlier choice holds is kept and drawn as its own text. |
| `max` | primitive | `number` |  | The most values that can be chosen. Absent, there is no limit. Once it is reached, every row not chosen is unavailable and choosing one is announced as blocked; removing a value stays possible. |
| `maxVisible` | primitive | `number` |  | How many chosen values are drawn as chips before the rest collapse into a count. Absent, every chip is drawn and the field wraps. The collapsed values stay readable in the open list, where they are the chosen rows. |
| `clearable` | primitive | `boolean` | `false` | Whether a control that empties the whole selection is drawn while a value is chosen. A declared boolean rather than a reading of whether change is listened to; false by default because a field one press can empty is a choice the consumer makes. |
| `loading` | primitive | `boolean` | `false` | Options are being fetched. The list reports itself busy and draws a status line in place of the empty one. Declared, never inferred from the options. |
| `filter` | enum | `ArenaComboboxFilter` | `"local"` | Who narrows the options by the typed text: the control itself, or the host, which listens to search and passes the options it found. A declared member rather than a reading of whether search is listened to. |
| `disabled` | primitive | `boolean` | `false` | Blocks the control and dims it, chips included. |
| `required` | primitive | `boolean` | `false` | At least one value must be chosen for the form to be complete. The field reports itself required to assistive technology. |
| `hint` | primitive | `string` |  | A line of help under the field. |
| `error` | primitive | `string` |  | Controlled error message, and the whole validation surface: every value is an option's or one the consumer supplied, so there is nothing for a validator to parse. |
| `valid` | primitive | `boolean` | `false` | Forces the valid state, drawn with a check glyph at the field's end. |
| `icon` | primitive | `string` |  | Phosphor class name drawn at the field's start through ArenaIcon. |
| `name` | primitive | `string` |  | Submitted with the form. Each chosen value is submitted under it as a hidden input, so a form posts a repeated field; nothing is drawn without a name. |
| `onChange` | event | `ArenaValueSet` |  | The chosen set changed, by a row, a chip or the clear control; carries the whole new set, never a difference. |
| `onSearch` | event | `string` |  | The text the list is filtered by changed; carries the new text, empty after a pick, Escape or a blur. The hook a remote search listens to. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys**, from [`combobox`](../../../../../contracts/behaviour/combobox.json):
- `ArrowDown`: opens the popup if closed; moves into it.
- `Escape`: closes the popup if it is visible.
- `Enter`: accepts the active option and closes the popup.
<!-- @keys end -->

**The field is one tab stop.** Tab lands on the text field and never on a chip. The arrow keys move a cursor over the rows while the list is open, and `aria-activedescendant` names it. The list carries `aria-multiselectable`, and every chosen row carries `aria-selected` and a check.

**The keys.** Typing opens the list and keeps the rows whose label holds the text. Enter on an available cursor row chooses or unchooses it, clears the text and closes the list. Enter on a blocked row chooses nothing, announces the cap and keeps the list open. A press on a row chooses or unchooses it and keeps the list open, so the next row can be pressed. Escape, Tab and a press elsewhere close the list and clear the typed text.

**The chips.** On an empty field, ArrowLeft or Backspace moves to the last chip, and a second Backspace removes it. ArrowLeft and ArrowRight walk the chips, and ArrowRight past the last one returns to the field. Enter and Space press the remove button, and Delete and Backspace remove the focused chip too. Focus then moves to its neighbour, or back to the field. Each remove button reads its chip's text after the remove word.

**`max` caps the set.** At the cap, every row not chosen is unavailable, and choosing one is announced as blocked. Removing a value stays possible. **`maxVisible`** draws that many chips and a count for the rest. The collapsed values stay in the open list as chosen rows.

**`clearable` draws a control that empties the set** while a value is chosen. The control is no tab stop, so a keyboard user removes chips one by one.

**A remote search is yours.** Listen to `onSearch`, fetch, pass the new `options` and `loading`, and set `filter="none"`. Arena then draws your rows as given. Arena keeps the label of every value it draws or chooses. A chip keeps its text when your next `options` leaves that value out.

With `name`, every chosen value is submitted as a hidden input under that name, so a form posts a repeated field. A value that neither `options` nor an earlier choice holds stays in the set and is drawn as its own text.

**Words.** `multiSelectEmpty`, `multiSelectLoading` and `multiSelectCount` are the empty line, the status line and the count announced after typing. `multiSelectClear` names the clear control. `multiSelectMore` is the collapsed count and `multiSelectMoreLabel` names it. `multiSelectMax` is announced when the cap blocks a choice.

**Do / Don't**
- Use it for a set chosen from a long list. One value from a long list is `ArenaCombobox`, and a short visible set is `ArenaCheckboxGroup`.
- Write the set back from `set.values`; the event carries an object, never an array.
- Don't colour the chips. A chip is one neutral colour, and its order says when it was chosen, not what it means.
- Keep `label` a name for the value, never an instruction. Put the instruction in `placeholder`.
- Don't accept free text through it. A typed value that is not an option is `ArenaInput`.

**By hand, in real Chromium.** Open the playground page and check that the field wraps its chips without covering the caret or the clear control. Tab lands on the field and never on a chip. A screen reader reads "Remove Berlin" on a chip. The list stays open across presses on rows and does not jump. At phone width, `max` and `maxVisible` still hold.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
