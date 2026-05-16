import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Env } from "./types";
import * as z from "zod";
import nplus1 from "./prompt/nplus1.md?raw";

let appSingleton: McpServer | null = null;
let previousEnv: Env | null = null;

function getStringEnv(obj: Record<string, unknown>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(obj).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string"
        )
    );
}
function isCached(env: Env): boolean {
    if (!appSingleton || !previousEnv) {
        return false;
    }

    return (
        JSON.stringify(getStringEnv(env)) ===
        JSON.stringify(getStringEnv(previousEnv))
    );
}

export function setup(env: Env) {
    if (isCached(env)) {
        return appSingleton as McpServer;
    }

    const app = new McpServer({
        name: "Example MCP Server",
        version: "1.0.0",
    });

    const inputSchema = z.object({
        name: z.string().default("Claude-chan"),
    });
    const outputSchema = z.object({
        greeting: z.string(),
    });

    app.registerTool(
        "greet",
        {
            inputSchema,
            outputSchema,
            annotations: {
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false,
                readOnlyHint: true,
                title: "Greet someone",
            },
            description: "A simple tool that greets someone by name.",
            title: "Greet",
        },
        async (i) => {
            i satisfies z.output<typeof inputSchema>;
            if (env.MAGIC_SECRET_KEY) {
                console.log(
                    `🔐 MAGIC_SECRET_KEY is set. Received name: ${i.name}`
                );
            }
            return {
                content: [],
                isError: false,
                structuredContent: {
                    greeting: `Hello, ${i.name}!`,
                } satisfies z.output<typeof outputSchema>,
            };
        }
    );

    app.registerTool(
        "ungreet",
        {
            inputSchema,
            annotations: {
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false,
                readOnlyHint: true,
                title: "Ungreet someone",
            },
            description: "A simple tool that ungreets someone by name.",
            title: "Ungreet",
        },
        async (i) => {
            i satisfies z.output<typeof inputSchema>;
            return {
                content: [
                    {
                        type: "text",
                        text: `Goodbye, ${i.name}!`,
                    },
                ],
                isError: false,
            };
        }
    );

    app.registerPrompt(
        "nplus1",
        {
            description:
                "Makes tests for N+1 query issues in Java Spring applications.",
            argsSchema: z.object({}).shape,
            title: "N+1 Query Test Generator",
        },
        async () => {
            return {
                messages: [
                    {
                        content: {
                            type: "text",
                            text: nplus1,
                        },
                        role: "user",
                    },
                ],
                description: "Prompt for N+1 query test generation",
            };
        }
    );

    appSingleton = app;
    previousEnv = env;
    return app;
}
