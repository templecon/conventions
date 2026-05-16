import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Env } from "./types";
import { registerAllPrompts } from "@/prompt/registry";
import { registerConventionsTool } from "@/conventions-tool";

/**
 * Creates an MCP server instance.
 *
 * @param includeTool - When `true`, the `read-convention` tool is registered
 *   (intended for the `/with-tool/mcp` route used by VS Code Copilot).
 */
export function setup(env: Env, includeTool: boolean) {
    const app = new McpServer({
        name: "Conventions MCP Server",
        version: "1.0.0",
    });

    registerAllPrompts(app);
    if (includeTool) {
        registerConventionsTool(app);
    }

    return app;
}
