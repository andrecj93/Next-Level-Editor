import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * R31-4 / R31-5 — the release pipeline itself.
 *
 * Two defects that only show up on the day you actually ship:
 *
 *  - The e2e job gated NOTHING. `build` needed [test, lint], and both
 *    `deploy-demo` and `publish` needed only [build], so the e2e job ran in
 *    parallel and its result could not stop the public site from deploying or
 *    the package from reaching npm. 208 end-to-end tests with no door to hold.
 *
 *  - `publish` had `permissions: contents: read` while package.json sets
 *    `publishConfig.provenance: true`. npm can only mint a provenance
 *    attestation from the workflow's OIDC token, which needs
 *    `id-token: write` — so the FIRST release would have failed at
 *    `npm publish`.
 *
 * These are asserted against the workflow text because there is no cheap way
 * to run GitHub Actions locally, and both failures are silent until launch.
 */
const root = process.cwd();
const workflow = readFileSync(
  resolve(root, ".github/workflows/ci.yml"),
  "utf-8"
);
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8"));

/**
 * The body of a top-level job block, up to the next job at the same indent.
 * Line-based on purpose: the repo checks out CRLF on Windows, and a regex
 * terminator written as `:\n` silently never matches there — every block then
 * runs to the end of the file and any "job X does not contain Y" assertion
 * becomes meaningless (which is exactly what the control below caught).
 */
const lines = workflow.split(/\r?\n/);
const jobBlock = (name: string): string => {
  const start = lines.findIndex((line) => line.trimEnd() === `  ${name}:`);
  expect(start, `job "${name}" not found`).toBeGreaterThan(-1);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^ {2}[a-z][a-z0-9-]*:\s*$/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
};

/** The `needs: [...]` list of a job. */
const needsOf = (name: string): string[] => {
  const line = jobBlock(name).match(/needs:\s*\[([^\]]*)\]/);
  if (!line) return [];
  return line[1]
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

describe("release pipeline gating (R31-4)", () => {
  it("has the jobs the pipeline is built from", () => {
    for (const job of ["test", "lint", "e2e", "build", "deploy-demo", "publish"]) {
      expect(jobBlock(job).length).toBeGreaterThan(0);
    }
  });

  it("blocks the public site deploy on the e2e suite", () => {
    expect(needsOf("deploy-demo")).toContain("e2e");
  });

  it("blocks the npm publish on the e2e suite", () => {
    expect(needsOf("publish")).toContain("e2e");
  });

  it("still reaches e2e transitively from unit tests and lint (control)", () => {
    // build gates artifacts on the fast jobs; the slow gate is added at the
    // doors, so both remain required for anything public.
    const build = needsOf("build");
    expect(build).toContain("test");
    expect(build).toContain("lint");
    expect(needsOf("deploy-demo")).toContain("build");
    expect(needsOf("publish")).toContain("build");
  });

  it("runs e2e on both browser projects", () => {
    const e2e = jobBlock("e2e");
    expect(e2e).toContain("chromium");
    expect(e2e).toContain("mobile-safari");
  });
});

describe("npm provenance needs its token (R31-5)", () => {
  it("package.json really does ask for provenance", () => {
    expect(pkg.publishConfig?.provenance).toBe(true);
  });

  it("the publish job can mint one", () => {
    // Without id-token: write, `npm publish` fails rather than silently
    // publishing unattested.
    expect(jobBlock("publish")).toMatch(/id-token:\s*write/);
  });

  it("no other job hands out id-token unnecessarily (control)", () => {
    for (const job of ["test", "lint", "e2e", "build"]) {
      expect(jobBlock(job)).not.toMatch(/id-token:\s*write/);
    }
  });
});
