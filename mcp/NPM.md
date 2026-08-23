# @dravensoft/arena-mcp

Arena over the Model Context Protocol. It serves the router, the references and every component
document of Arena to an agent in your editor, as MCP resources and as tools.

**It carries no copy of the language.** The corpus ships inside the framework package your project
already depends on, so this server reads that one and cannot disagree with the components beside
it. Install Arena first; without it there is nothing to serve, and the server says so rather than
starting empty.

## Install

```bash
npm i -D @dravensoft/arena-mcp        # or: bun add -d / pnpm add -D
```

`@dravensoft/arena-react` or `@dravensoft/arena-angular` has to be installed in the project too.
The server resolves whichever it finds above the working directory, and the layer it serves is the
one you installed.

## Point your editor at it

The configuration file differs per editor and the command does not.

```json
{
  "mcpServers": {
    "arena": { "command": "npx", "args": ["-y", "@dravensoft/arena-mcp"] }
  }
}
```

`--payload <dir>` names a payload explicitly, for a tree where `node_modules` is not checked out
or where the package sits somewhere the walk does not reach. It takes the `agent/` directory of an
installed Arena package, or a directory holding one.

## What it serves

| Tool | What it answers |
|---|---|
| `arena_start` | What is installed, and the one document to read before writing a screen. Call it first |
| `arena_list` | Every Arena document this project carries, as addressable URIs |
| `arena_find` | Which documents answer a question, by words in their name and their opening |
| `arena_read` | One document by its URI, for a client that calls tools and does not read resources |

Every one of those documents is also offered as an MCP resource, under an `arena://` URI: the
router, one per reference, the component indexes, one per component, the style roles and the
support record. **Read the router first.** It carries the rules of the language and routes every
other question, and the route past it is one component at a time rather than a corpus read whole.

## What it is not

**It is not a second way to install Arena.** The components, the stylesheets and the command that
turns your palette into CSS are in the framework package, and its own page is where those are
documented.

**It is not the only way to reach the language from an editor.** `arena-to-prod --skill` writes a
discovery record into `.agents/skills/arena/`, which VS Code, Copilot, Cursor, Codex, Gemini CLI
and Zed all scan, and it needs no server and no configuration. Take this one when you would rather
configure a server once than write a file per project, or when your client speaks MCP and does not
scan for skills.
