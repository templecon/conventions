import {
    McpServer,
    ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSkills } from "@/prompt/registry";

// ---------------------------------------------------------------------------
// SEP-2640: Skills Extension — Skill URI scheme and discovery
//
// This module implements the SEP-2640 Skills Extension for MCP:
// https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2640
//
// Each skill is exposed as:
//   skill://{name}/SKILL.md
//
// A discovery index is available at:
//   skill://index.json
// ---------------------------------------------------------------------------

// Frontmatter delimiter regex (same pattern as registry.ts)
const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;

// ---------------------------------------------------------------------------
// Cached index (skills are loaded eagerly at build time, never change)
// ---------------------------------------------------------------------------

let cachedIndex: string | null = null;
let indexBuildPromise: Promise<string> | null = null;

// ---------------------------------------------------------------------------
// SHA-256 helper (Web Crypto API)
// ---------------------------------------------------------------------------

/**
 * Computes `sha256:{hex}` digest of a string using the Web Crypto API.
 */
async function sha256Digest(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hash = await crypto.subtle.digest("SHA-256", data);
    const hex = Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return `sha256:${hex}`;
}

// ---------------------------------------------------------------------------
// Verbatim frontmatter extraction (YAML → JSON object)
// ---------------------------------------------------------------------------

/**
 * Extracts the YAML frontmatter from a raw SKILL.md as a JSON object,
 * preserving all fields verbatim per SEP-2640 §Enumeration via skill://index.json.
 */
function extractFrontmatter(raw: string): Record<string, unknown> {
    const match = raw.match(FRONTMATTER_RE);
    if (!match) return {};

    const yaml: string = match[1] ?? "";
    const result: Record<string, unknown> = {};

    for (const line of yaml.split("\n")) {
        const keyMatch = line.match(/^(\w[\w-]*):\s*(.*)$/);
        if (keyMatch) {
            const key = keyMatch[1]!;
            const rawValue = keyMatch[2] ?? "";
            let value: string | boolean | number = rawValue.trim();
            // Parse booleans
            if (value === "true") value = true;
            else if (value === "false") value = false;
            // Parse numbers
            else if (/^\d+$/.test(value)) value = Number(value);
            else if (/^\d+\.\d+$/.test(value)) value = Number(value);
            // Strip surrounding quotes
            else if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }
            result[key] = value;
        }
    }

    return result;
}

// ---------------------------------------------------------------------------
// Index builder
// ---------------------------------------------------------------------------

/**
 * Generates the `skill://index.json` content per SEP-2640.
 *
 * Uses the MCP-specific index schema (not the Agent Skills HTTP discovery format):
 *
 * ```json
 * {
 *   "skills": [
 *     {
 *       "url": "skill://hono-conventions/SKILL.md",
 *       "digest": "sha256:abcd...",
 *       "frontmatter": { "name": "hono-conventions", "description": "..." }
 *     }
 *   ]
 * }
 * ```
 */
export async function getSkillIndexJson(): Promise<string> {
    if (cachedIndex) return cachedIndex;
    if (indexBuildPromise) return indexBuildPromise;

    indexBuildPromise = buildIndex();
    cachedIndex = await indexBuildPromise;
    return cachedIndex;
}

async function buildIndex(): Promise<string> {
    const skills = getSkills();
    const entries = await Promise.all(
        skills.map(async (s) => ({
            url: `skill://${s.name}/SKILL.md`,
            digest: await sha256Digest(s.raw),
            frontmatter: extractFrontmatter(s.raw) as {
                name: string;
                description: string;
                [key: string]: unknown;
            },
        }))
    );

    return JSON.stringify({ skills: entries }, null, 2);
}

/**
 * Resets the cached index (for testing purposes).
 */
export function resetIndexCache(): void {
    cachedIndex = null;
    indexBuildPromise = null;
}

/**
 * Registers conventions as MCP resources under the `skill://` URI scheme
 * per SEP-2640.
 *
 * Two resource types are registered:
 * 1. `skill://{name}/SKILL.md` — individual skill content (ResourceTemplate)
 * 2. `skill://index.json` — SEP-2640 discovery index (fixed resource)
 *
 * Also declares the `io.modelcontextprotocol/skills` extension capability
 * on the server so clients can detect support during initialization.
 */
export function registerSkillResources(app: McpServer): void {
    // Declare the SEP-2640 skills extension capability
    app.server.registerCapabilities({
        extensions: {
            "io.modelcontextprotocol/skills": {},
        },
    });
    // ── skill://{name}/SKILL.md (template) ──────────────────────────────
    const template = new ResourceTemplate("skill://{name}/SKILL.md", {
        list: async () => ({
            resources: getSkills().map((s) => ({
                uri: `skill://${s.name}/SKILL.md`,
                name: s.name,
                description: s.description,
                mimeType: "text/markdown" as const,
            })),
        }),
    });

    app.registerResource(
        "conventions",
        template,
        {
            description: "Project coding conventions (SEP-2640 skills)",
            mimeType: "text/markdown",
        },
        async (uri, variables) => {
            // Variables = Record<string, string | string[]>
            // Normalize to string | undefined to handle both cases
            const raw = variables.name;
            const name = Array.isArray(raw) ? raw[0] : raw;
            if (!name) {
                return {
                    contents: [
                        {
                            uri: uri.href,
                            mimeType: "text/plain",
                            text: "Skill not found — missing name in URI.",
                        },
                    ],
                };
            }
            const skill = getSkills().find((s) => s.name === name);
            if (!skill) {
                return {
                    contents: [
                        {
                            uri: uri.href,
                            mimeType: "text/plain",
                            text: `Skill "${name}" not found.`,
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

    // ── skill://index.json (fixed resource) ─────────────────────────────
    app.registerResource(
        "conventions-index",
        "skill://index.json",
        {
            description: "SEP-2640 discovery index of all available skills",
            mimeType: "application/json",
        },
        async (uri: URL) => ({
            contents: [
                {
                    uri: uri.href,
                    mimeType: "application/json",
                    text: await getSkillIndexJson(),
                },
            ],
        })
    );
}
