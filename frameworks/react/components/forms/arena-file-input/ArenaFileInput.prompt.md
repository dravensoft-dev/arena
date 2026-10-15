A file picker: a labelled trigger, an optional drop zone, a chip for each file held and a line for each file refused. `onChange` carries an `ArenaFileSelection` and `onReject` an `ArenaFileRejection`, each a set of parallel arrays of names, sizes and types, never a `File`. The files themselves reach you two ways: a real `<form>` submits them under `name`, and a ref hands them to code that uploads without one.

```tsx
<ArenaFileInput label="Passport scan" name="passport" accept=".pdf,image/*" maxSize={5_000_000} required />

const attachments = useRef<ArenaFileInputHandle>(null);
<ArenaFileInput ref={attachments} label="Attachments" multiple droppable
  onChange={(selection) => setCount(selection.names.length)}
  onReject={(rejection) => setRefused(rejection.tooLarge.length + rejection.wrongType.length)} />

async function upload() {
  for (const file of attachments.current?.files() ?? []) await send(file);
  attachments.current?.clear();
}
```

<!-- @api GENERATED from contracts/api/components/ArenaFileInput.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names what is being attached, such as "Passport scan". It labels the field and, followed by the trigger's own text, names the trigger, so a screen reader hears "Passport scan, Choose file". Required, and guarded at runtime: a blank one throws, because nothing can derive what a file is for. |
| `id` | primitive | `string` |  | The trigger's id, and what the label's `for` points at. Generated from `label` when omitted, as `fi-` followed by the label with each run of whitespace replaced by a single hyphen and the whole lowercased. The derivation is normative, and the prefix differs per component on purpose: the same markup must get the same id in every layer, and two controls sharing a label must not collide. The label and the trigger's text take this id followed by `-label` and `-text`. The hint or the error takes it followed by `-note`, and the required word takes `-required`. |
| `hint` | primitive | `string` |  | A line of help under the field, and the trigger's description. An error replaces it while one shows. |
| `error` | primitive | `string` |  | Controlled error message, such as a count rule or a refusal from the server. Wins over the hint and turns the zone's edge to the danger hue. It describes the trigger, and a changed message is announced once. |
| `required` | primitive | `boolean` | `false` | Marks the label and makes the hidden file input required, so a native submission refuses an empty selection, the browser's message is anchored at the trigger and focus returns to the trigger. The trigger's name then carries the required word, as in "Passport scan, required, Choose file". |
| `disabled` | primitive | `boolean` | `false` | Blocks the trigger, the drop zone and every chip's remove, and dims the field. |
| `name` | primitive | `string` |  | The name the files are submitted under. The hidden file input carries it and always holds exactly the files shown, so a native submission and `new FormData(form)` carry the real files. |
| `accept` | primitive | `string` |  | The native `accept` syntax, such as `.pdf,image/*`: extensions, exact types and wildcard types. It narrows the picker and is enforced on every pick and every drop, because a drop is not filtered by the browser. |
| `multiple` | primitive | `boolean` | `false` | Whether more than one file may be held. With it a pick or a drop appends, and a file already held, the same name, size and modified time, is held once. Without it a pick replaces the selection, and every accepted file after the first in one drop is refused as surplus. |
| `maxSize` | primitive | `number` |  | The largest file held, in bytes; a file of exactly this size is held. A bigger one is refused and never held. |
| `droppable` | primitive | `boolean` | `false` | Whether the field is a drop zone with a dashed frame. Without it the field cancels no drag and a file dropped on it is the browser's. The trigger is the keyboard route either way. |
| `onChange` | event | `ArenaFileSelection` |  | The selection changed through a pick, a drop or a chip's remove; carries the whole selection as metadata, in held order. A clear the host asks for, and a form reset, fire nothing. |
| `onReject` | event | `ArenaFileRejection` |  | Files in the last pick or drop were refused; carries their names by reason. Never fires empty. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`emphasis`](../../../../VOCABULARY.md#emphasis): `arena-emphasis-ghost`, `arena-emphasis-secondary` (default). Write one as `className="arena-emphasis-ghost"` on the component, or on a container whose components should all take it.

**Answers** [`size`](../../../../VOCABULARY.md#size): `arena-size-lg`, `arena-size-md` (default), `arena-size-sm`. Write one as `className="arena-size-lg"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys**, from [`button`](../../../../../contracts/behaviour/button.json):
- `Space`: activate.
- `Enter`: activate.
<!-- @keys end -->

**Reading the selection.** `names`, `sizes` and `types` are parallel: the file at one index in each is one file, in the order the chips show. Every `onChange` carries the whole selection, never a change to it. A size is in bytes; a type is the media type the platform reports, or an empty string.

**Taking the files, the one handle on the component.** `ArenaFileInput` forwards a ref carrying `files()` and `clear()`. `files()` returns the `File` objects held at the moment you ask; `clear()` empties the selection and fires nothing, because you asked. Inside a `<form>`, prefer `name`: the hidden file input always holds exactly the chips, so a submission and `new FormData(form)` carry them with no code of yours. A reset of that form empties the selection and fires nothing either.

**What a pick does.** Without `multiple` a pick replaces the selection, and a drop of several files holds the first and refuses the rest as surplus. With `multiple` a pick or a drop appends, and a file already held, the same name, size and modified time, is held once. `accept` and `maxSize` are checked on every pick and drop, because a drop is not filtered by the browser; a file of exactly `maxSize` bytes is held. A file is refused for one reason, a wrong type before a size. A pick that holds nothing keeps the selection as it was and fires `onReject` alone.

**Names, focus and announcements.** The trigger is a real `<button>` named by the label and then its own text, so a screen reader hears "Passport scan, Choose file". With `required`, a word read and never seen joins the name, as in "Passport scan, required, Choose file". The hint, or the error that replaces it, describes the trigger. Removing a chip returns focus to the trigger. A polite status says how many files are held, or that none is, followed by each refusal. That status also reads a changed error once. With `required`, a native submission of an empty field shows the browser's message at the trigger and moves focus there.

**Do / Don't**
- Read a refusal from `onReject` and say it your own way if you need to; the field already shows one line per refused file.
- Put a count rule, such as at most three files, in your own `onChange` and pass the message as `error`. There is no `maxFiles`.
- Upload with `files()` and then `clear()`. Neither is a prop, because a selection of files cannot be set from outside.
- Don't look for a `File` in a payload or a member: a chosen file is a platform object, and only `name` and the handle carry one.
- Don't make the zone the keyboard route or add a paste route. The trigger is the keyboard path, and the zone takes a drop only with `droppable`.
- Don't preview, crop or upload inside it. A preview is markup you write from `files()`, and an `ArenaProgressBar` beside it is yours to compose.

**By hand.** happy-dom opens no picker and drops no real file, so a browser checks six things. The picker opens from Enter and from Space on the trigger. A real drop on the zone holds the file. A drop on a field without `droppable` does what the browser does. A native submission carries the shown files and no others. An empty `required` field refused by the browser shows its message at the trigger. A long file name in a chip at 390px wraps inside the chip without overflowing the field.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
