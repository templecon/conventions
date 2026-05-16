import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Env } from "./types";
import { registerAllPrompts } from "@/prompt/registry";

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
        name: "Conventions MCP Server",
        version: "1.0.0",
    });

    registerAllPrompts(app);

    appSingleton = app;
    previousEnv = env;
    return app;
}
