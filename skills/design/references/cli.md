# The arena command

What does `arena` write? Which flags does each command take? What does `--strict` hold, and what does an exit code mean? How do I wire it into a React or an Angular build? Read this once per project, when you wire the build.

The command ships inside both component packages, so installing Arena installs it. The command reads `arena.config.json`, your `src` tree and every style plugin directory the config declares, wherever those sit. [`config.md`](./config.md) covers the file. [`install.md`](./install.md) covers importing what `arena build` writes.

## Which commands are there?

| command | what it does | writes | flags |
| --- | --- | --- | --- |
| `arena build` | Writes the theme, icon and plugin sheets from your config and sources. | the sheets | `--config`, `--src`, `-o`, `--out`, `--no-import`, `--watch` |
| `arena check` | Names what the sheets a build would write, and your sources, get wrong: contrast, ramp, weight, glyph, component and marker reports. | nothing | `--config`, `--src`, `--strict` |
| `arena audit` | Reads your sources and style plugins against the rules of the language. | nothing | `--config`, `--src`, `--strict` |
| `arena usage` | Names the components the package ships that your sources draw nowhere, and the parts your style plugins paint. A component Arena draws on your behalf counts as undrawn, because you never wrote it. | nothing | `--config`, `--src` |
| `arena init` | Copies the example config and wires the scripts below into `package.json`. | the config and `package.json`, only what is absent | `--config` |
| `arena doctor` | Says whether the project is set up: package, Node against `engines.node`, the config, and whether every sheet on disk is what a build would write. | nothing | `--config`, `--src`, `-o`, `--out`, `--no-import`, `--strict` |
| `arena clean` | Deletes the sheets `arena build` writes, by name, inside `-o`. Clean never deletes another file or the directory. | removes the sheets | `-o`, `--out` |

`arena --help` and `arena help` list the commands; `arena help <command>` and `arena <command> --help` print one command's flags; `arena --version` names the package and its version. `--config` defaults to `arena.config.json`. `--src` defaults to `src`, takes a file or a directory, and repeats for more trees. `-o` defaults to `src`.

## What does `arena build` write?

**`arena.generated.css`** holds your palettes and your `@font-face` rules. The sheet leads with an `@import` of the package's own stylesheet; `--no-import` leaves that out, for a project that imports `@dravensoft/arena-react/arena.css` or `@dravensoft/arena-angular/arena.css` itself. Every colour comes from this file: the package declares no `--color-*` of its own, only the rules that read them. The font roles are the half that overrides: the package declares them, and your file comes later at equal specificity in `:root` and wins.

**`icons.generated.css`** holds the class rules, in `woff2` alone, for every glyph your sources draw and every glyph Arena's components draw for you. Your sources are read as text; Arena's half is the `icons.json` the package ships, computed from the renders themselves. Every glyph you name also reaches the filled weight, because a navigation item draws its active destination filled. The font binary is not cut down: the `@font-face` points at the weight Phosphor ships. The glyph list in this file is what to subset it to if the bytes matter.

**`plugin.generated.css`** is written when a style plugin carries a `plugin.css`. The sheet holds that CSS in the reserved cascade layer and leads with the layer order itself, so where a bundler places it cannot change what wins.

A sheet is written only when its bytes change, so a bundler watching an untouched sheet does not rebuild. A sheet this config no longer produces, such as `plugin.generated.css` once no plugin carries CSS, is removed. A build prints how many reports it saw and exits 0 on them; `arena check` names them. Keep every generated file out of version control.

**`--watch`** builds once, then rebuilds after each burst of changes to the config, a source under `--src` or a style plugin directory. A path that is not there yet is awaited. Ctrl-C stops the watch. The watch never reacts to the sheets it writes, or to anything under `node_modules`, `dist`, `.git`, `.angular` or `coverage`. A `--src .` over a tree holding another build directory rebuilds on that directory's churn; name your source trees with `--src` instead.

## What does `--strict` hold?

`check`, `audit` and `doctor` report and exit 0 until `--strict` holds a kind. Bare, `--strict` holds every kind that command reports; `--strict=contrast,glyph` holds the ones you name. A kind another command holds is refused by name.

