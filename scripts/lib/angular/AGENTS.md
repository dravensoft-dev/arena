# scripts/lib/angular/

What more than one script needs in order to write a template for the Angular layer.

| module | why it exists |
| --- | --- |
| `emit-root.ts` | Where `ngc` puts this layer's output, derived from the tsconfig rather than typed into each build script. A source lands at `outDir` plus its path relative to `rootDir`, so the tree a script walks is `outDir` plus the *layer root's* path relative to `rootDir`: `build/test` under today's `rootDir: "."`, and `build/test/angular` under the `".."` that preceded the layer becoming self-contained. When that token moved, three scripts still held the old depth, pruned every fresh emit as an orphan and reported the sources as never compiled, and `bun test` was pointed at a directory that no longer existed, which it reports as a clean run of nothing. |
| `playground-angular.ts` | Emits this layer's demo page and demo entry from the layer-neutral model in `../arena/playground-model.ts`. A literal inside a fixture node becomes a typed class field rather than template text, because inlining it would mean escaping both the template's own quotes and the surrounding backtick's `${`. A named slot is wrapped in `@if`, because a host querying `contentChild` counts an empty marked element as filled, so blanking the text would render a header here and none in the other layer. A marker directive is read out of the layer's own source rather than listed in the emitter, so a new one joins with no edit, and it is imported only where a slot it covers is actually projected, since the compiler refuses an unused one. A string literal on a fixture node becomes a **static attribute** rather than a binding: `ArenaSideNavCollapsible` reads its projected items' required `id()` from a constructor effect, which runs before a property binding inside an `@if` is applied, and the page then throws NG0950 and renders nothing. A non-string stays a typed field, since an attribute would hand the input a string. |

Every `X.test.ts` beside a module covers that module.

The page itself is **not** emitted here: `../arena/playground-page.ts` builds it for every
layer at once, because the two pages differ in exactly two lines, what mounts the app and what
the app is loaded from, and a page authored per layer would drift in its stylesheet list or its
toggle markup. A difference in the frame reads as a difference in the component, which is the
one thing these pages must never do.
