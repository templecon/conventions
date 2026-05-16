# MCP Server Conventions

These rules apply to the runtime MCP server code in `src/index.ts` and `src/route.ts`.

## Architecture

- Keep HTTP transport concerns in the entrypoint.
- Keep MCP registration in the setup module.
- Use `registerTool` and `registerPrompt` instead of custom capability wiring.
- Keep setup idempotent so the module can be initialized more than once without duplicating registration.

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

## Prompts

- Keep prompts single-purpose.
- Store prompt bodies in `.md` files and import them with `?raw`.
- Return the message shape the SDK expects.
- Keep prompt titles and descriptions short and specific.

## Layout

- The HTTP entry file should only wire middleware, transport, and top-level routes.
- The setup module should only register MCP tools and prompts.
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
