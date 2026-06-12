# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.
All agents, such as Claude Code, should keep `**/AGENTS.md` in mind.

## Project Type

This is a **Conventions MCP Server** — a production [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes project coding conventions as MCP resources and tools. It provides:

- **MCP Resources** under the `skill://` URI scheme ([SEP-2640](https://github.com/modelcontextprotocol/experimental-ext-skills) Skills Extension)
- **MCP Tool** (`read-convention`) for convention search and retrieval
- **Agent Skills** HTTP well-known discovery endpoints (`/.well-known/agent-skills/`)
- Hono web framework for Streamable HTTP transport
- Zod validation for MCP tool schemas
- Vitest with Cloudflare worker pool for testing

## Development Commands

```bash
# Start development server (wrangler)
pnpm dev

# Build for production (Cloudflare Workers)
pnpm build

# Format code
pnpm format

# Lint code
pnpm lint

# Run tests
pnpm test
```

## Serving Methods

### MCP Endpoints

- `https://conventions.aieuroka.workers.dev/mcp` — general-purpose MCP with `skill://` resources (for most clients, check [implementations](#sep-2640-skills-extension))
- `https://conventions.aieuroka.workers.dev/with-tool/mcp` — `read-convention` tool only (for GitHub Copilot, which doesn't support resource retrieval)
- Streamable HTTP, without authentication

#### SEP-2640 Skills Extension

This server implements the [SEP-2640](https://github.com/modelcontextprotocol/experimental-ext-skills) experimental extension for serving skills over MCP:

- Conventions are served as MCP resources under `skill://{name}/SKILL.md`
- A discovery index is available at `skill://index.json` (MCP resource)
- The server declares `io.modelcontextprotocol/skills` in its capabilities
- The extension uses the existing `resources/read` primitive — no new protocol methods

### HTTP Agent Skills Discovery

In addition to MCP resources, the server implements [Agent Skills Discovery via Well-Known URIs](https://github.com/cloudflare/agent-skills-discovery-rfc) RFC and serves the Agent Skills well-known URI endpoints:

- `/.well-known/agent-skills/index.json` — RFC v0.2.0 discovery index with SHA-256 digests
- `/.well-known/agent-skills/{name}/SKILL.md` — raw skill content including YAML frontmatter

## TypeScript Configuration

- Path alias: `@/*` maps to `src/*` (configured in `tsconfig.base.json`)

## Package Manager

This project uses pnpm.

## Cloudflare Workers

This project is deployed on Cloudflare Workers using `wrangler`.
Configuration is in `wrangler.jsonc`.
