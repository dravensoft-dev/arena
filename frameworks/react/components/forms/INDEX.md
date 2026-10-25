<!-- GENERATED from the contracts by bun run generate:skills. Edit the contracts, not this file. -->

# Arena forms components, the React layer

Every forms component this layer ships, under the names it binds them to. **This page is an
index, not a manual.** How to write one is its own prompt, linked in the last column.

**The rules every component below answers to are stated in
[`../../../../skills/design/SKILL.md`](../../../../skills/design/SKILL.md) before any component
here**, and nothing on this page restates them.

Import from the package root, never from a path inside it:

```tsx
import { ArenaButton, ArenaTag } from '@dravensoft/arena-react';
```

A member is a prop. The main slot is `children`, a named slot is a prop taking a node, and an
event is an `on`-prefixed handler. An icon is a Phosphor class-name string, drawn by Arena's components or by ArenaIcon; a raw ph-* element paints nothing.

- Every other category this layer ships: [`../../INDEX.md`](../../INDEX.md).
- Installing the package, declaring your skin, and what it exports besides components:
  [`install.md`](../../../../skills/design/references/install.md),
  [`config.md`](../../../../skills/design/references/config.md) and
  [`exports.md`](../../../../skills/design/references/exports.md).
- **Takes** is the members the component's API contract declares, in contract order, under this
  layer's own names. A member marked `*` is required; the prompt gives its type and its default.
- **A member whose type is an object or an enum takes one this package exports.** The prompt
  names the type and says what it is for; the fields it holds are in the type declaration itself,
  which `import type { … } from '@dravensoft/arena-react'` brings in. That field list is in neither
  the prompt nor the contract, so the type is where you read it.

