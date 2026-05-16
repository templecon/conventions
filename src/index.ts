import type { HonoEnv } from "@/types";
import { setup } from "@/route";
import { cors } from "@/utils/cors";
import { StreamableHTTPTransport } from "@hono/mcp";
import { Hono } from "hono";
import { getDiscoveryIndex, getSkillContent } from "@/agent-skills";
/**
 * @fileoverview
 * This is the main entry point of the Hono application. It sets up the routing and middleware for the application.
 * Don't make this file too large. If you need to add more routes, create separate route files and import them here.
 */

const transport = new StreamableHTTPTransport();
const app = new Hono<HonoEnv>()
    .use("*", cors)
    .all("/mcp", async (c) => {
        const mcpServer = setup(c.env);
        if (!mcpServer.isConnected()) {
            // Connect the mcp with the transport
            await mcpServer.connect(transport);
        }
        return transport.handleRequest(c);
    })
    // Agent Skills discovery (RFC well-known URI)
    .get("/.well-known/agent-skills/index.json", async (c) => {
        const index = await getDiscoveryIndex();
        return c.newResponse(index, 200, {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600",
        });
    })
    .get("/.well-known/agent-skills/:name/SKILL.md", (c) => {
        const name = c.req.param("name");
        const content = getSkillContent(name);
        if (!content) {
            return c.text("Skill not found", 404);
        }
        return c.newResponse(content, 200, {
            "Content-Type": "text/markdown",
            "Cache-Control": "public, max-age=3600",
        });
    })
    .get("/", (c) => {
        return c.text(`Conventions MCP Server

Endpoints:
  GET  /mcp                                          MCP protocol endpoint, streamable HTTP without authentication
  GET  /.well-known/agent-skills/index.json           Agent Skills discovery index
  GET  /.well-known/agent-skills/:name/SKILL.md       Individual skill content`);
    });
export default app;
