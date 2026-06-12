import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Env } from "./types";
import { registerSkillResources } from "@/skills-mcp";
import { registerConventionsTool } from "@/conventions-tool";

export type SetupOptions = {
    /**
     * When `true`, the `read-convention` tool is registered
     * (intended for the `/with-tool/mcp` route used by VS Code Copilot).
     */
    includeTool?: boolean;
    /**
     * When `true`, conventions are exposed as MCP resources
     * (intended for the plain `/mcp` route — general purpose clients).
     */
    includeResources?: boolean;
};

/**
 * Creates an MCP server instance.
 *
 * Two endpoints consume this function:
 * - `/mcp`            calls `setup(env, { includeResources: true })`
 * - `/with-tool/mcp`  calls `setup(env, { includeTool: true })`
 *
 * This way, Copilot gets the tool without resource noise, while general
 * clients get resources without the tool.
 */
export function setup(env: Env, options?: SetupOptions) {
    const { includeTool = false, includeResources = false } = options ?? {};

    const app = new McpServer({
        name: "Conventions MCP Server",
        version: "1.0.0",
    });

    if (includeResources) {
        registerSkillResources(app);
    }
    if (includeTool) {
        registerConventionsTool(app);
    }

    return app;
}
