A short code entered one character per cell, such as the one-time code a text message carries. The cells are real text fields in one labelled group, and the code is one string. Controlled, the code draws `value` as given, so a host that leaves `value` as it was refuses the edit.

```tsx
<ArenaPinInput label="Verification code" value={code} onChange={setCode} onComplete={verify} name="otp" />
<ArenaPinInput label="Device PIN" length={4} masked autoComplete="off" value={pin} onChange={setPin} />
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
| `onChange` | event | `string` |  | The code after an edit, whatever its length; a refused character fires nothing. |
| `onComplete` | event | `string` |  | The code, when an edit makes it `length` characters long. Fires after `onChange`. A typed character fires it only when it completes the code anew. A paste or autofill of more than one character fires it whenever the code ends full. A `value` the host fills does not fire it. |
| `onBlur` | event | `string` |  | Focus left the group; carries the code. A move from one cell to another is not a blur. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none (`textbox`).
<!-- @keys end -->

**The code is one string.** `onChange` carries the whole code after each edit, whatever its length. `onComplete` carries it once an edit fills the last cell. A paste or autofill of more than one character that leaves the code full fires it again, even over a full code. A code the host writes into `value` fires neither.

**One tab stop for the whole code.** Tab reaches one cell: the first empty one, or the last when the code is full. Shift+Tab and Tab leave the group in one press.

**Typing walks the cells.** A character fills its cell and moves focus on. A character `characters` refuses changes nothing. Backspace empties a filled cell and keeps focus there, and on an empty cell it empties the one before and steps back. Delete empties the cell and stays. The later characters close up, so the code never holds a gap.

**Arrows, Home and End move between cells** without wrapping. Right to left, Left and Right swap, as the page reads.

**A paste or an autofill spreads across the cells.** A code as long as `length` fills from the first cell wherever it lands. A shorter one fills from the focused cell. Characters `characters` refuses are dropped first.

**`characters` decides the keypad.** `numeric` asks a phone for the number pad. `alphanumeric` asks for the full keyboard and keeps letters as typed.

**`name` submits the whole code once** through a hidden input. The cells carry no name.

**`onBlur` means the group.** Focus moving between cells fires nothing, and focus leaving any cell for something outside carries the code once.

**Each cell is named by its position**, from the locale's `pinInputCell` word. The group is named by `label`, and a blank `label` throws. The hint, or the error that replaces it, describes every cell.

**The wrapper is a `group`, held by the suite.** The cells bind `textbox`; the group's role and name are asserted directly.

### Taking focus

`ArenaPinInput` forwards a ref carrying `focus()`, which focuses the first cell. Reach it through the ref, and never by querying a cell out of the DOM. After a wrong code, empty `value` and call it:

```tsx
const otp = useRef<ArenaPinInputHandle>(null);
setCode('');
otp.current?.focus();
```

**Do**
- Name the code by what it unlocks, such as "Verification code", never "Code".
- Pass `autoComplete="off"` for a device PIN no text message carries.

**Don't**
- Don't verify, resend or time out the code here; `onComplete` reports and the host decides.
- Don't empty `value` on each keystroke; empty it once when the code is wrong, then call `focus()`.

**By hand.** The text message autofill on iOS and Android lands the whole code. The number pad appears for `numeric`. Tab leaves the group in one press. The gold ring sits on one cell only. Six cells fit at 390px.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
