<!-- GENERATED from the contracts by bun run generate:skills. Edit the contracts, not this file. -->

# Arena forms components, the Angular layer

Every forms component this layer ships, under the names it binds them to. **This page is an
index, not a manual.** How to write one is its own prompt, linked in the last column.

**The rules every component below answers to are stated in
[`../../../../skills/design/SKILL.md`](../../../../skills/design/SKILL.md) before any component
here**, and nothing on this page restates them.

Import from the package root, never from a path inside it:

```ts
import { ArenaButton, ArenaTag } from '@dravensoft/arena-angular';
```

Every component is standalone: put its class in the host component's `imports`, then write its
`arena-` element. A member is a signal input, an event is an output under the name the contract
gives it, and the main slot is content projection. A named slot is a marker directive, and it goes
in `imports` as well. A component cannot tell an un-imported marker from an unfilled slot. An icon is a Phosphor class-name string, never an element.

- Every other category this layer ships: [`../../INDEX.md`](../../INDEX.md).
- Installing the package, declaring your skin, and what it exports besides components:
  [`install.md`](../../../../skills/design/references/install.md),
  [`config.md`](../../../../skills/design/references/config.md) and
  [`exports.md`](../../../../skills/design/references/exports.md).
- **Takes** is the members the component's API contract declares, in contract order, under this
  layer's own names. A member marked `*` is required; the prompt gives its type and its default.
- **A member whose type is an object or an enum takes one this package exports.** The prompt
  names the type and says what it is for; the fields it holds are in the type declaration itself,
  which `import type { … } from '@dravensoft/arena-angular'` brings in. That field list is in neither
  the prompt nor the contract, so the type is where you read it.

| Component | What it is | Takes | Usage |
|---|---|---|---|
| `ArenaButton` | Action button. One primary per view; danger stays outline. | `content` `destructive` `icon` `iconRight` `loading` `disabled` `type` `name` `value` `autoFocus` `form` `tabStop` `click` | [`ArenaButton.prompt.md`](./arena-button/ArenaButton.prompt.md) |
| `ArenaCheckbox` | A single checkbox. Checked shows a crimson fill with a check. | `checked` `label` `disabled` `required` `name` `value` `change` | [`ArenaCheckbox.prompt.md`](./arena-checkbox/ArenaCheckbox.prompt.md) |
| `ArenaCheckboxGroup` | A set of independent choices reported as one value. Governs which of its checkboxes are ticked, names the set, gives every box one form name, and disables them together. A visible name and a message about the set come from a fieldset around it. | `ariaLabel*` `content` `value` `name` `disabled` `change` | [`ArenaCheckboxGroup.prompt.md`](./arena-checkbox-group/ArenaCheckboxGroup.prompt.md) |
| `ArenaCombobox` | A text field that filters a list of options as the user types, holding the value of the one chosen. The searchable form control for a long list: the value is always an option's value or empty, never the typed text. The validation vocabulary is ArenaSelect's, so swapping one for the other edits one tag. Focus stays in the field while the list is open, and the arrow keys move a cursor over the rows. Running an action is a command palette's job, not this one's. | `label*` `showLabel` `placeholder` `options` `value` `loading` `filter` `disabled` `required` `hint` `error` `valid` `icon` `name` `change` `search` | [`ArenaCombobox.prompt.md`](./arena-combobox/ArenaCombobox.prompt.md) |
| `ArenaFieldset` | A named set of related fields. A legend says what the set is, the fields sit under it, and one line of help or one error belongs to the set. Disabling it disables every native control inside it. A bordered group of fields is a card, not a fieldset. | `legend*` `content*` `hint` `error` `disabled` | [`ArenaFieldset.prompt.md`](./arena-fieldset/ArenaFieldset.prompt.md) |
| `ArenaIconButton` | Icon-only button. Carries an accessible name in every state, not only on hover. | `icon*` `label*` `showLabel` `pressed` `disabled` `type` `name` `value` `autoFocus` `form` `tabStop` `click` | [`ArenaIconButton.prompt.md`](./arena-icon-button/ArenaIconButton.prompt.md) |
| `ArenaInput` | Text field with validation. Focus is a gold ring, error crimson, and valid green with a check. The four states are ordered and the order is normative: error, then focus, then valid, then neutral. An errored field stays crimson while it has focus, because the validation signal must not disappear at the moment the user acts on it. | `label` `id` `hint` `error` `valid` `required` `validate` `validateOn` `type` `icon` `prefix` `value` `disabled` `readOnly` `placeholder` `name` `autoComplete` `min` `max` `step` `maxLength` `pattern` `change` `blur` | [`ArenaInput.prompt.md`](./arena-input/ArenaInput.prompt.md) |
| `ArenaRadio` | One option inside an ArenaRadioGroup. Selected shows a crimson dot inside the ring. | `value*` `label` `hint` `disabled` | [`ArenaRadio.prompt.md`](./arena-radio/ArenaRadio.prompt.md) |
| `ArenaRadioGroup` | Single-selection group. Governs the value and distributes it to its child Radios. | `ariaLabel*` `content` `value` `name` `disabled` `change` | [`ArenaRadioGroup.prompt.md`](./arena-radio-group/ArenaRadioGroup.prompt.md) |
| `ArenaSelect` | Styled native dropdown selector, with the same validation vocabulary ArenaInput carries. The four states are ordered and the order is the same normative one: error, then focus, then valid, then neutral. An errored control stays crimson while it has focus, because the validation signal must not disappear at the moment the user acts on it. A form that mixes ArenaInput and ArenaSelect is a form whose fields must report a failure the same way, or it gets validated by hand or not at all. | `label` `placeholder` `options` `value` `disabled` `required` `hint` `error` `valid` `icon` `name` `change` | [`ArenaSelect.prompt.md`](./arena-select/ArenaSelect.prompt.md) |
| `ArenaSwitch` | A controlled on/off switch showing an icon per state. `confirm` gates a high-impact change through an ArenaConfirmDialog before it applies. | `state` `iconOn` `iconOff` `label*` `disabled` `confirm` `funcOn` `funcOff` `requestChange` | [`ArenaSwitch.prompt.md`](./arena-switch/ArenaSwitch.prompt.md) |
| `ArenaTextarea` | Multi-line text field with validation and an optional counter. | `label` `id` `hint` `error` `required` `counter` `autoResize` `value` `disabled` `readOnly` `placeholder` `name` `maxLength` `rows` `change` | [`ArenaTextarea.prompt.md`](./arena-textarea/ArenaTextarea.prompt.md) |

12 forms components in this layer.
