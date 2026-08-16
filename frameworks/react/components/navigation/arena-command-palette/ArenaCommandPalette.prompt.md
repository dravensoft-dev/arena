Power-user accelerator (H7). Open it with Cmd/Ctrl+K from the host and pass it the list of
commands. `open` and `commands` are both required; the component throws from its render if
either is absent. Each command's `icon` is a Phosphor class name Arena draws, not a node.
Activating a command emits `onRun` with the command that ran, after `onClose` has already
fired, the host discriminates which command ran by switching on `id`, which is required on
every `ArenaCommand`.

```tsx
const [open, setOpen] = useState(false);
useEffect(() => {
  const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(true); } };
  window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
}, []);
<ArenaCommandPalette open={open} onClose={() => setOpen(false)} commands={[
  { id: 'deploy', label: 'Deploy to production', icon: 'ph-bold ph-rocket-launch', shortcut: 'D' },
  { id: 'revert', label: 'Roll back last deployment', icon: 'ph-bold ph-arrow-counter-clockwise' },
]} onRun={(command) => {
  if (command.id === 'deploy') deploy();
  else if (command.id === 'revert') revert();
}} />
```

<!-- @api GENERATED from contracts/api/components/ArenaCommandPalette.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `open*` | primitive | `boolean` |  | Whether the palette is shown. Closed renders nothing. |
| `commands*` | array | `readonly ArenaCommand[]` |  | Every command the palette can find. Filtered by label and hint as the user types. |
| `placeholder` | primitive | `string` | `"Search for an action or project…"` | The search field's placeholder. |
| `maxResults` | primitive | `number` |  | How many matches the list shows at most. Absent, all of them. The ceiling applies AFTER the query has run over every command, which is what makes it different from the caller trimming `commands` before passing them: a trimmed list cannot match what was cut, and a capped one can, so the first rows are still the best the whole set has. It is the palette's rather than the domain's, because how many rows help before the list stops being an accelerator is a property of this control; a caller who caps their own collection has guessed at it once, for one collection, with no query in hand. It is not ranking: the order stays the order the caller passed, ungrouped first and then each group as it first appears. |
| `onClose` | event |  |  | The palette asked to be closed: Escape, the scrim, or a command having been run. |
| `onRun` | event | `ArenaCommand` |  | A command was activated, carrying which one. Emitted after close. For a command with `route` it fires for a primary click with no modifier and for Enter, both of which cancel the row's anchor first, so the two activations do the same thing and a host that routes here never navigates twice; a modified or middle click on such a row is the browser's, fires nothing and does not close the palette. |

<!-- @api end -->

### Groups and routes

`group` heads a command's section. Commands with no group list first and ungrouped, then each
group in the order its first command appears, so a palette built by concatenating four
collections gets its headings back without the caller reordering anything. The heading is
drawn and also announced as the group's name, so it carries `aria-hidden` on the visible copy
rather than being read twice.

`route` says where running a command goes. With it the row renders an `<a href>`, so
ctrl-click, middle-click and open-in-new-tab work, which is what an accelerator over a list of
destinations owes a keyboard user. It keeps `role="option"`, because the listbox pattern
requires that of every row and losing it would break the arrow walk for the whole list: a
screen reader announces the row as an option rather than as a link, and that is the trade.

**With `route`, the mouse and the keyboard do the same thing, and that is the point.** The
row's plain activation reports through `onRun`, so a host that navigates in its `onRun` handler
navigates exactly once, whichever way the reader activated the row. A modified click opens the
destination itself and **leaves the palette open**, because a reader who asked for a second tab
did not ask to leave this one.

`maxResults` caps how many matches the list shows. **Reach for it instead of trimming
`commands` before you pass them**, which is the thing that does not work: a list cut to the
forty most recent invoices cannot match the one from March, and the query never gets the
chance. The cap runs after the search, so the rows are still the best the whole set has.

There is still no ranking member. A scoring function would be a `functionInput` in a contract
that declares no `kind: "input"`, and a better order is an improvement inside the component
rather than something a caller supplies; `maxResults` changes how many rows are shown and
never which ones come first.

### The shortcut is yours, and that is deliberate

The palette is named after Cmd/Ctrl+K and binds nothing, which is why the example above wires
the key in the host. A global key binding belongs to the application: it has to know which
other surface owns the key, whether a dialog is already up, and whether the reader is typing
in a field. A component that took the key would fight the host for it and win by accident of
mount order.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
