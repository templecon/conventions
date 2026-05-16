---
name: mcp-server
description: "MCP server conventions (tools, schemas, resources, annotations). Use when: registering MCP tools or resources, defining Zod schemas, configuring tool annotations, or structuring MCP server code."
---

# MCP Server Conventions

These rules apply to the runtime MCP server code in `src/index.ts` and `src/route.ts`.

## Architecture

- Keep HTTP transport concerns in the entrypoint.
- Keep MCP registration in the setup module.
- Use `registerTool` / `registerResource` + `ResourceTemplate` instead of custom capability wiring.
- Keep setup idempotent so the module can be initialized more than once without duplicating registration.
- The `/mcp` endpoint exposes conventions as **resources** (general-purpose clients).
- The `/with-tool/mcp` endpoint exposes the **`read-convention` tool** only (for VS Code Copilot).

## Tools

- One tool, one job.
- Use stable tool names and UI titles.
- Always provide `title` and `description`.
- Add `annotations` when the tool meaningfully fits `readOnlyHint`, `idempotentHint`, `destructiveHint`, or `openWorldHint`.
- Use `inputSchema` for arguments and `outputSchema` when the output contract is stable.
- Return `structuredContent` for machine-readable output and `content` for human-facing fallback text.
- Prefer explicit side-effect behavior over hidden behavior.

### Annotation Guidance

- `readOnlyHint`: the tool does not mutate state.
- `idempotentHint`: repeating the same input should have the same effect.
- `destructiveHint`: the tool can delete, overwrite, or otherwise make irreversible changes.
- `openWorldHint`: the tool depends on external data or unknown remote state.
- `title`: short UI label shown to clients.

If a hint is not clearly true, leave it out.

## Schemas

- Use Zod for validation.
- Use `z.output<typeof schema>` for handler parameters.
- Use `z.output<typeof schema>` for the normalized or structured result type.
- Prefer `satisfies` in handlers when returning structured content.
- Put JSDoc on schema fields when the field needs explanation.

## Resources

- Keep resources single-purpose.
- Use `ResourceTemplate` with a descriptive URI scheme (e.g. `convention://{name}`).
- Provide a `list` callback so clients can discover available resources.
- Provide an async `read` callback returning `{ contents: [{ uri, mimeType, text }] }`.
- Keep resource descriptions short and specific.

## Layout

- The HTTP entry file should only wire middleware, transport, and top-level routes.
- The setup module should only register MCP tools, resources, and optionally prompts.
- Use options like `{ includeTool, includeResources }` to control what each endpoint exposes.
- Keep the singleton guard if the setup function may be called more than once.
- Do not spread registration logic across random utility files.

## Example Pattern

```ts
const inputSchema = z.object({
    /**
     * The person's display name.
     */
    name: z.string().default("Claude-chan"),
});

const outputSchema = z.object({
    greeting: z.string(),
});

server.registerTool(
    "greet",
    {
        title: "Greet",
        description: "Greets a person by name.",
        inputSchema,
        outputSchema,
        annotations: {
            readOnlyHint: true,
            idempotentHint: true,
            destructiveHint: false,
            openWorldHint: false,
            title: "Greet someone",
        },
    },
    async (input) => {
        input satisfies z.input<typeof inputSchema>;

        return {
            content: [],
            isError: false,
            structuredContent: {
                greeting: `Hello, ${input.name}!`,
            } satisfies z.output<typeof outputSchema>,
        };
    }
);
```

## Tests

- Cover valid, invalid, and boundary inputs.
- Verify defaults and output shape.
- Check annotations and side-effect behavior.
- Keep prompt snapshots and tool expectations aligned with the schema.
