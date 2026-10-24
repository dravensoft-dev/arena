A field that holds one number. A person types it, steps it with a key or with the two stepper buttons, and reads it in a locale's format. Requires the Phosphor sheets loaded for the stepper glyphs. Controlled, the field draws `value` as given, so a host that leaves `value` as it was refuses the edit.

```tsx
<ArenaNumberField label="Replicas" value={replicas} onValueChange={setReplicas} min={1} max={20} />
<ArenaNumberField label="Budget" prefix="$" value={budget} onValueChange={setBudget} onClear={() => setBudget(undefined)}
  format={{ fractionDigits: 2 }} step={0.5} validate={(v) => (v > 50000 ? 'Over the approved budget' : '')} />
```

<!-- @api GENERATED from contracts/api/components/ArenaNumberField.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names the number, such as "Replicas", and labels the field. Required, and guarded at runtime: a blank one throws, because nothing can derive what a number counts. |
| `showLabel` | primitive | `boolean` | `true` | Draws the label above the field. False keeps the accessible name and drops the drawn text, for a field inside a row that already names it. |
| `id` | primitive | `string` |  | The field's id, and what the label's `for` points at. Generated from `label` when omitted, as `nf-` followed by the label with each run of whitespace replaced by a single hyphen and the whole lowercased. The derivation is normative, and the prefix differs per component on purpose. Identical markup must get an identical id in every layer, and two controls sharing a label must not collide. The hint or the error takes it followed by `-note`. |
| `hint` | primitive | `string` |  | A line of help under the field, and the field's description. An error replaces it while one shows. |
| `error` | primitive | `string` |  | Controlled error message; wins over `validate`, and describes the field while it shows. |
| `valid` | primitive | `boolean` | `false` | Force the valid (success-tone check) state. |
| `required` | primitive | `boolean` | `false` | Marks the label and sets the native `required` on the field, so a native submission refuses an empty one. |
| `validate` | functionInput | `(value: number) => string` |  | Called on a committed number; returns the error message, or empty for valid. Never called for an empty field. |
| `validateOn` | enum | `ArenaValidateOn` | `"blur"` | When `validate` runs: "blur" on a commit by blur or Enter, "change" on every commit, a key or stepper step included. |
| `value` | primitive | `number` |  | The committed number. Absent, the field is empty and holds what the person commits; present, it controls the field. A number outside `min` and `max` is drawn and announced at the nearest bound, and nothing is reported. |
| `min` | primitive | `number` |  | The lowest number a commit keeps. Home goes to it, and the decrease stepper stops at it. |
| `max` | primitive | `number` |  | The highest number a commit keeps. End goes to it, and the increase stepper stops at it. |
| `step` | primitive | `number` | `1` | What an arrow key or a stepper adds or takes away; Page Up and Page Down move ten of it. A step lands on the decimal places of `step`, `min` and the number it starts from, and a typed number is clamped but never snapped to it. A step that is not a positive number reads as 1. |
| `format` | object | `ArenaNumberFormat` |  | How the value is written while the field is not being edited. Absent, or with no `locale`, it follows `ArenaLocale.locale`, and the field reads typed text in the same locale. `compact` is ignored, because 48.2K cannot be read back. |
| `prefix` | primitive | `string` |  | Static text Arena draws before the number, such as `$`. Spoken with the value, never typed. |
| `suffix` | primitive | `string` |  | Static text Arena draws after the number, such as `kg`. Spoken with the value, never typed. |
| `steppers` | primitive | `boolean` | `true` | Whether the decrease and increase buttons are drawn at the field's two ends. The steppers stay out of the Tab sequence: the field is the one stop, and its arrow keys do what they do. |
| `disabled` | primitive | `boolean` | `false` | Blocks editing and both steppers, and dims the field. |
| `readOnly` | primitive | `boolean` | `false` | Shows the value at full contrast on the panel surface and blocks editing; no key and no stepper changes it. |
| `placeholder` | primitive | `string` |  | Shown when empty. |
| `name` | primitive | `string` |  | Submitted with the form as the plain decimal string, such as `1234.5`, through a hidden input; empty when the field is empty. The drawn field carries formatted text and is never submitted. |
| `onValueChange` | event | `number` |  | A number was committed, clamped, and differs from the one before; carries it. The native change of the inner field is never stopped, so a listener on the document hears it; this event carries the value. |
| `onClear` | event |  |  | The field was committed empty. Never fires with `onValueChange` for one commit, and never for a field that was already empty. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys**, from [`spinbutton`](../../../../../contracts/behaviour/spinbutton.json):
- `ArrowUp`: increases the value by one step.
- `ArrowDown`: decreases the value by one step.
- `Home`: sets the value to its minimum, only when the spinbutton has a minimum.
- `End`: sets the value to its maximum, only when the spinbutton has a maximum.
<!-- @keys end -->

