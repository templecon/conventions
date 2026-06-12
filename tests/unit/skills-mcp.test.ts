import { describe, expect, it, beforeAll } from "vitest";
import { getSkillIndexJson } from "@/skills-mcp";
import { getSkills } from "@/prompt/registry";
import { setup } from "@/route";
import type { Env } from "@/types";
import { Client } from "@modelcontextprotocol/sdk/client";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory";

const env: Env = { MAGIC_SECRET_KEY: "test-skills-mcp" };

// ---------------------------------------------------------------------------
// Helper: create a connected client-server pair for integration tests
// ---------------------------------------------------------------------------

async function createConnectedPair(includeResources = true) {
    const server = setup(env, { includeResources });
    const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();
    const client = new Client(
        { name: "test-client", version: "1.0.0" },
        { capabilities: {} }
    );
    await Promise.all([
        client.connect(clientTransport),
        server.connect(serverTransport),
    ]);
    return { server, client };
}

// ---------------------------------------------------------------------------
// Index JSON format tests (pure unit tests, no transport needed)
// ---------------------------------------------------------------------------

describe("getSkillIndexJson — SEP-2640 index format", () => {
    const skills = getSkills();
    type IndexEntry = {
        url: string;
        digest: string;
        frontmatter: {
            name: string;
            description: string;
            [key: string]: unknown;
        };
    };
    type IndexJson = {
        skills: IndexEntry[];
    };

    let index: IndexJson;

    beforeAll(async () => {
        index = JSON.parse(await getSkillIndexJson()) as IndexJson;
    });

    it("should NOT have $schema field (SEP-2640 uses MCP-specific schema)", () => {
        expect(index).not.toHaveProperty("$schema");
    });

    it("should list all skills", () => {
        expect(index.skills).toHaveLength(skills.length);
    });

    it("should have SEP-2640 entry structure (url, digest, frontmatter)", () => {
        for (const entry of index.skills) {
            expect(entry).toHaveProperty("url");
            expect(entry).toHaveProperty("digest");
            expect(entry).toHaveProperty("frontmatter");
            // No flat fields at entry level
            expect(entry).not.toHaveProperty("name");
            expect(entry).not.toHaveProperty("type");
            expect(entry).not.toHaveProperty("description");
        }
    });

    it("should use skill:// scheme in url field", () => {
        for (const entry of index.skills) {
            expect(entry.url).toMatch(/^skill:\/\/.+\/SKILL\.md$/);
        }
    });

    it("should include sha256 digest for every entry", () => {
        for (const entry of index.skills) {
            expect(entry.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
        }
    });

    it("should have frontmatter with name matching skill name", () => {
        const skillNames = new Set(skills.map((s) => s.name));
        for (const entry of index.skills) {
            expect(skillNames.has(entry.frontmatter.name)).toBe(true);
        }
    });

    it("should have frontmatter with description matching skill description", () => {
        const skillMap = new Map(skills.map((s) => [s.name, s.description]));
        for (const entry of index.skills) {
            expect(entry.frontmatter.description).toBe(
                skillMap.get(entry.frontmatter.name)
            );
        }
    });

    it("should have frontmatter as verbatim JSON (all fields preserved)", () => {
        for (const entry of index.skills) {
            expect(entry.frontmatter).toHaveProperty("name");
            expect(entry.frontmatter).toHaveProperty("description");
            // Only name + description for our skills; verify no extra unexpected
            // structure issues
            expect(typeof entry.frontmatter.name).toBe("string");
            expect(typeof entry.frontmatter.description).toBe("string");
        }
    });
});

// ---------------------------------------------------------------------------
// Resource read integration tests (via InMemoryTransport)
// ---------------------------------------------------------------------------

describe("skill:// resource reads", () => {
    it("should read a known skill by URI", async () => {
        const { client } = await createConnectedPair();
        const result = await client.readResource({
            uri: "skill://hono-conventions/SKILL.md",
        });
        expect(result.contents).toHaveLength(1);

        const content = result.contents[0];
        expect(content).toHaveProperty(
            "uri",
            "skill://hono-conventions/SKILL.md"
        );
        expect(content).toHaveProperty("mimeType", "text/markdown");
        expect(content).toHaveProperty("text");
        expect((content as { text: string }).text).toContain("Hono");
    });

    it("should read skill://index.json", async () => {
        const { client } = await createConnectedPair();
        const result = await client.readResource({
            uri: "skill://index.json",
        });
        expect(result.contents).toHaveLength(1);

        const content = result.contents[0];
        expect(content).toHaveProperty("uri", "skill://index.json");
        expect(content).toHaveProperty("mimeType", "application/json");

        const text = (content as { text: string }).text;
        const parsed = JSON.parse(text) as {
            skills: Array<{
                url: string;
                digest: string;
                frontmatter: { name: string };
            }>;
        };
        // SEP-2640 format: no $schema, top-level skills array
        expect(parsed).not.toHaveProperty("$schema");
        expect(parsed.skills.length).toBeGreaterThan(0);
        // Every entry has url + digest + frontmatter
        for (const entry of parsed.skills) {
            expect(entry).toHaveProperty("url");
            expect(entry).toHaveProperty("digest");
            expect(entry).toHaveProperty("frontmatter");
            expect(entry.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
        }
    });

    it("should return error text for unknown skill", async () => {
        const { client } = await createConnectedPair();
        const result = await client.readResource({
            uri: "skill://nonexistent/SKILL.md",
        });
        expect(result.contents).toHaveLength(1);

        const content = result.contents[0];
        expect(content).toHaveProperty("mimeType", "text/plain");
        expect((content as { text: string }).text).toContain(
            'Skill "nonexistent" not found'
        );
    });
});

describe("skill:// resource listing", () => {
    it("should list all skill resources", async () => {
        const { client } = await createConnectedPair();
        const result = await client.listResources();
        // Each skill + the index.json fixed resource
        const expectedCount = getSkills().length + 1;
        expect(result.resources.length).toBeGreaterThanOrEqual(
            getSkills().length
        );
        expect(result.resources.length).toBe(expectedCount);
    });

    it("should include skill://index.json in the resource list", async () => {
        const { client } = await createConnectedPair();
        const result = await client.listResources();
        const uris = result.resources.map((r) => r.uri);
        expect(uris).toContain("skill://index.json");
    });

    it("should list all skill names in resources", async () => {
        const { client } = await createConnectedPair();
        const result = await client.listResources();
        const skillNames = getSkills().map((s) => s.name);
        for (const name of skillNames) {
            expect(result.resources.map((r) => r.uri)).toContain(
                `skill://${name}/SKILL.md`
            );
        }
    });
});

// ---------------------------------------------------------------------------
// SEP-2640 capability declaration
// ---------------------------------------------------------------------------

describe("SEP-2640 capability declaration", () => {
    it("should be present in initialize response when includeResources is true", async () => {
        const { client } = await createConnectedPair(true);
        // The client's server capabilities are populated after connect
        const serverCaps = client.getServerCapabilities();
        expect(serverCaps).toBeDefined();
        expect(serverCaps?.extensions).toBeDefined();
        expect(
            serverCaps?.extensions?.["io.modelcontextprotocol/skills"]
        ).toEqual({});
    });

    it("should NOT be present when includeResources is false", async () => {
        const { client } = await createConnectedPair(false);
        const serverCaps = client.getServerCapabilities();
        // When no resources registered, the skills extension should not be declared
        expect(
            serverCaps?.extensions?.["io.modelcontextprotocol/skills"]
        ).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// Smoke tests for setup function
// ---------------------------------------------------------------------------

describe("setup function", () => {
    it("should create server with resources without error", () => {
        expect(() => setup(env, { includeResources: true })).not.toThrow();
    });

    it("should create server with tool without error", () => {
        expect(() => setup(env, { includeTool: true })).not.toThrow();
    });

    it("should create server with both without error", () => {
        expect(() =>
            setup(env, { includeResources: true, includeTool: true })
        ).not.toThrow();
    });

    it("should create server without anything without error", () => {
        expect(() => setup(env)).not.toThrow();
    });
});
