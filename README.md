# Conventions MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes project coding conventions as MCP resources and tools. Built with [Hono](https://hono.dev/), [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk), and [Zod](https://zod.dev/), deployed on Cloudflare Workers.

## Features

- **MCP Resources** (`skill://` scheme per [SEP-2640](https://github.com/modelcontextprotocol/experimental-ext-skills)) — conventions as read-only markdown resources with `skill://{name}/SKILL.md` URIs
- **MCP Tool** (`read-convention`) — search and read conventions by name, designed for Copilot-style clients that prefer tools over resources
- **Agent Skills Discovery** ([RFC v0.2.0](https://agentskills.io/)) — HTTP well-known endpoint at `/.well-known/agent-skills/`
- **Streamable HTTP** transport via `@hono/mcp`
- **Cloudflare Workers** deployment with Wrangler

## Available Conventions

| Name                      | Description                                              |
| ------------------------- | -------------------------------------------------------- |
| `hono-conventions`        | Hono routing, type inference, and middleware conventions |
| `hono-cloudflare-workers` | Hono + Cloudflare Workers platform patterns              |
| `mcp-server`              | MCP tool/resource registration, Zod schemas, annotations |
| `svelte`                  | Svelte 5 conventions for components and templates        |
| `tests`                   | Vitest test patterns and best practices                  |
| `typescript`              | TypeScript type safety, JSDoc, and import conventions    |
| `typescript-schema`       | Zod validation schema patterns                           |

## Getting Started

```sh
# Install dependencies
pnpm install

# Run the development server
pnpm dev

# Format code
pnpm format

# Lint code
pnpm lint

# Build the project
pnpm build

# Run tests
pnpm test
```

## MCP Endpoints

Two endpoints are available for different client types:

| Endpoint              | Transport       | Purpose                                                           |
| --------------------- | --------------- | ----------------------------------------------------------------- |
| `POST /mcp`           | Streamable HTTP | General-purpose MCP — exposes conventions as `skill://` resources |
| `POST /with-tool/mcp` | Streamable HTTP | Copilot-optimized — exposes the `read-convention` tool only       |

### Resources (`/mcp` only)

Each convention is available as an MCP resource under the `skill://` URI scheme (per SEP-2640):

```
skill://{name}/SKILL.md
```

A discovery index is available at:

```
skill://index.json
```

### Tool (`/with-tool/mcp` only)

The `read-convention` tool lists available conventions or returns full content of a specific convention by name. Supports optional `query` parameter for filtering.

### Agent Skills (HTTP)

The server also serves the [Agent Skills](https://agentskills.io/) well-known discovery endpoints over HTTP:

- `/.well-known/agent-skills/index.json` — RFC v0.2.0 discovery index with SHA-256 digests
- `/.well-known/agent-skills/{name}/SKILL.md` — raw skill content including frontmatter

## SEP-2640 Skills Extension

This server implements the [SEP-2640](https://github.com/modelcontextprotocol/experimental-ext-skills) Skills Extension draft:

- ✅ `skill://` resource URI scheme for all conventions
- ✅ `skill://index.json` discovery index resource
- ✅ `io.modelcontextprotocol/skills` capability declaration in initialize response
- ✅ Uses existing `resources/read` — no new protocol methods

## Deployment

```sh
pnpm build
pnpm deploy
```

## License

Apache-2.0, see [LICENSE](./LICENSE) for details.
