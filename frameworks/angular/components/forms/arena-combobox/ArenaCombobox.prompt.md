Arena combobox, a text field that filters a list of options as the user types, for a form value chosen from a long list. Standalone, `OnPush`, signal I/O. The host is the field's column, label above and field below, so put `<arena-combobox>` straight into a form row.

```html
<arena-combobox label="Region" [options]="regions" [value]="region()" placeholder="Search regions"
                (change)="region.set($event)" />
```

<!-- @api GENERATED from contracts/api/components/ArenaCombobox.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | The control's accessible name. Required, and guarded at runtime after trimming: a combobox with no name is announced as an unlabelled edit field. |
| `showLabel` | primitive | `boolean` | `true` | Whether the label is drawn above the field. False keeps the name for assistive technology and draws nothing, for a filter row with no room for a label. |
| `placeholder` | primitive | `string` |  | Shown in the empty field. A hint about what to type, never an option. |
| `options` | array | `readonly ArenaSelectOption[]` | `[]` | The choices, in the order the list draws them. |
| `value` | primitive | `string` |  | The chosen option's value. A value that neither the options nor an earlier choice holds draws an empty field with the placeholder and posts the empty string. |
| `loading` | primitive | `boolean` | `false` | Options are being fetched. The list reports itself busy and draws a status line in place of the empty one. Declared, never inferred from the options. |
| `filter` | enum | `ArenaComboboxFilter` | `"local"` | Who narrows the options by the typed text: the control itself, or the host, which listens to search and passes the options it found. A declared member rather than a reading of whether search is listened to. |
| `disabled` | primitive | `boolean` | `false` | Blocks the control and dims it. |
| `required` | primitive | `boolean` | `false` | Must have a value for the form to submit. An emptied field on a required control restores the chosen label instead of clearing it. |
| `hint` | primitive | `string` |  | A line of help under the field. |
| `error` | primitive | `string` |  | Controlled error message, and the whole validation surface: the value is always an option's, so there is nothing for a validator to reject that the options did not already prevent. |
| `valid` | primitive | `boolean` | `false` | Forces the valid state, drawn with a check glyph at the field's end. |
| `icon` | primitive | `string` |  | Phosphor class name drawn at the field's start. |
| `name` | primitive | `string` |  | Submitted with the form. The chosen value is submitted, never the label, through a hidden input drawn only when a name is given. |
| `change` | event | `string` |  | A different option was chosen; carries its value. An emptied field committed on a control that is not required reports the empty string. |
| `search` | event | `string` |  | The text the list is filtered by changed; carries the new text, empty after a choice, Escape or a blur. The hook a remote search listens to. |

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

**The vocabulary is `arena-select`'s, so swapping one for the other edits one tag.** `hint` is a line of help, `error` is the controlled message and `valid` forces the valid state. The state order is the same: error, then focus, then valid, then neutral. Arena names the note to the field with `aria-describedby` and marks it `aria-invalid`.

**Focus never leaves the field.** The list opens in an overlay pane under the field, and the arrow keys move a cursor over its rows. `aria-activedescendant` names the cursor row, and the rows are no tab stops. A screen reader hears how many options the text left, because focus is not where the list is.

**The keys.** Typing opens the list and keeps the rows whose label holds the text, whatever its case. The first match is the cursor row. ArrowDown on a closed field opens it on the chosen row. ArrowDown and ArrowUp stop at both ends. Enter chooses the cursor row and closes the list. Escape closes the list and puts the chosen label back. Tab and a press elsewhere close the list without choosing an option and put the chosen label back; an emptied field is the exception below.

**Emptying the field is how a value is cleared.** Commit an empty field with Enter or by leaving it, and `change` emits the empty string. A `required` field puts the chosen label back instead. There is no clear button.

**A remote search is yours.** Listen to `(search)`, fetch, pass the new `options` and `loading`, and set `filter="none"`. Arena then draws your rows as given, so a fuzzy match a plain substring test would fail still shows. Arena keeps the label of every value it draws or chooses. The field keeps its text when your next `options` leaves that value out.

`change` carries the chosen option's **value**, never its label. The native `change` and `input` events of the field share those names, so Arena stops both inside the host. With `name`, a hidden input submits the value, and the attribute never lands on `<arena-combobox>`. A `value` that neither `options` nor an earlier choice holds draws an empty field with the placeholder, and the hidden input posts the empty string.

**The choice is held until the host sends another value.** The field keeps the option it reported, so a pick shows at once whether or not `value` is bound; write `$event` back so your state and the field agree.

**Do / Don't**
- **Do** use it for a long list a user searches. A short known set is `arena-select`.
- **Don't** use it to run an action; that is `arena-command-palette`.
- **Don't** accept free text through it. A typed value that is not an option is `arena-input`.
- **Do** set `[showLabel]="false"` only where the row has no room for a label. The label still names the field.
- **Do** keep `label` a name for the value, never an instruction. Put the instruction in `placeholder`.

**By hand, in real Chromium.** Open the playground page and check that the list escapes an `overflow: hidden` card. The list flips above the field near the bottom of the screen and is as wide as the field. The cursor row scrolls into view. A screen reader announces the count after typing. On a phone, the soft keyboard leaves the list in view.

**With reactive forms.** `ArenaComboboxControl` from `@dravensoft/arena-angular/forms` binds the field to a form control holding the chosen option's `value`. A form value that matches no option draws an empty field. Binding the member the form replaces as well is a caller bug, and the layer warns about it once.

**Words.** `comboboxEmpty` is the empty line, with what was typed in `{query}`. `comboboxLoading` is the status line while `loading` holds. `comboboxCount` is the count announced after typing, with the number in `{count}`.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
