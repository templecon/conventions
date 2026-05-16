import { describe, expect, it } from "vitest";
import app from "@/index";
import { getSkills } from "@/prompt/registry";

describe("GET /.well-known/agent-skills/index.json", () => {
    it.concurrent("should return 200 with valid JSON", async () => {
        const resp = await app.request("/.well-known/agent-skills/index.json");
        expect(resp.status).toBe(200);
        expect(resp.headers.get("Content-Type")).toContain("application/json");
        expect(resp.headers.get("Cache-Control")).toContain("max-age=3600");
    });

    it.concurrent("should support HEAD method", async () => {
        const resp = await app.request("/.well-known/agent-skills/index.json", {
            method: "HEAD",
        });
        expect(resp.status).toBe(200);
    });

    it.concurrent("should have RFC v0.2.0 schema URI", async () => {
        const resp = await app.request("/.well-known/agent-skills/index.json");
        const body = (await resp.json()) as {
            $schema: string;
            skills: Array<{ name: string; description: string }>;
        };
        expect(body.$schema).toBe(
            "https://schemas.agentskills.io/discovery/0.2.0/schema.json"
        );
    });

    it.concurrent("should list all skills with correct structure", async () => {
        const resp = await app.request("/.well-known/agent-skills/index.json");
        const body = (await resp.json()) as {
            skills: Array<{
                name: string;
                type: string;
                description: string;
                url: string;
                digest: string;
            }>;
        };
        const skills = getSkills();
        expect(body.skills).toHaveLength(skills.length);

        for (const entry of body.skills) {
            expect(entry.type).toBe("skill-md");
            expect(entry.name).toBeTruthy();
            expect(entry.description).toBeTruthy();
            expect(entry.url).toMatch(
                /^\/\.well-known\/agent-skills\/.+\/SKILL\.md$/
            );
            expect(entry.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
        }
    });
});

describe("GET /.well-known/agent-skills/:name/SKILL.md", () => {
    it.concurrent("should return SKILL.md for an existing skill", async () => {
        const resp = await app.request(
            "/.well-known/agent-skills/hono-conventions/SKILL.md"
        );
        expect(resp.status).toBe(200);
        expect(resp.headers.get("Content-Type")).toContain("text/markdown");
    });

    it.concurrent("should support HEAD method", async () => {
        const resp = await app.request(
            "/.well-known/agent-skills/hono-conventions/SKILL.md",
            { method: "HEAD" }
        );
        expect(resp.status).toBe(200);
    });

    it.concurrent("should include frontmatter in the response", async () => {
        const resp = await app.request(
            "/.well-known/agent-skills/hono-conventions/SKILL.md"
        );
        const text = await resp.text();
        expect(text).toContain("---");
        expect(text).toContain("name: hono-conventions");
    });

    it.concurrent("should return 404 for unknown skill", async () => {
        const resp = await app.request(
            "/.well-known/agent-skills/nonexistent-skill/SKILL.md"
        );
        expect(resp.status).toBe(404);
    });

    it.concurrent("should return 404 for unknown skill on HEAD", async () => {
        const resp = await app.request(
            "/.well-known/agent-skills/nonexistent-skill/SKILL.md",
            { method: "HEAD" }
        );
        expect(resp.status).toBe(404);
    });

    it.concurrent("should have correct content for each skill", async () => {
        const skills = getSkills();
        for (const skill of skills) {
            const resp = await app.request(
                `/.well-known/agent-skills/${skill.name}/SKILL.md`
            );
            expect(resp.status).toBe(200);
        }
    });
});
