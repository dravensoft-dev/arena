Arena text field, label above, hint or error below, and a validation state the field wears.
Standalone, `OnPush`, signal I/O. The host binds the root slot, so `<arena-input>` is itself
the column its parent lays out. The control is a real `<input>`, named by a real
`<label for>`.

```html
<arena-input label="Project name" [value]="name()" (change)="name.set($event)"
             hint="Lowercase, no spaces" required />

<arena-input label="Repository" icon="ph-bold ph-git-branch" prefix="git@"
             [value]="repo()" (change)="repo.set($event)" />

<arena-input label="Contact email" type="email" [value]="email()" (change)="email.set($event)"
             [validate]="notEmpty" validateOn="change" />

<arena-input label="Slug" [value]="slug()" [error]="serverError()" (change)="slug.set($event)" />
<arena-input label="Created" type="date" [value]="created()" readOnly />
```

<!-- @api GENERATED from contracts/api/components/ArenaInput.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label` | primitive | `string` |  | Field label above the control. |
| `id` | primitive | `string` |  | The control's id, and what the label's `for` points at. Generated from `label` when omitted, as `in-` followed by the label with each run of whitespace replaced by a single hyphen and the whole lowercased. The derivation is normative, and the prefix differs per component on purpose: the same markup must get the same id in every layer, and an ArenaInput and an ArenaTextarea sharing a label must not collide. |
| `hint` | primitive | `string` |  | A line of help under the field. |
| `error` | primitive | `string` |  | Controlled error message; wins over `validate`. |
| `valid` | primitive | `boolean` | `false` | Force the valid (green check) state. |
| `required` | primitive | `boolean` | `false` | Marks the label and the control required. |
| `validate` | functionInput | `(value: string) => string` |  | Called on the value; returns the error message, or empty for valid. |
| `validateOn` | enum | `ArenaValidateOn` | `"blur"` | When `validate` runs. |
| `type` | enum | `ArenaInputType` | `"text"` | Native input type. |
| `icon` | primitive | `string` |  | Phosphor class name drawn at the field's start. |
| `prefix` | primitive | `string` |  | Static text Arena draws before the value, e.g. `git@`. |
| `value` | primitive | `string` |  | The controlled text. |
| `disabled` | primitive | `boolean` | `false` | Blocks editing and dims it. |
| `readOnly` | primitive | `boolean` | `false` | Shows the value but blocks editing. |
| `placeholder` | primitive | `string` |  | Shown when empty. |
| `name` | primitive | `string` |  | Submitted with the form. |
| `autoComplete` | primitive | `string` |  | The browser autofill hint. |
| `min` | primitive | `string` |  | Minimum, for number/date types. |
| `max` | primitive | `string` |  | Maximum, for number/date types. |
| `step` | primitive | `string` |  | Step, for number/date types. |
| `maxLength` | primitive | `number` |  | Caps the length. |
| `pattern` | primitive | `string` |  | A regex the value must match. |
| `change` | event | `string` |  | Edited; carries the new value. |
| `blur` | event | `string` |  | Left the field; carries the value. |

<!-- @api end -->

**`validate` is the one member that takes a function.** You supply it, the component calls it on
the field's value, and it returns the error message or the empty string. Bind it as a bare
arrow: the input is optional already, so a `| undefined` arm in the type says a second time what
leaving it unbound says once.

```ts
readonly validate = input<(value: string) => string>();
```

Return the message, or the empty string when the value is good.

**Do / Don't**
- It is **controlled**. `value` is what the consumer owns; `change` fires on every keystroke and
  carries the text. **Angular will not force the DOM back**: ignore `change` and the box keeps
  what the user typed. Wire the signal.
- `error` **wins over `validate`**, and it wins even when it is the empty string: a controlled
  error that is present-and-blank suppresses the validator and shows the hint. Every use of the
  resolved error reads its truthiness rather than its nullness, which is what
  `ArenaInput.json` contracts. Pass `undefined`, not `''`, to mean "no controlled error".
- `validate` runs on blur by default. Its message appears only once the field is **touched**, so
  an untouched form never accuses the user of anything. `validateOn="change"` touches on the
  first keystroke instead; reach for it on a field with a cheap, obvious rule.
- The valid state (green ring, check) is either `valid` set by the consumer, or a touched field
  whose validator returned nothing. It is not "the field has a value".
- The focus ring is the field's, not the control's: the `field` slot carries `focus-within:`,
  so there is no focus signal to keep in sync with the DOM.
- `id` is derived from `label` as `in-<slug>` when you do not pass one; the derivation
  `ArenaInput.json` states, so the same markup gets the same id in every layer. Pass `id` when two
  fields share a label.
- `required` and `readOnly` land on the native attributes rather than on `aria-required` and
  `aria-readonly`. Those are what a native control's accessibility tree already reports, and
  writing both would be two claims that can disagree.
- `icon`, `prefix` and the status glyphs are decoration and all four are `aria-hidden`. The error
  message beside the glyph is what carries the state, so nothing announces a Phosphor
  ligature beside the message it duplicates.
- The error line **replaces** the hint rather than stacking under it. Two lines of guidance under
  one field is one too many.
- `type` is the `ArenaInputType` enum. `checkbox` and `radio` are not among them: those are
  `<arena-checkbox>` and `ArenaRadio`, their own components.
- Don't reach for `change` to run an expensive query. It fires per keystroke by design; debounce
  in the consumer, where the interval is a decision about that query rather than about the field.

**By hand, in real Chromium**: none of these is provable in happy-dom. Run `bun run demos` and
open `/frameworks/angular/components/forms/arena-input/ArenaInput.demo.generated.html`:
- `type="date"`: the picker indicator is **visible** on the dark field and brightens on hover.
  That is Arena's own `[&::-webkit-calendar-picker-indicator]:` styling reading
  `--picker-invert`; without it the browser draws a black glyph on a dark surface. Toggle
  `.arena-light` on `<html>` and it must invert with the theme.
- The gold focus ring appears on the field group, not on the input, and a valid field keeps its
  green border while showing that ring.
- The error border and ring appear at rest, with no focus needed.
- Typing into the validated field and leaving it produces the message on blur, and the
  `validateOn="change"` one produces it while typing and clears it again.

### Taking focus, the one method on the component

`arena-input` exposes `focus()` and `select()` on the class. Reach them with a `viewChild`, and
never by querying the real `<input>` out of the host, which is Arena's markup and can move:

```ts
readonly search = viewChild.required(ArenaInput);

completeSale(): void {
  this.record();
  this.search().focus();
  this.search().select();
}
```

They are methods rather than members because no member is imperative, and `autoFocus` would
answer a different question: it fires once at mount, and chaining sales needs focus back after
**every** completion. These two are the whole surface; `ArenaInput` exposes no other method.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
