import {
    McpServer,
    ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Parsed skill entry from frontmatter + body.
 */
export type SkillEntry = {
    /** Skill identifier from frontmatter `name` (RFC-compliant). */
    name: string;
    /** Human-readable description from frontmatter. */
    description: string;
    /** Markdown body (frontmatter stripped) — used for MCP prompt registration. */
    body: string;
    /** Raw file content including frontmatter — used for well-known SKILL.md serving. */
    raw: string;
    /** Vite glob path, e.g. "/src/prompt/skills/hono.md". */
    path: string;
};

// ---------------------------------------------------------------------------
// Vite glob — all .md files in the skills directory are bundled at build time.
// `?raw` returns the file content as a plain string via `.default`.
// ---------------------------------------------------------------------------

type GlobMap = Record<string, { default: string }>;

const modules = import.meta.glob<{ default: string }>(
    "/src/prompt/skills/*.md",
    { eager: true, query: "?raw" }
) as GlobMap;

// ---------------------------------------------------------------------------
// Frontmatter parser (regex-based, no extra dependencies)
// ---------------------------------------------------------------------------

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;

/**
 * Minimal YAML frontmatter parser. Extracts `name`, `description`, and body.
 */
function parseFrontmatter(
    content: string,
    path: string
): { name: string; description: string; body: string; raw: string } {
    const match = content.match(FRONTMATTER_RE);
    if (!match || match[1] === undefined) {
        throw new Error(
            `Skill file "${path}" is missing YAML frontmatter (--- blocks).`
        );
    }

    const frontmatter: string = match[1];
    const body: string = match[2]?.trimStart() ?? "";

    const nameLine = frontmatter.match(/^name:\s*(.+)$/m);
    if (!nameLine || !nameLine[1]) {
        throw new Error(
            `Skill file "${path}" is missing "name:" in frontmatter.`
        );
    }

    const descLine = frontmatter.match(/^description:\s*(.+)$/m);
    const name = nameLine[1].trim();
    const description = descLine?.[1]
        ? descLine[1].trim().replace(/^"(.*)"$/, "$1")
        : "";

    return { name, description, body, raw: content };
}

// ---------------------------------------------------------------------------
// RFC skill-name validation
// ---------------------------------------------------------------------------

/**
 * Returns `true` when `name` conforms to the Agent Skills naming spec:
 * - 1-64 characters
 * - lowercase alphanumeric and hyphens only
 * - MUST NOT start or end with a hyphen
 * - MUST NOT contain consecutive hyphens
 */
function isValidSkillName(name: string): boolean {
    if (name.length < 1 || name.length > 64) return false;
    return /^[a-z0-9]([a-z0-9]|-[a-z0-9])*$/.test(name);
}

// ---------------------------------------------------------------------------
// Build the skill registry
// ---------------------------------------------------------------------------

const skills: SkillEntry[] = [];

for (const [filePath, mod] of Object.entries(modules)) {
    const raw = mod.default;
    const { name, description, body } = parseFrontmatter(raw, filePath);

    if (!isValidSkillName(name)) {
        throw new Error(
            `Invalid skill name "${name}" in "${filePath}". ` +
                "Names must be 1-64 chars, lowercase alphanumeric + hyphens, " +
                "no leading/trailing/consecutive hyphens."
        );
    }

    skills.push({ name, description, body, raw, path: filePath });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the list of all discovered skills (frontmatter + body).
 */
export function getSkills(): SkillEntry[] {
    return skills;
}

/**
 * Registers every discovered skill as an MCP resource on the given server.
 *
 * Uses a `ResourceTemplate` with URI pattern `convention://{name}` so clients
 * can list and read individual convention documents. This is intended for the
 * plain `/mcp` endpoint. The `/with-tool/mcp` endpoint (for Copilot) does NOT
 * register resources — only the `read-convention` tool.
 */
export function registerAllResources(app: McpServer): void {
    const template = new ResourceTemplate("convention://{name}", {
        list: async () => ({
            resources: skills.map((s) => ({
                uri: `convention://${s.name}`,
                name: s.name,
                description: s.description,
                mimeType: "text/markdown",
            })),
        }),
    });

    app.registerResource(
        "convention",
        template,
        {
            description: "Project coding conventions",
            mimeType: "text/markdown",
        },
        async (uri, variables) => {
            const name = variables.name as string | undefined;
            if (!name) {
                return {
                    contents: [
                        {
                            uri: uri.href,
                            mimeType: "text/plain",
                            text: "Convention not found — missing name in URI.",
                        },
                    ],
                };
            }
            const skill = skills.find((s) => s.name === name);
            if (!skill) {
                return {
                    contents: [
                        {
                            uri: uri.href,
                            mimeType: "text/plain",
                            text: `Convention "${name}" not found.`,
                        },
                    ],
                };
            }
            return {
                contents: [
                    {
                        uri: uri.href,
                        mimeType: "text/markdown",
                        text: skill.body,
                    },
                ],
            };
        }
    );
}
