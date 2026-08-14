Arena command palette, the keyboard accelerator behind Cmd/Ctrl+K. Type to filter,
arrow to a command, Enter to run it, Escape to leave, or hover a row to select it.
`hint` is searched but not shown, so a command can be found by a word that is not in
its label. `open` and `commands` are both `input.required`; the host must always bind
both. Each command's `icon` is a Phosphor class name Arena draws, not projected content.
The host owns `open` and the shortcut that sets it, and decides whether running a
command also closes the palette. The search field is an ARIA 1.2 combobox
wired to the row list as its listbox popup, so a screen reader announces which row is
active as you arrow through it.

```html
<arena-command-palette [open]="paletteOpen()" [commands]="commands"
                       (close)="paletteOpen.set(false)"
                       (run)="paletteOpen.set(false); dispatch($event)" />
```

<!-- @api GENERATED from contracts/api/components/ArenaCommandPalette.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `open*` | primitive | `boolean` |  | Whether the palette is shown. Closed renders nothing. |
| `commands*` | array | `readonly ArenaCommand[]` |  | Every command the palette can find. Filtered by label and hint as the user types. |
| `placeholder` | primitive | `string` | `"Search for an action or project…"` | The search field's placeholder. |
| `maxResults` | primitive | `number` |  | How many matches the list shows at most. Absent, all of them. The ceiling applies AFTER the query has run over every command, which is what makes it different from the caller trimming `commands` before passing them: a trimmed list cannot match what was cut, and a capped one can, so the first rows are still the best the whole set has. It is the palette's rather than the domain's, because how many rows help before the list stops being an accelerator is a property of this control; a caller who caps their own collection has guessed at it once, for one collection, with no query in hand. It is not ranking: the order stays the order the caller passed, ungrouped first and then each group as it first appears. |
| `close` | event |  |  | The palette asked to be closed: Escape, the scrim, or a command having been run. |
| `run` | event | `ArenaCommand` |  | A command was activated, carrying which one. Emitted after close. For a command with `route` it fires for a primary click with no modifier and for Enter, both of which cancel the row's anchor first, so the two activations do the same thing and a host that routes here never navigates twice; a modified or middle click on such a row is the browser's, fires nothing and does not close the palette. |

<!-- @api end -->

**Do / Don't**
- Put every command's real shortcut in `shortcut`. The palette is where people learn
  the shortcuts that let them stop using the palette.
- Use `hint` for the synonyms people actually type: "logout" for "Sign out".
- Close the palette yourself in your `run` handler if that is what you want; the
  component does not assume it for you.
- Don't put destructive actions in the palette without a confirmation behind them. A
  palette entry is one Enter away from running.
- Don't make the palette the only way to reach something. It is an accelerator, not
  navigation.
- Don't express a condition as an attribute string. `open` carries the
  `booleanAttribute` transform, so a bare `open` and `[open]="true"` both
  mean true, and the one literal string `"false"` means false. Every *other* string is
  true, `"0"`, `"off"` and `"no"` all leave the palette open. Bind the expression
  (`[open]="paletteOpen()"`) rather than relying on the literal.

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
row's plain activation reports through `(run)`, so a host that navigates in its `(run)` handler
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

The palette is named after Cmd/Ctrl+K and binds nothing. A global key binding belongs to the
application: it has to know which other surface owns the key, whether a dialog is already up,
and whether the reader is typing in a field. A component that took the key would fight the
host for it and win by accident of load order. Three lines in the shell:

```ts
@HostListener('document:keydown', ['$event'])
onKey(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault();
    this.paletteOpen.set(true);
  }
}
```

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
