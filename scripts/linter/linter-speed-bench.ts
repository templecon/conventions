import { spawnSync } from "child_process";
import { performance } from "perf_hooks";

const COMMAND_NAME = "pnpm";
const COMMAND_ARGS = ["lint"];

function runBenchCommand(): number {
    const start = performance.now();

    try {
        const res = spawnSync(COMMAND_NAME, COMMAND_ARGS, {
            stdio: ["ignore", "ignore", "pipe"],
            shell: true,
            encoding: "utf-8",
        });
        const end = performance.now();

        if (res.error) {
            throw new Error(`Failed to start command: ${res.error.message}`);
        }

        if (res.status !== 0) {
            const stderr = res.stderr?.toString().trim() || "No error output";
            throw new Error(
                `Command failed with exit code ${res.status}. Error: ${stderr}`
            );
        }

        return (end - start) / 1000;
    } catch (err) {
        if (err instanceof Error) {
            throw new Error(`[Execution Error] ${err.message}`, { cause: err });
        }
        throw err;
    }
}

function calculateStats(data: number[]): { mean: number; stdev: number } {
    const n = data.length;
    if (n === 0) return { mean: 0, stdev: 0 };

    const mean = data.reduce((a, b) => a + b, 0) / n;
    if (n < 2 || mean === 0) return { mean, stdev: 0 };

    const variance =
        data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
    const stdev = Math.sqrt(variance);

    return { mean, stdev };
}

function getCleanedStats(data: number[]): { mean: number; stdev: number } {
    if (data.length < 4) {
        return calculateStats(data);
    }

    const sortedData = [...data].sort((a, b) => a - b);
    const n = sortedData.length;

    const q1 = sortedData[Math.floor(n / 4)]!;
    const q3 = sortedData[Math.floor((3 * n) / 4)]!;
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const filteredData = sortedData.filter(
        (x) => x >= lowerBound && x <= upperBound
    );

    const finalTarget = filteredData.length >= 2 ? filteredData : data;
    return calculateStats(finalTarget);
}

function benchmarkPnpmLint(
    targetCv: number = 0.02,
    minRuns: number = 5,
    maxRuns: number = 50
): void {
    const durations: number[] = [];

    console.log("⚡ Warming up (3 runs)...");
    for (let i = 0; i < 3; i++) {
        try {
            runBenchCommand();
        } catch (e) {
            console.error(`❌ Warm-up failed: ${(e as Error).message}`);
            return;
        }
    }

    console.log(
        `📊 Benchmarking (Target CV: < ${(targetCv * 100).toFixed(1)}%)`
    );

    for (let i = 1; i <= maxRuns; i++) {
        let elapsed: number;
        try {
            elapsed = runBenchCommand();
        } catch (e) {
            console.error(
                `\n❌ Execution failed at run ${i}: ${(e as Error).message}`
            );
            break;
        }

        durations.push(elapsed);

        if (i >= minRuns) {
            const { mean, stdev } = getCleanedStats(durations);
            const cv = mean > 0 ? stdev / mean : 0;

            process.stdout.write(
                `   [${i.toString().padStart(2, "0")}] ` +
                    `Last: ${elapsed.toFixed(4)}s | ` +
                    `Mean: ${mean.toFixed(4)}s | ` +
                    `CV: ${(cv * 100).toFixed(2)}%\n`
            );

            if (cv <= targetCv) {
                console.log("\n✅ Statistical confidence reached.");
                break;
            }
        }

        if (i === maxRuns) {
            console.warn(`\n⚠️  Max runs reached without hitting target CV.`);
        }
    }

    if (durations.length === 0) {
        console.error("❌ No data collected. Benchmark aborted.");
        return;
    }

    const { mean: fMean, stdev: fSd } = getCleanedStats(durations);
    const finalCv = fMean > 0 ? (fSd / fMean) * 100 : 0;
    const separator = "=".repeat(45);

    console.log(`\n${separator}`);
    console.log(`Final Results (N=${durations.length})`);
    console.log(`Average Time       : ${fMean.toFixed(4)}s`);
    console.log(`Standard Deviation : ${fSd.toFixed(4)}s`);
    console.log(`Relative Error (CV): ${finalCv.toFixed(2)}%`);
    console.log(separator);
}

process.on("SIGINT", () => {
    console.log("\n\n🛑 Benchmark aborted by user.");
    process.exit(0);
});

try {
    benchmarkPnpmLint();
} catch (error) {
    console.error("\n💥 A fatal error occurred:");
    if (error instanceof Error) {
        console.error(error.message);
    } else {
        console.error(error);
    }
    process.exit(1);
}
