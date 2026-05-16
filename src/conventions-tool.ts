import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { getSkills } from "@/prompt/registry";

const inputSchema = z.object({
    /**
     * Optional skill name to read full content of a specific convention.
     * When omitted, lists all available conventions with their descriptions.
     */
    name: z.string().optional(),
    /**
     * Optional search term to filter conventions by name or description.
     */
    query: z.string().optional(),
});

/**
 * Registers the `read-convention` tool on the MCP server.
 *
 * Returns the content of a specific convention by name, or lists/searches
 * available conventions. This tool is intended for Copilot to read the
 * project's coding conventions at runtime.
 */
export function registerConventionsTool(app: McpServer): void {
    app.registerTool(
        "read-convention",
        {
            title: "Read Convention",
            description:
                "Read project coding conventions by skill name, or search available conventions. " +
                "Use when you need to understand the project's coding standards, testing practices, " +
                "or tooling configuration.",
            inputSchema,
            annotations: {
                readOnlyHint: true,
                idempotentHint: true,
                title: "Read a project convention",
            },
        },
        async (input) => {
            const { name, query } = input satisfies z.input<typeof inputSchema>;

            const skills = getSkills();

            // Return a specific skill by name
            if (name) {
                const skill = skills.find((s) => s.name === name);
                if (!skill) {
                    return {
                        content: [
                            {
                                type: "text" as const,
                                text: `Convention "${name}" not found. Available: ${skills.map((s) => s.name).join(", ")}`,
                            },
                        ],
                        isError: true,
                    };
                }
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: `# ${skill.name}\n${skill.description}\n\n${skill.body}`,
                        },
                    ],
                };
            }

            // Filter by query if provided
            let filtered = skills;
            if (query) {
                const q = query.toLowerCase();
                filtered = skills.filter(
                    (s) =>
                        s.name.toLowerCase().includes(q) ||
                        s.description.toLowerCase().includes(q)
                );
            }

            const lines = filtered.map(
                (s, i) => `${i + 1}. **${s.name}** — ${s.description}`
            );
            const summary = `${filtered.length} convention${filtered.length !== 1 ? "s" : ""} available:\n\n${lines.join("\n")}\n\nUse \`read-convention\` with a specific \`name\` to read the full content.`;

            return {
                content: [
                    {
                        type: "text" as const,
                        text: summary,
                    },
                ],
            };
        }
    );
}