**The value is a number, and an empty field is its absence.** `onValueChange` carries a number and never fires for an empty field. `onClear` carries nothing and fires when a person commits the field empty. A payload is never text and never `NaN`, so no consumer parses anything.

**A commit happens on blur, on Enter and on every step.** Typing builds a draft that reaches no payload. Blur and Enter commit the draft, clamped to `min` and `max`. A key or a stepper press commits at once. Escape puts back the last committed number.

**Keys.** Up and Down move one `step`. Page Up and Page Down move ten. Home and End go to `min` and `max` when the field has them, and otherwise move the caret. From an empty field the first step commits `min`, or `0` inside the bounds. A typed number is clamped and never snapped to `step`.

**Arithmetic never drifts.** A step lands on the decimal places of `step`, `min` and the number it starts from, so `0.1 + 0.2` commits `0.3`.

**Writing and reading follow one locale.** Set `format.locale` for the number, or leave it out to follow `ArenaLocale.locale`. While a person edits, the field shows the plain number with the locale's decimal separator. Once the field commits, the value is written grouped. A server render needs `format.locale` or the provider's locale passed explicitly. `compact` is ignored here, because 48.2K cannot be read back.

**`prefix` and `suffix` are static text Arena draws** beside the number. The reading a screen reader hears includes both, through `aria-valuetext`. A person never types them.

**`name` submits the plain decimal string**, such as `1234.5`, through a hidden input. The drawn field holds formatted text and is never submitted.

**`value` absent means the field holds its own number.** Bind `value` and `onValueChange` to control it, as with any field. Without `value`, the field starts empty and keeps what a person commits.

**The steppers stay out of the Tab sequence.** The field is the one stop, and its arrow keys reach every step. A stepper at a bound is disabled. Set `steppers={false}` for a dense row where the keys suffice.

`validate` is the **ninth form**, a function Arena calls on a committed number. The function returns the error message, or an empty string for a valid number. Arena never calls `validate` for an empty field; mark the field `required` for that.

**`ArenaInput type="number"` is a different control.** That one is a text field with the browser's spinner and a string value. This one is a number Arena owns, clamps and writes in a locale.

### Taking focus

`ArenaNumberField` forwards a ref carrying `focus()` and `select()`. Reach them through it, and never by querying the `<input>` out of the DOM:

```tsx
const replicas = useRef<ArenaNumberFieldHandle>(null);
replicas.current?.focus();
replicas.current?.select();
```

**Do**
- Give every field a `label` that names what the number counts, such as "Replicas", never "Number".
- Bind `onClear` when an empty field means something to the host.

**Don't**
- Don't pass a formatter function; `format` is the datum.
- Don't put a currency or a unit in `format`; use `prefix` and `suffix`.
- Don't expect the mouse wheel or a press-and-hold to step the number. Neither is supported.

**By hand.** A phone's decimal keypad, where iOS draws no minus, so a negative number comes from the steppers. The stepper target at `arena-comfortable`. Home and End against a bound. The focus ring on the field.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
