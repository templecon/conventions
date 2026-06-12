import { describe, expect, it } from "vitest";
import { getSkills } from "@/prompt/registry";

/** Matches RFC skill naming: 1-64 chars, lowercase alphanumeric + hyphens,
 *  no leading/trailing/consecutive hyphens. */
const RFC_NAME_RE = /^[a-z0-9]([a-z0-9]|-[a-z0-9]){0,62}$/;

describe("skill registry", () => {
    const skills = getSkills();

    it.concurrent("should discover all skill files", () => {
        expect(skills).toHaveLength(8);
    });

    it.concurrent("should have RFC-compliant names", () => {
        for (const skill of skills) {
            expect(skill.name.length).toBeGreaterThanOrEqual(1);
            expect(skill.name.length).toBeLessThanOrEqual(64);
            expect(skill.name).toMatch(RFC_NAME_RE);
        }
    });

    it.concurrent("should reject consecutive hyphens", () => {
        expect("a--b").not.toMatch(RFC_NAME_RE);
    });

    it.concurrent("should reject leading hyphen", () => {
        expect("-ab").not.toMatch(RFC_NAME_RE);
    });

    it.concurrent("should reject trailing hyphen", () => {
        expect("ab-").not.toMatch(RFC_NAME_RE);
    });

    it.concurrent("should accept single char", () => {
        expect("a").toMatch(RFC_NAME_RE);
    });

    it.concurrent("should accept names with hyphens", () => {
        expect("a-b").toMatch(RFC_NAME_RE);
    });

    it.concurrent("should have unique names", () => {
        const names = skills.map((s) => s.name);
        expect(new Set(names).size).toBe(names.length);
    });

    it.concurrent("should have non-empty descriptions", () => {
        for (const skill of skills) {
            expect(skill.description).toBeTruthy();
        }
    });

    it.concurrent("should have non-empty body", () => {
        for (const skill of skills) {
            expect(skill.body.length).toBeGreaterThan(0);
        }
    });

    it.concurrent("should have raw content with frontmatter", () => {
        for (const skill of skills) {
            expect(skill.raw).toContain("---");
            expect(skill.raw).toContain(`name: ${skill.name}`);
        }
    });

    it.concurrent("should include hono-conventions", () => {
        const hono = skills.find((s) => s.name === "hono-conventions");
        expect(hono).toBeDefined();
        expect(hono?.description).toContain("Hono");
    });

    it.concurrent("should include hono-cloudflare-workers", () => {
        const cf = skills.find((s) => s.name === "hono-cloudflare-workers");
        expect(cf).toBeDefined();
        expect(cf?.description).toContain("Cloudflare Workers");
    });

    it.concurrent("should include tests", () => {
        const tests = skills.find((s) => s.name === "tests");
        expect(tests).toBeDefined();
        expect(tests?.description).toContain("Vitest");
    });

    it.concurrent("should include typescript", () => {
        const ts = skills.find((s) => s.name === "typescript");
        expect(ts).toBeDefined();
        expect(ts?.description).toContain("TypeScript");
    });

    it.concurrent("should include typescript-schema", () => {
        const schema = skills.find((s) => s.name === "typescript-schema");
        expect(schema).toBeDefined();
        expect(schema?.description).toContain("Zod");
    });

    it.concurrent("should include svelte", () => {
        const svelte = skills.find((s) => s.name === "svelte");
        expect(svelte).toBeDefined();
        expect(svelte?.description).toContain("Svelte 5");
    });

    it.concurrent("should include mcp-server", () => {
        const mcp = skills.find((s) => s.name === "mcp-server");
        expect(mcp).toBeDefined();
        expect(mcp?.description).toContain("MCP");
    });

    it.concurrent("should include hono-openapi", () => {
        const openapi = skills.find((s) => s.name === "hono-openapi");
        expect(openapi).toBeDefined();
        expect(openapi?.description).toContain("OpenAPI");
    });
});
