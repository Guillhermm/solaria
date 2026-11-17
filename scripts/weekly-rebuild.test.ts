import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/weekly-rebuild.yml", "utf8");

describe("weekly rebuild workflow", () => {
  it("runs every Monday and can be started by hand", () => {
    expect(workflow).toContain('cron: "0 6 * * 1"');
    expect(workflow).toContain("workflow_dispatch:");
  });

  it("passes the hook URL through the environment, never into the script text", () => {
    expect(workflow).toContain("HOOK: ${{ secrets.VERCEL_DEPLOY_HOOK }}");
    expect(workflow.match(/\$\{\{/g)).toHaveLength(1);
    expect(workflow).toContain('"$HOOK"');
  });

  it("asks for no token permissions", () => {
    expect(workflow).toContain("permissions: {}");
  });
});
