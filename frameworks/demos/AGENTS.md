# frameworks/demos/

**One fixture per component, layer-neutral, and the only thing about a playground page anyone
writes by hand.** Everything else on that page is derived: the knobs come from
`contracts/api/components/<Name>.json`, the controls and the URL codec come from
`scripts/lib/arena/playground-model.ts`, and the page and its entry are emitted into both
framework layers from the same model. The two layers are therefore equal by construction, and
this directory is where the one fact the contract cannot supply lives.

It sits at the `frameworks/` root rather than inside a layer for the same reason
`Components.json` does: it is a fact about the layers that belongs to none of them, and a copy
per layer is a copy that can disagree. It is not under `contracts/` because a fixture is not
normative: a seed is an example, and `check-contracts.ts` holds `contracts/api` to exactly
`components/` and `types/`.

**`PlaygroundCodec.ts` beside the fixtures is the second thing here, and it is code rather than
data.** What a knob holds, whether it is bound and how both round-trip through a query string
are authored once and emitted into every layer as `PlaygroundCodec.generated.ts` by
`bun run generate:playgrounds`. It is here for the same reason the fixtures are: two
hand-written copies of `decode()` that drift render the **same URL** differently in each layer,
which is the one failure this whole arrangement exists to prevent, and no gate would see it,
since each layer would compile and each suite would pass. Only a person holding two pages side
by side would notice. Edit the source, never a copy.

`check:playgrounds` reads every file here against its contract and fails on anything the
contract does not license. A fixture is type-checked rather than merely parsed, because a
component drawn from a wrong seed still draws: the page renders, it lies, and no other gate
notices.

## The schema

```jsonc
{
  "component": "ArenaCard",

  // Values the contract cannot invent. Every member that is required and carries no
  // default MUST appear. Any other inbound member MAY, and a member that appears is
  // the configuration the fixture CHOSE: it starts bound, and it outranks a contract
  // default. A member that does not appear starts unbound, holding its form's neutral.
  "seed": { "title": "checkout-api", "eyebrow": "Delivery" },

  // Vocabulary classes on the component under test, written as the class attribute of its
  // tag in both layers. Each is an option of a family the component answers, and a node holds
  // one option per family. The page shows them fixed: there is no knob. Optional.
  "class": "arena-fill",

  // A slot listed here starts filled; one omitted starts empty. Every required slot
  // appears. The value is a list of nodes.
  "slots": {
    "content": [{ "text": "Last published 2 h ago, build #4821." }],
    "action": [{ "component": "ArenaBadge", "members": { "tone": "success" },
                 "slots": { "content": [{ "text": "Live" }] } }]
  },

  // Write-back. Without it a controlled component is dead on the page: clicking a tab
  // logs an event and changes nothing, which reads as a broken component rather than
  // as a component whose state its consumer owns.
  "bind": { "sortChange": "sort", "pageChange": "page.index", "close": { "open": false } },

  // Only for a component that cannot render alone. A node tree holding "$subject"
  // exactly once, marking where the component under test is placed.
  "host": null,

  // Properties of the component's vocabulary the demo sets the way an adopter would: a map of
  // --arena-* names to string values, written as the style of the element the page already
  // wraps the component in (a tile of the kitchen sink, the stage of a playground), so no
  // element is added and the properties are inherited by everything drawn inside it. The page shows
  // them fixed, like `class`: it shows the class and the properties a fixture carries and offers no
  // control to change them. Optional.
  "vars": { "--arena-column-status-align": "right" },

  // One line under the page title. Optional.
  "note": "A surface. With interactive or href it becomes one activation target."
}
```

Those keys are the whole schema, and another fails the gate; a `vars` key that does not start
`--arena-` or holds anything but a string fails it too.

## A node

Three shapes, and the recursion is what lets one rule cover both slot content and a host:

| shape | what it is |
| --- | --- |
| `"$subject"` | where the component under test goes. Legal inside `host` and nowhere else, exactly once. |
| `{ "text": "…", "element": "span", "attrs": {} }` | literal content. `element` and `attrs` are optional; with neither, the text is projected bare. |
| `{ "component": "ArenaBadge", "members": {}, "class": "arena-fill", "slots": {} }` | a real Arena component, its members literal, an optional `class` of vocabulary options it answers, and its own slots recursive. |

A slot holding exactly one text node becomes an **editable** knob, so the page can change the
words. A slot holding anything else becomes a **presence** knob: the tree is fixed and only
whether it is projected can move. That is not a limitation to work around; a slot whose content
is a component is content the consumer draws, and the playground shows it rather than offering
to rewrite it.

## Binding an event back to a knob

| written as | means |
| --- | --- |
| `"change": "value"` | write the event's payload into the `value` knob. The payload's type and the knob's must agree. |
| `"pageChange": "page.index"` | write it into one field of an object knob. |
| `"close": { "open": false }` | patch one or more knobs with literals. Use this for an event carrying no payload. |
| `"next": { "index": { "$delta": 1 } }` | step a number knob. The only directive, and it is refused on anything but a number. |

**Bind is authored, never inferred.** A rule like "an event named `<x>Change` writes `<x>`" is
right most of the time and wrong exactly where a component is interesting: `ArenaSwitch` reports
through two events rather than one payload so a confirm flow can refuse the change, and
`ArenaSideNavCollapsible` owns its own expansion and only reports it.

## Adding one

A new component needs a fixture in the same commit, or `check:playgrounds` fails on the
contract that has none. Seed what is required, fill what is required, bind what is controlled,
and host it if it cannot stand alone. Then run `bun run generate:playgrounds` and open both
layers' pages side by side, which is the check no gate makes.