| Component | What it is | Takes | Usage |
|---|---|---|---|
| `ArenaButton` | Action button. One primary per view; danger stays outline. | `children` `destructive` `icon` `iconRight` `loading` `disabled` `type` `name` `value` `autoFocus` `form` `tabStop` `onActivate` | [`ArenaButton.prompt.md`](./arena-button/ArenaButton.prompt.md) |
| `ArenaCheckbox` | A single checkbox. Checked shows the primary fill with a check. | `checked` `label*` `showLabel` `disabled` `required` `name` `value` `onValueChange` | [`ArenaCheckbox.prompt.md`](./arena-checkbox/ArenaCheckbox.prompt.md) |
| `ArenaCheckboxGroup` | A set of independent choices reported as one value. Governs which of its checkboxes are ticked, names the set, gives every box one form name, and disables them together. A visible name and a message about the set come from a fieldset around it. | `ariaLabel*` `children` `value` `name` `disabled` `onValueChange` | [`ArenaCheckboxGroup.prompt.md`](./arena-checkbox-group/ArenaCheckboxGroup.prompt.md) |
| `ArenaCombobox` | A text field that filters a list of options as the user types, holding the value of the one chosen. The searchable form control for a long list: the value is always an option's value or empty, never the typed text. The validation vocabulary is ArenaSelect's, so swapping one for the other edits one tag. Focus stays in the field while the list is open, and the arrow keys move a cursor over the rows. Running an action is a command palette's job, not this one's. | `label*` `showLabel` `placeholder` `options` `value` `loading` `filter` `disabled` `required` `hint` `error` `valid` `icon` `name` `onValueChange` `onSearch` | [`ArenaCombobox.prompt.md`](./arena-combobox/ArenaCombobox.prompt.md) |
| `ArenaCopyButton` | An icon button that writes a string to the clipboard, confirms in place with a glyph and a spoken word, and reverts on its own. A failed write is reported the same way, never hidden. | `text*` `label` `showLabel` `disabled` `onCopied` `onCopyFailed` | [`ArenaCopyButton.prompt.md`](./arena-copy-button/ArenaCopyButton.prompt.md) |
| `ArenaFieldset` | A named set of related fields. A legend says what the set is, the fields sit under it, and one line of help or one error belongs to the set. Disabling it disables every native control inside it. A bordered group of fields is a card, not a fieldset. | `legend*` `children*` `hint` `error` `disabled` | [`ArenaFieldset.prompt.md`](./arena-fieldset/ArenaFieldset.prompt.md) |
| `ArenaFileInput` | A file picker: a labelled trigger, an optional drop zone with a dashed frame, a chip for each file held and a line for each file refused. The events carry the names, sizes and types of the files, because a chosen file is a platform object. The files themselves reach a host through a native form submission under `name`, or through two methods on the component. | `label*` `id` `hint` `error` `required` `disabled` `name` `accept` `multiple` `maxSize` `droppable` `onValueChange` `onReject` | [`ArenaFileInput.prompt.md`](./arena-file-input/ArenaFileInput.prompt.md) |
| `ArenaIconButton` | Icon-only button. Carries an accessible name in every state, not only on hover. | `icon*` `label*` `showLabel` `pressed` `disabled` `type` `name` `value` `autoFocus` `form` `tabStop` `onActivate` | [`ArenaIconButton.prompt.md`](./arena-icon-button/ArenaIconButton.prompt.md) |
| `ArenaInput` | Text field with validation. Focus is the focus ring, error the danger tone, and valid the success tone with a check. The four states are ordered and the order is normative: error, then focus, then valid, then neutral. An errored field stays in the danger tone while it has focus, because the validation signal must not disappear at the moment the user acts on it. | `label` `id` `hint` `error` `valid` `required` `validate` `validateOn` `type` `icon` `prefix` `value` `disabled` `readOnly` `placeholder` `name` `autoComplete` `min` `max` `step` `maxLength` `pattern` `onValueChange` `onBlur` | [`ArenaInput.prompt.md`](./arena-input/ArenaInput.prompt.md) |
| `ArenaMultiSelect` | A text field that filters a list of options as the user types and holds a set of chosen values, drawn as chips inside the field. The field is one tab stop: the arrow keys move a cursor over the rows and between the chips, and the list stays open across presses on rows. The validation vocabulary is ArenaCombobox's. A cap and a collapsed count keep a long set in bounds. | `label*` `showLabel` `placeholder` `options` `value` `max` `maxVisible` `clearable` `loading` `filter` `disabled` `required` `hint` `error` `valid` `icon` `name` `onValueChange` `onSearch` | [`ArenaMultiSelect.prompt.md`](./arena-multi-select/ArenaMultiSelect.prompt.md) |
| `ArenaNumberField` | A field that holds one number, typed or stepped by a key or by its two stepper buttons. The number is clamped to its bounds and written in a locale's format while it is not being edited. The value is a number and empty is its absence, so no payload is ever text or NaN. A commit happens on blur, on Enter and on every key or stepper step, never per keystroke. Focus is the focus ring on the field, error the danger tone, valid the success tone with a check, in the order ArenaInput states. | `label*` `showLabel` `id` `hint` `error` `valid` `required` `validate` `validateOn` `value` `min` `max` `step` `format` `prefix` `suffix` `steppers` `disabled` `readOnly` `placeholder` `name` `onValueChange` `onClear` | [`ArenaNumberField.prompt.md`](./arena-number-field/ArenaNumberField.prompt.md) |
| `ArenaPinInput` | A short code entered one character per cell, such as a one-time code sent by text message. The cells are real text fields in a labelled group with one tab stop. A typed character fills its cell and moves on, Backspace walks back, and a pasted or autofilled code spreads across the cells. The code is one string, submitted once under `name`. Focus is the focus ring on one cell, error the danger tone on every cell and valid the success tone with a check, in the order ArenaInput states. | `label*` `length` `characters` `masked` `value` `hint` `error` `valid` `required` `disabled` `name` `autoComplete` `onValueChange` `onComplete` `onBlur` | [`ArenaPinInput.prompt.md`](./arena-pin-input/ArenaPinInput.prompt.md) |
| `ArenaRadio` | One option inside an ArenaRadioGroup. Selected shows a primary-fill dot inside the ring. | `value*` `label` `hint` `disabled` | [`ArenaRadio.prompt.md`](./arena-radio/ArenaRadio.prompt.md) |
| `ArenaRadioGroup` | Single-selection group. Governs the value and distributes it to its child Radios. | `ariaLabel*` `children` `value` `name` `disabled` `onValueChange` | [`ArenaRadioGroup.prompt.md`](./arena-radio-group/ArenaRadioGroup.prompt.md) |
| `ArenaSelect` | Styled native dropdown selector, with the same validation vocabulary ArenaInput carries. The four states are ordered and the order is the same normative one: error, then focus, then valid, then neutral. An errored control stays in the danger tone while it has focus, because the validation signal must not disappear at the moment the user acts on it. A form that mixes ArenaInput and ArenaSelect is a form whose fields must report a failure the same way, or it gets validated by hand or not at all. | `label` `placeholder` `options` `value` `disabled` `required` `hint` `error` `valid` `icon` `name` `onValueChange` | [`ArenaSelect.prompt.md`](./arena-select/ArenaSelect.prompt.md) |
| `ArenaSlider` | A number chosen inside a range by moving a thumb along a track, or a span chosen with two thumbs. A thumb answers the pointer, touch and the keyboard, and a painted fill shows how far along it stands. Across or down, one value or two, it always carries a name and a readout. | `label*` `showLabel` `hint` `range` `value` `valueEnd` `min` `max` `step` `orientation` `valueFormat` `valuePrefix` `valueSuffix` `showValue` `disabled` `name` `onValueChange` `onCommit` `onValueEndChange` `onCommitEnd` | [`ArenaSlider.prompt.md`](./arena-slider/ArenaSlider.prompt.md) |
| `ArenaSplitButton` | One action with a menu of alternatives at its end, drawn as one control. The primary half runs the action; the caret half opens the menu. Both halves sit in a named group, and each is a tab stop. | `children*` `icon` `destructive` `loading` `disabled` `type` `label*` `menuLabel*` `items*` `align` `onActivate` `onSelect` | [`ArenaSplitButton.prompt.md`](./arena-split-button/ArenaSplitButton.prompt.md) |
| `ArenaSwitch` | A controlled on/off switch showing an icon per state. `confirm` gates a high-impact change through an ArenaConfirmDialog before it applies. | `state` `iconOn` `iconOff` `label*` `disabled` `confirm` `onFuncOn` `onFuncOff` `onRequestChange` | [`ArenaSwitch.prompt.md`](./arena-switch/ArenaSwitch.prompt.md) |
| `ArenaTextarea` | Multi-line text field with validation and an optional counter. | `label` `id` `hint` `error` `required` `counter` `autoResize` `value` `disabled` `readOnly` `placeholder` `name` `maxLength` `rows` `onValueChange` | [`ArenaTextarea.prompt.md`](./arena-textarea/ArenaTextarea.prompt.md) |

19 forms components in this layer.