| command | kinds |
| --- | --- |
| `arena check --strict` | `components`, `contrast`, `ramp`, `weight`, `glyph`, `markers` |
| `arena audit --strict` | `audit`, `restated` |
| `arena doctor --strict` | `environment` |

**Name the kinds when one of them is a decision you already made.** A brand under 4.5:1 is measured and deliberate, and one switch over every kind would make it the price of holding the rest in CI. `weight` says a role asks for a weight the face you loaded does not carry. `glyph` is a name Phosphor does not draw. `markers` is an Angular projection marker, such as `[footer]`, written in a template that does not import its directive. That marker renders nothing, and neither the build nor `ngc --strictTemplates` reports it; [`exports.md`](./exports.md) lists every marker. `restated` is a plugin rule restating the value its part's slot already paints. `environment` says the run is outside an Arena package, so Arena's own icons went uncounted. `wash` is reported and never held: a token on a wash of its own colour clears AA at no percentage, and a gate nobody can fix is not a gate.

## What does an exit code mean?

| code | meaning |
| --- | --- |
| `0` | The command did its job. Reports may have printed. |
| `1` | A project problem: a config that parses and is invalid, a `stylesheet` name the package does not ship, or a report `--strict` holds. `arena doctor` exits 1 on anything that stops a build, and on a sheet that is missing, stale or no longer produced. |
| `2` | The command cannot run: an unknown or refused flag, a config it cannot read as JSON, a missing `--src` or Phosphor not installed. So is a file it cannot write, or no `package.json` for `arena init`. |

## What does the audit read?

The rules it reports, and the ones nothing reads, are the router's: [the rules section of `SKILL.md`](../SKILL.md). The audit reads TypeScript, stylesheets and, in Angular, templates. **Every rule is read in a scope.** Inside a directory `stylePlugins` declares, a part hook is what you are meant to select and a gradient is yours to paint, so neither is reported there. A compiled `arena-` class and a raw value are reported in both scopes. A comment is prose and declares nothing. Exempt a line the audit is wrong about with an `arena-audit allow` comment on that line; the audit reports the allowance once nothing on the line needs it. Nothing reads your application, so this is the only automatic signal there is.

## How do I wire it into a React build?

Run `arena init` once. In a project on `@dravensoft/arena-react` it adds these scripts, and the config when it is absent:

```json
{
  "scripts": {
    "prebuild": "arena build",
    "predev": "arena build",
    "arena:check": "arena check --strict=components,glyph,markers",
    "arena:audit": "arena audit --strict"
  }
}
```

A `--config` other than the default is carried into every script it writes. `arena:check` holds the kinds a project decides nothing about and leaves `contrast` and `ramp` to the brand's owner. Run both scripts in the job that runs your tests.

## How do I wire it into an Angular build?

The same, on `@dravensoft/arena-angular`, with `prestart` in place of `predev`.

```json
{
  "scripts": {
    "prebuild": "arena build",
    "prestart": "arena build",
    "arena:check": "arena check --strict=components,glyph,markers",
    "arena:audit": "arena audit --strict"
  }
}
```

## What if a script is already there?

`arena init` never overwrites. A script already reading what it would write is left alone; another `arena:check` or `arena:audit` is kept and named. A `prebuild`, `predev` or `prestart` that is someone else's and does not run `arena build` is left too, and init prints the line to write instead, as `make it "arena build && <yours>"`, and exits 0.

A `pre` script runs only where the package manager runs one. npm 11.19, pnpm 11.22 under its default configuration and bun 1.4 were each observed running a project's `prebuild` ahead of its `build`. Under a manager not observed here, write the command into the script itself, as `"build": "arena build && vite build"`.

## How do I run it once?

From the project, through the installed bin:

```bash
npx --no-install arena doctor     # or: pnpm exec arena doctor
```

The registry holds a different package named `arena`, so a runner that may download one is told not to. [`stack.md`](./stack.md) says which runners reach the command, with the evidence for each.
