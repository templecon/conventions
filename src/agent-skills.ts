import { getSkills, type SkillEntry } from "@/prompt/registry";

// ---------------------------------------------------------------------------
// SHA-256 digest for integrity verification
// ---------------------------------------------------------------------------

/**
 * Computes the SHA-256 hex digest of a string using the Web Crypto API.
 */
async function sha256Digest(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

// ---------------------------------------------------------------------------
// Lazy-built index and digest cache
// ---------------------------------------------------------------------------

let cachedIndex: string | null = null;
let skillDigests: Map<string, string> | null = null;

async function ensureDigests(
    skills: SkillEntry[]
): Promise<Map<string, string>> {
    if (skillDigests) return skillDigests;

    const digests = new Map<string, string>();
    for (const skill of skills) {
        digests.set(skill.name, await sha256Digest(skill.raw));
    }
    skillDigests = digests;
    return digests;
}

async function buildIndex(skills: SkillEntry[]): Promise<string> {
    if (cachedIndex) return cachedIndex;

    const digests = await ensureDigests(skills);

    const index = {
        $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
        skills: skills.map((s) => ({
            name: s.name,
            type: "skill-md" as const,
            description: s.description,
            url: `/.well-known/agent-skills/${s.name}/SKILL.md`,
            digest: `sha256:${digests.get(s.name)}`,
        })),
    };

    cachedIndex = JSON.stringify(index, null, 2);
    return cachedIndex;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the Agent Skills discovery index JSON string.
 */
export async function getDiscoveryIndex(): Promise<string> {
    return buildIndex(getSkills());
}

/**
 * Returns skill content (SKILL.md with frontmatter) for a given name,
 * or `undefined` if no skill matches.
 */
export function getSkillContent(name: string): string | undefined {
    const skills = getSkills();
    return skills.find((s) => s.name === name)?.raw;
}

/**
 * Returns the SHA-256 digest for a skill, or `undefined` if unknown.
 */
export async function getSkillDigest(
    name: string
): Promise<string | undefined> {
    const skills = getSkills();
    const digests = await ensureDigests(skills);
    return digests.get(name);
}
