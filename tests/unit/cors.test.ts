import { describe, expect, it } from "vitest";
import { testClient } from "hono/testing";

import { Hono } from "hono";
import type { HonoEnv } from "@/types";
import { cors } from "@/utils/cors";

describe("CORS middleware", () => {
    const app = new Hono<HonoEnv>()
        .use("*", cors)
        .get("/", (c) => c.text("Hello World"))
        .options("/", (c) => c.text("OPTIONS route"));
    const client = testClient(app);

    it.concurrent(
        "should respond with CORS headers on safe methods",
        async () => {
            const resp = await client.index.$get(
                {},
                {
                    headers: {
                        Origin: "http://example.com",
                        "Access-Control-Request-Method": "POST",
                        "Access-Control-Request-Headers":
                            "Content-Type, Authorization",
                    },
                }
            );
            expect(resp.status).toBe(200);
            expect(resp.headers.get("Access-Control-Allow-Origin")).toBe(
                "http://example.com"
            );
        }
    );
    it.concurrent(
        "should not respond as CORS on requests without Origin header",
        async () => {
            const resp = await client.index.$get({});
            expect(resp.status).toBe(200);
            expect(resp.headers.get("Access-Control-Allow-Origin")).toBeNull();
        }
    );
    it.concurrent(
        "should respond with 204 and correct headers on OPTIONS preflight",
        async ({ annotate }) => {
            // Evil code... but it's required since options route is not registered (handled in middleware)
            const resp = await client.index.$options(
                {},
                {
                    headers: {
                        Origin: "http://example.com",
                        "Access-Control-Request-Method": "POST",
                        "Access-Control-Request-Headers": "Content-Type",
                    },
                }
            );

            expect(resp.status).toBe(204);
            await annotate(
                resp.headers.get("Access-Control-Allow-Methods") ?? "null"
            );
            expect(resp.headers.get("Access-Control-Allow-Methods")).toContain(
                "POST"
            );
            expect(resp.headers.get("Access-Control-Allow-Origin")).toBe(
                "http://example.com"
            );
        }
    );
    it.concurrent("should include CORS metadata headers", async () => {
        const resp = await client.index.$get(
            {},
            {
                headers: { Origin: "http://example.com" },
            }
        );

        expect(resp.headers.get("Access-Control-Allow-Credentials")).toBe(
            "true"
        );
        expect(resp.headers.get("Access-Control-Max-Age")).toBe("86400");
        expect(resp.headers.get("Vary")).toContain("Origin");
    });
    it.concurrent(
        "should handle Simple Request (GET) with Origin",
        async () => {
            const resp = await client.index.$get(
                {},
                {
                    headers: { Origin: "http://example.com" },
                }
            );

            expect(resp.status).toBe(200);
            expect(resp.headers.get("Access-Control-Allow-Origin")).toBe(
                "http://example.com"
            );
        }
    );
});
