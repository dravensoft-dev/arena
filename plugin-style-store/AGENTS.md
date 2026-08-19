# plugin-style-store/

**One authored copy of each of Arena's own style plugins, and nothing copies one anywhere.** The
sheets the site loads, the artefact each package assembles and the table a consumer's build
resolves against are all emitted from here, so a value that moves in this directory moves
everywhere or fails a gate that says it did not. That is why the store is a directory of the
repository rather than a fixture beside a gate or a template a command copies into a project: a
template is a copy the moment it is used, and a copy is a second answer to a question the kernel
asks once.

**That claim is about the answers Arena gives, and [`catalogue/`](./catalogue/AGENTS.md) gives
none.** An entry there is a starting point measured on a real product, published so a project with
no appearance of its own can take one and edit it in its own tree, and being copied is its whole
purpose rather than a defect. It costs the claim above nothing, because no entry is compiled: none
has a row in `FILES` in `scripts/generate/arena/generate-tokens.ts`, so no sheet is emitted, no
class exists, and nothing in this repository renders one. What this repository renders is the two
below; what it publishes for somebody else to run is the catalogue.

A plugin is a directory holding two files. [`default/plugin.tokens.json`](./default/plugin.tokens.json)
answers roles. `plugin.css` beside it is CSS of the plugin's own, written against the
`data-arena-part` hook every slot carries, and the build wraps it in the reserved cascade layer:
its author never spells `@layer arena-plugin`, because a layer somebody types by hand is one they
can get wrong in a way nothing reports. The layer is declared after `utilities`, where every
compiled component rule sits at one class of specificity, so a plugin rule wins without an
`!important` anywhere. Unlayered application CSS still beats it, which is the right order and is
why the audit keeps reporting an application that reaches in.

## The two Arena renders

**`default`** is the plugin both packages assemble a sheet from, so installing and rendering needs
no configuration. It answers every role the kernel declares, because the first plugin in a build's
list emits on `:root` and a custom property with no value is invalid at computed-value time: the
declaration reading it is dropped and the property disappears, so an unanswered role is a missing
border rather than a plainer appearance.

**`complete`** is assembled by no package. It answers every role differently and paints through
every part hook, so `check:style-plugin-coverage` can ask whether the surface the kernel advertises
is the surface it exposes. It is not coherent as a design and does not try to be: a role nothing
can reach is a role that does not exist, and `complete` is the witness that says otherwise.

**Its stylesheet carries `.arena-complete` on every selector, and a root plugin's would not.** No
package assembles this one, so it is always a difference sitting over a root plugin, and the site
loads it beside `default`: an unscoped rule here would paint the page `default` is what looks like.
A consumer never writes that class, because the build nests a non-root plugin's stylesheet under it
and leaves a root plugin's alone.

## What a plugin may answer with

A role takes a scale alias, or a literal where the scale has nothing it wants. **A colour role
takes a `{color.*}` alias and never a literal**: the palette is the consumer's, and what a plugin
may say is WHICH of their colours a surface takes. It is mechanical as well as doctrinal, because
the emitter turns a bare colour alias into a `var()` it restates under every theme, and anything
else resolves to one theme's hex and inherits it into the other.
