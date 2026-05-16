# MCP Server Template (TypeScript)

Welcome to the MCP Server template! A starter for building [Model Context Protocol](https://modelcontextprotocol.io/) servers with TypeScript.

## Features

- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) for building MCP servers
- [Hono](https://hono.dev/) web framework for HTTP transport
- [Zod](https://zod.dev/) schema validation
- Ready for Cloudflare Workers with Wrangler
- Vitest for testing

## MCP Capabilities

This template includes example MCP implementations:

### Tools

- `greet` - Greets someone by name (returns structured JSON)
- `ungreet` - Says goodbye by name (returns text content)

### Prompts

- `nplus1` - Generates tests for N+1 query issues in Java Spring applications

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

If you are using this repository as a template for a new project, refer to the "Using This Template In A New Project" section in [AGENTS.md](./AGENTS.md) for the required replacement checklist.

## MCP Endpoint

The MCP server is available at `/mcp`. Use an MCP client (like Claude Desktop or Claude Code) to connect and use the tools and prompts.

## License

Apache-2.0, see [LICENSE](./LICENSE) for details.
