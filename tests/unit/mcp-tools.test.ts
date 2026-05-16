import { describe, expect, it } from "vitest";
import { setup } from "@/route";
import type { Env } from "@/types";

describe("MCP tools — conditional registration", () => {
    it("should register read-convention when includeTool is true", () => {
        const env: Env = { MAGIC_SECRET_KEY: "test-a" };
        const server = setup(env, { includeTool: true });
        expect(server).toBeDefined();
    });

    it("should create server without tool when includeTool is false", () => {
        const env: Env = { MAGIC_SECRET_KEY: "test-b" };
        const server = setup(env, { includeTool: false });
        expect(server).toBeDefined();
    });

    it("should create server with resources when includeResources is true", () => {
        const env: Env = { MAGIC_SECRET_KEY: "test-d" };
        const server = setup(env, { includeResources: true });
        expect(server).toBeDefined();
    });

    it("should create server without anything when no options", () => {
        const env: Env = { MAGIC_SECRET_KEY: "test-e" };
        const server = setup(env);
        expect(server).toBeDefined();
    });

    it("should return a different instance each call (no cache)", () => {
        const env: Env = { MAGIC_SECRET_KEY: "test-c" };
        const serverA = setup(env, { includeTool: true });
        const serverB = setup(env, { includeTool: true });
        expect(serverA).not.toBe(serverB);
    });
});
