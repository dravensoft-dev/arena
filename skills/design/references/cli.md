# The arena command

What does `arena` write? Which flags does each command take? What does `--strict` hold, and what does an exit code mean? How do I wire it into a React or an Angular build? Read this once per project, when you wire the build.

The command ships inside both component packages, so installing Arena installs it. The command reads `arena.config.json`, your `src` tree and every style plugin directory the config declares. [`config.md`](./config.md) covers the file. [`install.md`](./install.md) covers importing what `arena build` writes.

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

**`arena.generated.css`** holds your palettes and your `@font-face` rules. The sheet leads with an `@import` of the package stylesheet; `--no-import` leaves that out, for a project that imports `@dravensoft/arena-react/arena.css` or `@dravensoft/arena-angular/arena.css` itself. Every colour comes from this file: the package declares no `--color-*`, only the rules that read them. The font roles are the half that overrides: the package declares them, and your later file wins at equal specificity in `:root`.

**`icons.generated.css`** holds the class rules, in `woff2` alone, for every glyph your sources draw and every glyph Arena's components draw for you. Your sources are read as text; Arena's half is the package's `icons.json`, computed from its renders. Every glyph you name also reaches the filled weight, since an active navigation item draws filled. The `@font-face` points at the whole font Phosphor ships; subset it to this glyph list if the bytes matter.

**`plugin.generated.css`** is written when a style plugin carries a `plugin.css`. The sheet holds that CSS in the reserved cascade layer and leads with the layer order itself, so where a bundler places it cannot change what wins.

A sheet is written only when its bytes change, so a bundler watching an untouched sheet does not rebuild. A sheet this config no longer produces is removed. A build prints how many reports it saw and exits 0 on them; `arena check` names them. Keep every generated file out of version control.

**`--watch`** builds once, then rebuilds after each burst of changes to the config, a source under `--src` or a style plugin directory. A path that is not there yet is awaited. A build that cannot run prints why, and the next change builds again. Ctrl-C stops the watch and exits 0. The watch never reacts to the sheets it writes, or to anything under `node_modules`, `dist`, `.git`, `.angular` or `coverage`. Name your source trees with `--src`: a `--src .` holding another build directory rebuilds on its churn.

## What does `--strict` hold?

A report never changes the exit until `--strict` holds it. Bare, `--strict` holds every kind that command reports; `--strict=contrast,glyph` holds the kinds you name. A kind with rules can also be held one rule at a time, as `<kind>:<rule>`. `--strict=audit:emoji,restated` holds the `emoji` rule of `audit` and every `restated` report, and only reports the other audit rules. A kind another command holds, a rule its kind does not have, a rule on a kind without rules, or a `--strict=` naming none, is refused.

| command | kinds |
| --- | --- |
| `arena check --strict` | `components`, `contrast`, `ramp`, `weight`, `glyph`, `markers` |
| `arena audit --strict` | `audit`, `restated` |
| `arena doctor --strict` | `environment` |

| kind | rules `--strict=<kind>:<rule>` names |
| --- | --- |
| `audit` | `compat-alias`, `danger-fill`, `emoji`, `icon-element`, `one-primary`, `outline-gap`, `own-class`, `raw-value`, `router-link`, `stale-allowance` |

**`arena init` writes the names that exist when it runs.** The `arena:audit` script it writes names every audit rule and `restated`. A rule a later package adds is reported there, and changes no exit until you add its name. A bare `--strict`, or `--strict=audit`, holds every rule, later ones included. An audit finding ends in its rule, such as `(raw-value)`. The one without a tag is `stale-allowance`: an `arena-audit allow` marker on a line with nothing left to exempt.

