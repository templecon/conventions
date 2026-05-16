import type { HonoEnv } from "@/types";
import { setup } from "@/route";
import { cors } from "@/utils/cors";
import { StreamableHTTPTransport } from "@hono/mcp";
import { Hono } from "hono";
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
    .get("/", (c) => {
        return c.text("Hello, World! This is MCP server.");
    });
export default app;
