/**
 * @fileoverview
 * Wrap vitest to suppress sourcemap warnings about missing sources,
 * which are expected due to our dependencies and build setup.
 * Tracking:
 *   modelcontextprotocol/sdk — src/ not shipped to npm, .map files reference missing sources
 *   https://github.com/vitejs/vite/issues/9825 (no universal sourcemap disable option)
 */

import { spawn } from "node:child_process";
import type { Writable } from "node:stream";

const SUPPRESS_PATTERN =
    /^(Sourcemap for ".+" points to missing source files| {2}vite:sourcemap .+)\s*$/;

const args: string[] = process.argv.slice(2);

const child = spawn("pnpm", ["vitest", ...args], {
    env: {
        ...process.env,
        FORCE_COLOR: "3",
        TERM: "xterm-256color",
    },
    stdio: ["inherit", "pipe", "pipe"],
});

function makeFilter(dest: Writable): (chunk: Buffer) => void {
    let buf = "";
    return (chunk: Buffer): void => {
        buf += chunk.toString();
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
            // oxlint-disable-next-line no-control-regex
            const plain = line.replace(/\u001b\[[0-9;]*m/g, "");
            if (SUPPRESS_PATTERN.test(plain)) continue;
            dest.write(`${line}\n`);
        }
    };
}
let sigintCount = 0;
process.on("SIGINT", (): void => {
    sigintCount++;
    if (sigintCount === 1) {
        child.kill("SIGINT");
    } else {
        child.kill("SIGKILL");
        process.exit(130);
    }
});

child.stdout.on("data", makeFilter(process.stdout));
child.stderr.on("data", makeFilter(process.stderr));

child.on(
    "close",
    (code: number | null, signal: NodeJS.Signals | null): void => {
        if (code !== null) {
            process.exit(code);
        }

        if (signal === "SIGINT") {
            process.exit(130);
        }
        if (signal === "SIGTERM") {
            process.exit(143);
        }

        process.exit(1);
    }
);

child.on("error", (err: Error): void => {
    console.error("Failed to spawn vitest:", err);
    process.exit(1);
});