**Name the kinds when one of them is a decision you already made.** A brand under 4.5:1 can be deliberate, and one switch would make it the price of holding the rest in CI. `weight` says a role asks for a weight the face you loaded does not carry. `glyph` is a name Phosphor does not draw. `markers` is an Angular projection marker, such as `[footer]`, written in a template that does not import its directive. That marker renders nothing, and neither the build nor `ngc --strictTemplates` reports it; [`exports.md`](./exports.md) lists every marker. `restated` is a plugin rule restating the value its part's slot already paints. `environment` says Arena's own icons went uncounted, outside an Arena package or without its `icons.json`. In `arena doctor` it also says Node misses `engines.node`, or that range is one it cannot compare. `wash` is reported and never held: a token on a wash of its own colour clears AA at no percentage, and a gate nobody can fix is not a gate.

## What does an exit code mean?

| code | meaning |
| --- | --- |
| `0` | The command did its job. Reports may print. |
| `1` | A project problem: a config that parses and is invalid, a `stylesheet` name the package does not ship, or a report `--strict` holds. `arena doctor` exits 1 on anything that stops a build, and on a sheet that is missing, stale or no longer produced. |
| `2` | The command cannot run: an unknown, refused or repeated flag, a config it cannot read as JSON, a missing `--src` or Phosphor not installed. So is a file it cannot write or delete, or `arena init` with no `package.json`. |

## What does the audit read?

The rules it reports, and the ones nothing reads, are the router's: [the rules section of `SKILL.md`](../SKILL.md). The audit reads TypeScript, stylesheets and, in Angular, templates. **Every rule is read in a scope.** Inside a directory `stylePlugins` declares, a part hook is what you are meant to select and a gradient is yours to paint, so neither is reported there. A compiled `arena-` class and a raw value are reported in both scopes. A comment is prose and declares nothing. Exempt a line the audit is wrong about with an `arena-audit allow` comment on that line; the audit reports the allowance once nothing on the line needs it. Nothing else checks your sources against the rules. With no `arena.config.json`, audit and usage read no style plugin; a named `--config` that is not there exits 2.

## How do I wire it into a React build?

Run `arena init` once. In a project on `@dravensoft/arena-react` it adds these scripts, and the config when it is absent:

```json
{
  "scripts": {
    "prebuild": "arena build",
    "predev": "arena build",
    "arena:check": "arena check --strict=components,glyph,markers",
    "arena:audit": "arena audit --strict=audit:compat-alias,audit:danger-fill,audit:emoji,audit:icon-element,audit:one-primary,audit:outline-gap,audit:own-class,audit:raw-value,audit:router-link,audit:stale-allowance,restated"
  }
}
```

A `--config` other than the default is carried into every script it writes. `arena:check` holds the kinds a project decides nothing about and leaves `contrast` and `ramp` to the brand's owner. Run both in the job that runs your tests.

## How do I wire it into an Angular build?

The same, on `@dravensoft/arena-angular`, with `prestart` in place of `predev`.

```json
{
  "scripts": {
    "prebuild": "arena build",
    "prestart": "arena build",
    "arena:check": "arena check --strict=components,glyph,markers",
    "arena:audit": "arena audit --strict=audit:compat-alias,audit:danger-fill,audit:emoji,audit:icon-element,audit:one-primary,audit:outline-gap,audit:own-class,audit:raw-value,audit:router-link,audit:stale-allowance,restated"
  }
}
```

## What if a script is already there?

`arena init` never overwrites. A script already reading what it would write is left alone; another `arena:check` or `arena:audit` is kept and named. A `prebuild`, `predev` or `prestart` that does not run `arena build` is left too. Init prints the line to write instead, `make it: arena build && <yours>` with the same `--config`, and exits 0.

A `pre` script runs only where the package manager runs one. npm 11.19, pnpm 11.22 under its default configuration and bun 1.4 were each observed running a project's `prebuild` ahead of its `build`. Under a manager not observed here, write the command into the script itself, as `"build": "arena build && vite build"`.

## How do I run it once?

From the project:

```bash
npx --no-install arena doctor     # or: pnpm exec arena doctor
```

The registry holds a different package named `arena`, so a runner that may download one is told not to. [`stack.md`](./stack.md) says which runners reach the command, with the evidence for each.
