# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.
All agents, such as Claude Code, should keep `**/AGENTS.md` in mind.

## Project Type

This is an **MCP Server template** for building Model Context Protocol servers with TypeScript. It provides:

- MCP SDK integration for tools and prompts
- Hono web framework for HTTP transport
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

## Coding Standards

See `docs/rules/` for TypeScript, testing, and tooling guidelines.

## TypeScript Configuration

- Path alias: `@/*` maps to `src/*` (configured in `tsconfig.base.json`)

## Package Manager

This project uses pnpm.

## Cloudflare Workers

This template uses `wrangler` for Cloudflare Workers development and deployment.
Configuration is in `wrangler.jsonc`.

## Using This Template In A New Project

When this repository is copied or renamed for a real project, update the template-specific identifiers before shipping:

- `package.json`
    - Change `name` to the new package name.
    - Update `repository.url` if the project lives in a different repo.
    - Adjust `author` and any other publishing metadata if needed.
- `wrangler.jsonc`
    - Change the top-level `name`.
    - Set `env.prod.name` to the production Worker name if you use that environment.
    - Review `compatibility_date` if the template should target a different deploy date.
- `src/route.ts`
    - Replace the MCP server display name currently set to `Example MCP Server`.
    - Update any user-facing tool, prompt, or description text that still says `Example`.
- `src/utils/cors.ts`
    - Review CORS settings to ensure they fit the new project's needs. The template allows as much as possible.
- `scripts/inspect.ts`
    - Replace the `remote` placeholder endpoint with the real MCP endpoint for the new project.
    - Update the default tool name and args if the template's example tool changes.
- Repo text
    - Search for leftover template strings such as `template-mcp-ts`, `template`, and `Example MCP Server`.
    - Update README or docs references that still point at the template repo or placeholder project name.

Keep the runtime behavior the same unless the new project needs different names or deployment settings.
