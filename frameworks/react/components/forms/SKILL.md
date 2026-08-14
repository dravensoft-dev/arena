<!-- GENERATED from the contracts by bun run generate:skills. Edit the contracts, not this file. -->

# Arena forms components, the React layer

Every forms component this layer ships, under the names it binds them to. **This page is an
index, not a manual.** How to write one is its own prompt, linked in the last column.

**The voice this application takes, and the rules every component below answers to, are decided in
[`../../../../SKILL.md`](../../../../SKILL.md) before any component here**, and nothing on this
page restates them.

Import from the package root, never from a path inside it:

```tsx
import { ArenaButton, ArenaTag } from '@dravensoft/arena-react';
```

A member is a prop. The main slot is `children`, a named slot is a prop taking a node, and an
event is an `on`-prefixed handler. An icon is a Phosphor class-name string, never an element.

- Every other category this layer ships: [`../../SKILL.md`](../../SKILL.md).
- Installing the package, declaring your skin, and what it exports besides components:
  [`../../PACKAGE.md`](../../PACKAGE.md).
- **Takes** is the members the component's API contract declares, in contract order, under this
  layer's own names. A member marked `*` is required; the prompt gives its type and its default.
- **A member whose type is an object or an enum takes one this package exports.** The prompt
  names the type and says what it is for; the fields it holds are in the type declaration itself,
  which `import type { … } from '@dravensoft/arena-react'` brings in. That field list is in neither
  the prompt nor the contract, so the type is where you read it.

| Component | What it is | Takes | Usage |
|---|---|---|---|
| `ArenaButton` | Action button. One primary per view; danger stays outline. | `children` `variant` `size` `icon` `iconRight` `loading` `full` `disabled` `type` `name` `value` `autoFocus` `form` `tabStop` `onClick` | [`ArenaButton.prompt.md`](./arena-button/ArenaButton.prompt.md) |
| `ArenaCheckbox` | A single checkbox. Checked shows a crimson fill with a check. | `checked` `label` `disabled` `required` `name` `value` `onChange` | [`ArenaCheckbox.prompt.md`](./arena-checkbox/ArenaCheckbox.prompt.md) |
| `ArenaIconButton` | Icon-only button. Carries an accessible name in every state, not only on hover. | `icon*` `label*` `size` `variant` `showLabel` `pressed` `disabled` `type` `name` `value` `autoFocus` `form` `tabStop` `onClick` | [`ArenaIconButton.prompt.md`](./arena-icon-button/ArenaIconButton.prompt.md) |
| `ArenaInput` | Text field with validation. Focus is a gold ring; error crimson; valid green with a check. The four states are ordered and the order is normative: error, then focus, then valid, then neutral: an errored field stays crimson while it has focus, because the validation signal must not disappear at the moment the user acts on it. | `label` `id` `hint` `error` `valid` `required` `validate` `validateOn` `type` `icon` `prefix` `value` `disabled` `readOnly` `placeholder` `name` `autoComplete` `min` `max` `step` `maxLength` `pattern` `onChange` `onBlur` | [`ArenaInput.prompt.md`](./arena-input/ArenaInput.prompt.md) |
| `ArenaRadio` | One option inside an ArenaRadioGroup. Selected shows a crimson dot inside the ring. | `value*` `label` `hint` `disabled` | [`ArenaRadio.prompt.md`](./arena-radio/ArenaRadio.prompt.md) |
| `ArenaRadioGroup` | Single-selection group. Governs the value and distributes it to its child Radios. | `ariaLabel*` `children` `value` `name` `onChange` | [`ArenaRadioGroup.prompt.md`](./arena-radio-group/ArenaRadioGroup.prompt.md) |
| `ArenaSelect` | Styled native dropdown selector, with the same validation vocabulary ArenaInput carries. The four states are ordered and the order is the same normative one: error, then focus, then valid, then neutral -- an errored control stays crimson while it has focus, because the validation signal must not disappear at the moment the user acts on it. A form that mixes ArenaInput and ArenaSelect is a form whose fields must report a failure the same way, or it gets validated by hand or not at all. | `label` `placeholder` `options` `value` `disabled` `required` `hint` `error` `valid` `icon` `name` `onChange` | [`ArenaSelect.prompt.md`](./arena-select/ArenaSelect.prompt.md) |
| `ArenaSwitch` | A controlled on/off switch showing an icon per state. `confirm` gates a high-impact change through an ArenaConfirmDialog before it applies. | `state` `orientation` `size` `iconOn` `iconOff` `label*` `disabled` `confirm` `onFuncOn` `onFuncOff` `onRequestChange` | [`ArenaSwitch.prompt.md`](./arena-switch/ArenaSwitch.prompt.md) |
| `ArenaTextarea` | Multi-line text field with validation and an optional counter. | `label` `id` `hint` `error` `required` `counter` `autoResize` `value` `disabled` `readOnly` `placeholder` `name` `maxLength` `rows` `onChange` | [`ArenaTextarea.prompt.md`](./arena-textarea/ArenaTextarea.prompt.md) |

9 forms components in this layer.
