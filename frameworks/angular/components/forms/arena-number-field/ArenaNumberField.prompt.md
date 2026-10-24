A field that holds one number. A person types it, steps it with a key or with the two stepper buttons, and reads it in the locale's format. `(valueChange)` carries a number and `(clear)` carries nothing. Requires the Phosphor sheets loaded for the stepper glyphs. Controlled, the field draws an edit as soon as it is made and follows `value` whenever the host moves it. A host that refuses an edit by leaving `value` as it was is not seen, and the edit stays drawn.

```html
<arena-number-field label="Replicas" [value]="replicas()" (valueChange)="replicas.set($event)" [min]="1" [max]="20" />

<arena-number-field #budget label="Budget" prefix="$" [step]="0.5" [format]="{ fractionDigits: 2 }"
                    [value]="amount()" (valueChange)="amount.set($event)" (clear)="amount.set(undefined)"
                    [validate]="overBudget" />
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
| `change` | event | `number` |  | A number was committed, clamped, and differs from the one before; carries it. |
| `clear` | event |  |  | The field was committed empty. Never fires with `change` for one commit, and never for a field that was already empty. |

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

- **A number, or nothing.** `(valueChange)` fires with a committed number and never for an empty field. `(clear)` fires when a person commits the field empty. No payload is text, and none is `NaN`.
- **When a commit happens.** Typing builds a draft that no output hears. Blur and Enter commit the draft, clamped to `min` and `max`. Each key and each stepper press commits at once, and Escape restores the last committed number.
- **Keys.** Up and Down move one `step`, and Page Up and Page Down move ten. Home and End reach `min` and `max` when the field has them, and otherwise move the caret. The first step from an empty field commits `min`, or `0` held inside the bounds. A typed number is clamped and never snapped.
- **Exact steps.** Each step lands on the decimal places of `step`, `min` and the number it starts from, so `0.1` plus `0.2` commits `0.3`.
- **One locale for writing and reading.** The field writes in `format.locale`, or in the `ArenaLocale` locale when the format names none. While editing, the field shows the plain number with that locale's decimal separator. A committed value is written grouped. A server render passes the locale explicitly. `compact` is ignored, because 48.2K cannot be read back.
- **Static text around the number.** Arena draws `prefix` and `suffix` beside the number, and `aria-valuetext` reads them with it. Nobody types them.
- **What a form submits.** `name` rides on a hidden input carrying the plain decimal string, such as `1234.5`. The drawn field holds formatted text and is never submitted.
- **Holding its own number.** With no `[value]` the field starts empty and keeps each commit. Bind `[value]` and `(valueChange)` together to control it.
- **One Tab stop.** The steppers sit outside the Tab sequence, since the arrow keys reach every step. A stepper at a bound is disabled. Set `[steppers]="false"` where the keys suffice.
- **The ninth form.** `validate` is a function Arena calls on a committed number, returning the message or an empty string. Arena never calls `validate` on an empty field, so mark the field `required` for that.
- **Reactive forms.** With `ArenaNumberFieldControl` from `@dravensoft/arena-angular/forms`, `formControl`, `formControlName` and `ngModel` bind the field. The control's value is a number, or `null` once the field is emptied. A `null`, an empty string or `NaN` written to the control draws the empty field. `disable()` disables the field and its steppers, and leaving the field marks it touched.
- **`(valueChange)` reports a commit.** The text field's native `change` reaches the page as a DOM event and commits nothing, so `(valueChange)` hears each commit once and never an `Event`.
- **Not the text field.** `arena-input type="number"` keeps the browser's spinner and a string value. This field owns its number, clamps the number and writes it in a locale.
- **Taking focus.** `focus()` and `select()` are methods on the class. Reach them through a `viewChild` of `ArenaNumberField`, never by querying the inner `<input>`.

**Do / Don't**
- Name the number in `label`, such as "Replicas", and never "Number".
- Listen to `(clear)` when an empty field matters to the host.
- Don't pass a formatter function; `format` is the datum.
- Don't put a currency or a unit in `format`. Use `prefix` and `suffix` instead.
- Don't expect the mouse wheel or a held press to step the number.

**By hand.** A phone's decimal keypad, where iOS has no minus key and the steppers reach a negative number. The stepper target under `arena-comfortable`. Home and End against a bound. The focus ring on the field.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
