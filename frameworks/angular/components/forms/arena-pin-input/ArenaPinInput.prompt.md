A code typed one character per cell, such as a verification code from a text message. Each cell is a real text field inside one labelled group, and `(change)` carries the whole code as one string. Controlled, the field draws an edit as soon as it is made and follows `value` whenever the host moves it. A host that refuses an edit by leaving `value` as it was is not seen, and the edit stays drawn.

```html
<arena-pin-input label="Verification code" name="otp" [value]="code()" (change)="code.set($event)" (complete)="verify($event)" />

<arena-pin-input #pin label="Device PIN" [length]="4" masked autoComplete="off" [value]="devicePin()" (change)="devicePin.set($event)" />
```

<!-- @api GENERATED from contracts/api/components/ArenaPinInput.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names the code, such as "Verification code", drawn above the cells and the group's accessible name. Required, and guarded at runtime: a blank one throws, because nothing can derive what a code is for. |
| `length` | primitive | `number` | `6` | How many cells, one per character. A value that is not a whole number of at least 1 reads as 6. |
| `characters` | enum | `ArenaPinCharacters` | `"numeric"` | Which characters a cell accepts, and which keypad a phone shows. A refused character changes nothing and fires no event. |
| `masked` | primitive | `boolean` | `false` | Hides what each cell holds, as a password field does. |
| `value` | primitive | `string` |  | The whole code. Absent, the cells hold what the person types; present, it controls them. A string shorter than `length` fills the first cells, and a character `characters` refuses is dropped. |
| `hint` | primitive | `string` |  | A line of help under the cells, and each cell's description. An error replaces it while one shows. |
| `error` | primitive | `string` |  | Controlled error message; the cells turn crimson and invalid, and the message describes each cell while it shows. |
| `valid` | primitive | `boolean` | `false` | Force the valid (green check) state. |
| `required` | primitive | `boolean` | `false` | Marks the label and sets the native `required` on every cell, so a native submission refuses a code with an empty cell. |
| `disabled` | primitive | `boolean` | `false` | Blocks editing and dims it. |
| `name` | primitive | `string` |  | Submitted with the form as the whole code, once, through a hidden input. The cells carry no name, so a form never receives one character on its own. |
| `autoComplete` | primitive | `string` | `"one-time-code"` | The browser autofill hint, on every cell. A code that is not sent by text message, such as a device PIN, passes `off`. |
| `change` | event | `string` |  | The code after an edit, whatever its length; a refused character fires nothing. |
| `complete` | event | `string` |  | The code, when an edit makes it `length` characters long. Fires after `change`. A typed character fires it only when it completes the code anew. A paste or autofill of more than one character fires it whenever the code ends full. A `value` the host fills does not fire it. |
| `blur` | event | `string` |  | Focus left the group; carries the code. A move from one cell to another is not a blur. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none (`textbox`).
<!-- @keys end -->

- **A string, never a list.** `(change)` fires with the whole code after each edit. `(complete)` fires after it when an edit fills the last cell. A paste or autofill of more than one character that leaves the code full fires it again, even over a full code. Writing `[value]` from the host fires neither output.
- **A single Tab stop.** The group offers one cell to Tab: the first empty cell, or the last cell of a full code. One press of Tab or Shift+Tab leaves the group.
- **Typing.** Each accepted character fills the focused cell, then focus moves to the next cell. A refused character leaves every cell as it was and emits nothing.
- **Emptying.** Backspace on a filled cell empties that cell and keeps focus on it. On an empty cell, Backspace empties the cell before and moves there. Delete empties the focused cell, and later characters shift back.
- **Moving.** ArrowLeft and ArrowRight step between cells and stop at both ends. Home and End jump to the first and last cell. Under `dir="rtl"` the two arrows trade places.
- **Pasting and autofill.** Arena filters pasted text through `characters` first. A full-length code lands from the first cell, whichever cell received the paste. A shorter code lands from the focused cell onward.
- **Keypads.** `characters="numeric"` brings up a phone's number pad. `characters="alphanumeric"` brings up the full keyboard and keeps the case of each letter.
- **What a form submits.** `name` rides on one hidden input holding the whole code. No cell carries a name.
- **Names.** The group takes its name from `label`, and a blank `label` throws. Each cell is named by its position through the locale's `pinInputCell` word. A hint or an error describes every cell.
- **The group role.** The cells bind the `textbox` pattern. The wrapper's `group` role and name are asserted by the component's own suite.
- **`(change)` belongs to the component.** Each cell's native `change` stops inside the component, so a listener on the host hears the code and never an `Event`.
- **`(blur)` means the group.** Focus moving between cells emits nothing. Focus leaving the group for anything outside emits the code once.
- **Reactive forms.** With `ArenaPinInputControl` from `@dravensoft/arena-angular/forms`, `formControl`, `formControlName` and `ngModel` bind the code. The control's value is the code as a string, and a `null` empties every cell. `disable()` disables every cell. Leaving the group marks the control touched, and a move between cells does not.
- **Taking focus.** `focus()` is a method on the class and focuses the first cell. Reach it through a `viewChild` of `ArenaPinInput`, never by querying a cell, and call it after emptying `[value]` for a wrong code.

**Do / Don't**
- Name the code in `label` by what it unlocks, such as "Verification code".
- Pass `autoComplete="off"` for a PIN that no text message sends.
- Don't check, resend or expire the code here. `(complete)` reports, and the host decides.
- Don't empty `[value]` on each keystroke. Empty it once when the code is wrong, then call `focus()`.

**By hand.** A text message autofill on iOS and on Android fills every cell. The number pad shows for `numeric`. Tab crosses the whole group in one press. Only the focused cell carries the gold ring. Six cells fit a 390px screen.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
