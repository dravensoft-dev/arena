A hierarchy read as one widget: a file tree, an outline, a category picker. The tree has one tab stop, four arrows and type-ahead. The component binds the `tree` pattern.

```tsx
const [expanded, setExpanded] = useState<ArenaTreeExpansion>({ ids: ['project'] });
const [selection, setSelection] = useState<ArenaTreeSelection>({ ids: [] });

<ArenaTreeView
  label="Project files"
  nodes={[
    { id: 'project', label: 'Project', icon: 'ph-bold ph-folder' },
    { id: 'src', label: 'src', icon: 'ph-bold ph-folder', parent: 'project' },
    { id: 'notes', label: 'notes.txt', icon: 'ph-bold ph-file-text', parent: 'project' },
    { id: 'main', label: 'main.ts', icon: 'ph-bold ph-file-code', parent: 'src' },
  ]}
  expanded={expanded}
  onExpandedChange={setExpanded}
  selection={selection}
  onSelectionChange={setSelection}
  onActivate={(id) => openFile(id)}
/>
```

<!-- @api GENERATED from contracts/api/components/ArenaTreeView.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names the tree for assistive technology. Required and guarded at runtime: nothing can derive what the tree is of, and two trees on one page must not announce alike. Say what the nodes are, never "ArenaTreeView". |
| `nodes*` | array | `readonly ArenaTreeNode[]` |  | The whole tree, flat. Each node names its parent, and sibling order is array order. |
| `expanded` | object | `ArenaTreeExpansion` |  | Which branches are open. Controlled: ArenaTreeView draws the caret and `aria-expanded`, and the consumer holds the open set and writes it back from `onExpandedChange`. A tree with no handler does not open. Absent, every branch is closed. |
| `onExpandedChange` | event | `ArenaTreeExpansion` |  | A branch was opened or closed by the keyboard or the pointer, carrying the whole new open set. Write it back to `expanded` in the handler. The tree draws only the set it is given, and a tree with no handler never opens. |
| `selection` | object | `ArenaTreeSelection` |  | Which nodes are selected. Controlled: the consumer holds the set and writes it back from `onSelectionChange`. Absent, no item carries `aria-selected`, and the tree reports `onActivate` only, as a navigation tree does. |
| `onSelectionChange` | event | `ArenaTreeSelection` |  | The selection changed, carrying the whole new set. The event fires only when the set changes, and never when `selection` is absent. Write it back to `selection` in the handler. |
| `multiple` | primitive | `boolean` | `false` | Whether more than one node can be selected. With it a press on a selected node unselects it, and the root carries `aria-multiselectable`. Without it a press replaces the selection. |
| `onActivate` | event | `string` |  | A node was activated by Enter or by a press on its row, carrying its `id`. A disabled node is never activated. The caret's press opens or closes a branch and does not activate. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys**, from [`tree`](../../../../../contracts/behaviour/tree.json):
- `ArrowDown`: moves focus to the next visible node.
- `ArrowUp`: moves focus to the previous visible node.
- `ArrowRight`: opens a closed parent; on an open parent moves focus to its first child; on a leaf does nothing.
- `ArrowLeft`: closes an open parent; otherwise moves focus to the parent of the node.
- `Home`: moves focus to the first visible node.
- `End`: moves focus to the last visible node.
- `Enter`: activates the focused node.
- `Space`: selects the focused node, and toggles it when more than one node can be selected.
- `TypeAhead`: typing a character moves focus to the next visible node whose name starts with that character; typing several characters in rapid succession matches on the accumulated string.
<!-- @keys end -->

`nodes` is **one flat array**, and each node names its `parent` by id. A node with no `parent` is a root. Sibling order is array order, so the array you hold is the order the tree draws.

## You own the open set

**ArenaTreeView never opens a branch on its own.** The tree draws the `expanded` set you pass, and reports the next set through `onExpandedChange`. Write that set back in the handler, as `onExpandedChange={setExpanded}` does above.

**A tree with no handler does not open.** The caret and ArrowRight report a new set, and the tree keeps drawing the old one. No error is drawn, so a tree that never opens is the sign of a missing handler.

A branch whose children are not loaded yet carries `expandable`. The tree draws its caret, and `onExpandedChange` tells you to fetch them.

```tsx
onExpandedChange={(next) => {
  setExpanded(next);
  next.ids.filter((id) => !loaded.has(id)).forEach(loadChildren);
}}
```

## You own the selection

`selection` works the same way. Pass the set, and write back what `onSelectionChange` carries. Without `selection`, no item carries `aria-selected`, and the tree reports `onActivate` only. A navigation tree takes that shape.

With `multiple`, a press on a node adds the node to the set or takes the node out. Without `multiple`, a press replaces the set with that one node. `onSelectionChange` fires only when the set changes.

## Pointer and keyboard

A press on the caret opens or closes the branch, and selects nothing. A press anywhere else on the row selects the node and then reports `onActivate`, as Enter does. Space selects without activating.

| Key | What happens |
|---|---|
| ArrowDown, ArrowUp | The next or previous visible node. Focus stops at either end. |
| ArrowRight | Opens a closed branch. On an open branch, moves to the first child. On a leaf, nothing happens. |
| ArrowLeft | Closes an open branch. Otherwise moves to the parent. On a root, nothing happens. |
| Home, End | The first and last visible node. |
| Enter | Selects the node and reports `onActivate`. |
| Space | Selects the node, or toggles the node with `multiple`. |
| A printable character | The next visible node whose label starts with the typed prefix. Characters typed within `--delay-typeahead` add up to one prefix. |

A key held with Control, Meta or Alt goes to the page untouched.

A `disabled` node stays focusable, so a keyboard user still finds it. The node is never selected or activated. The caret of a disabled node still opens it, because the children may be enabled.

**The DOM is flat.** One `role="tree"` element holds the visible items in order. Each item carries `aria-level`, `aria-setsize` and `aria-posinset`. The three attributes carry the hierarchy, since the DOM is flat.

## Do / Don't

- **Do** give every node a unique, non-blank `id` and a non-blank `label`. A blank one throws, and a duplicate warns once and drops the later node.
- **Do** name the tree with `label`. Two trees on one page must not announce alike.
- **Don't** nest the data. A child names its parent, and the component reads no nested children.
- **Don't** put links or buttons in a node. A node is an icon and a label, and a row that needs actions is a table.
- **Don't** expect the tree to navigate. Route from `onActivate`.

## Verifying the tree by hand

happy-dom has no layout and no native focus navigation, so six checks stay with you. Serve the tree with `bun run demos`, and open this component's demo page.

1. Tab reaches the tree once, and one more Tab leaves it. The focused node is the one with the ring.
2. ArrowDown, ArrowUp, ArrowRight and ArrowLeft walk as the table says. A screen reader announces level, position and state, such as "level 2, 3 of 5, collapsed".
3. Type two characters quickly, and the prefix lands on the node that starts with both. Type them slowly, and each one starts a new search.
4. Level 3 sits two `pad-row-indent` steps in from level 1, at base, under `.arena-comfortable` and under `.arena-compact`.
5. The demo page draws five rows, so it cannot show this. Bind `windowed` on a tree of a few thousand nodes inside a container of bounded height. The tree scrolls, and a node that takes focus scrolls into view.
6. In the `complete` scope, the selected row and the focus ring read as two different things.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
