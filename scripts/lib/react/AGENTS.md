# scripts/lib/react/

What more than one script needs in order to write JSX for the React layer.

| module | why it exists |
| --- | --- |
| `playground-react.ts` | Emits this layer's demo page and demo entry from the layer-neutral model in `../arena/playground-model.ts`. Every member is written out as its own attribute rather than spread, so the two layers' entries read as translations of each other: the other layer has no spread, and this one has no reason to diverge from it. A literal reaches JSX through `JSON.stringify` inside an expression container, which is one escaping rule for every form rather than one per type. A slot holding several nodes becomes a **keyed array** and never a fragment, because `ArenaTabs`, `ArenaTable` and `ArenaRadioGroup` read their direct children through `Children.toArray` and `cloneElement`, and a fragment hides them from that walk. |

Every `X.test.ts` beside a module covers that module.

The page itself is **not** emitted here: `../arena/playground-page.ts` builds it for every
layer at once, because the two pages differ in exactly two lines, what mounts the app and what
the app is loaded from, and a page authored per layer would drift in its stylesheet list or its
toggle markup. A difference in the frame reads as a difference in the component, which is the
one thing these pages must never do.
