# plugin-style-store/

**One authored copy of each style plugin, and nothing copies one anywhere.** The sheets the site
loads, the artefact each package assembles and the table a consumer's build resolves against are
all emitted from here, so a value that moves in this directory moves everywhere or fails a gate
that says it did not. That is why the store is a directory of the repository rather than a fixture
beside a gate or a template a command copies into a project: a template is a copy the moment it is
used, and a copy is a second answer to a question the kernel asks once.

A plugin is a directory holding `plugin.tokens.json`, which answers roles, and optionally
`plugin.css`, which is CSS of its own written against the part hooks and wrapped in the reserved
layer by the build.

## The two that live here

**`default`** is the plugin both packages assemble a sheet from, so installing and rendering needs
no configuration. It answers every role the kernel declares, because the first plugin in a build's
list emits on `:root` and a custom property with no value is invalid at computed-value time: the
declaration reading it is dropped and the property disappears, so an unanswered role is a missing
border rather than a plainer appearance.

**`complete`** is assembled by no package. It answers every role differently and paints through
every part hook, so a gate can ask whether the surface the kernel advertises is the surface it
exposes. It is not coherent as a design and does not try to be: a role nothing can reach is a role
that does not exist, and `complete` is the witness that says otherwise.

## What a plugin may answer with

A role takes a scale alias, or a literal where the scale has nothing it wants. **A colour role
takes a `{color.*}` alias and never a literal**: the palette is the consumer's, and what a plugin
may say is WHICH of their colours a surface takes. It is mechanical as well as doctrinal, because
the emitter turns a bare colour alias into a `var()` it restates under every theme, and anything
else resolves to one theme's hex and inherits it into the other.
