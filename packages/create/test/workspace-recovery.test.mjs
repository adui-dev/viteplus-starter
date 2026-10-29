import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readdir, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { planWorkspaceRecovery } from "../src/workspace-recovery.mjs";
import { parseCliArgs } from "../src/cli-args.mjs";
import { validateProjectOptions } from "../src/options.mjs";

async function fixture(t, apps) {
  const base = await mkdtemp(join(tmpdir(), "adui-recovery-plan-")),
    root = join(base, "repo");
  t.after(() => rm(base, { recursive: true, force: true }));
  await mkdir(join(root, "apps"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ name: "@repo/root", private: true, devDependencies: { "vite-plus": "1" } }),
  );
  await writeFile(join(root, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n  - packages/*\n");
  await writeFile(join(root, "vite.config.ts"), "export default defineConfig({})");
  const config = join(base, "expected.json");
  await writeFile(config, JSON.stringify({ version: 1, name: "repo", apps }));
  return { base, root, config };
}
async function app(root, name, complete) {
  const directory = join(root, "apps", name);
  await mkdir(join(directory, "src"), { recursive: true });
  await writeFile(
    join(directory, "package.json"),
    JSON.stringify({ name: "@repo/" + name, dependencies: { react: "19", "vite-plus": "1" } }),
  );
  await writeFile(join(directory, "keep.txt"), "original");
  if (complete)
    for (const file of ["index.html", "src/main.jsx", "vite.config.js"])
      await writeFile(join(directory, file), "original");
}

test("缺失可新建、已有仅验证、部分完成只人工处理，所有规划无写入", async (t) => {
  const apps = [
    { name: "new-app", framework: "react", language: "js", ui: "antd", uiSmoke: true },
    { name: "existing", framework: "react", language: "js" },
    { name: "partial", framework: "react", language: "js" },
  ];
  const { root, config } = await fixture(t, apps);
  await app(root, "existing", true);
  await app(root, "partial", false);
  const before = await readdir(join(root, "apps"));
  const report = await planWorkspaceRecovery(root, config);
  assert.equal(report.readOnly, true);
  assert.equal(report.ok, false);
  assert.deepEqual(
    report.apps.map((item) => item.action),
    ["create-missing", "validate-existing", "manual-review"],
  );
  const [create, existing, partial] = report.apps;
  assert.equal(create.steps.length, 2);
  assert.ok(create.steps[1].args.includes("--ui-smoke"));
  assert.ok(create.steps.every((step) => !step.args.includes("--apply-existing")));
  assert.deepEqual(
    existing.steps.map((step) => step.args),
    [["check"], ["run", "build"]],
  );
  assert.deepEqual(partial.steps, []);
  assert.ok(partial.reasons.some((reason) => reason.includes("src/main.jsx")));
  assert.deepEqual(await readdir(join(root, "apps")), before);
  assert.equal(await readFile(join(root, "apps/partial/keep.txt"), "utf8"), "original");
});

test("缺失目标仍检查作用域包名冲突，根问题阻塞全部操作", async (t) => {
  const { root, config } = await fixture(t, [{ name: "new-app", framework: "react" }]);
  await mkdir(join(root, "packages/other"), { recursive: true });
  await writeFile(
    join(root, "packages/other/package.json"),
    JSON.stringify({ name: "@repo/new-app" }),
  );
  let report = await planWorkspaceRecovery(root, config);
  assert.equal(report.apps[0].action, "manual-review");
  assert.deepEqual(report.apps[0].steps, []);
  assert.ok(report.apps[0].reasons.some((reason) => reason.includes("同名包")));
  await writeFile(join(root, "vite.config.js"), "original");
  report = await planWorkspaceRecovery(root, config);
  assert.ok(report.apps[0].reasons.includes("根 Vite 配置缺失或不唯一"));
});

test("多引擎/保护/设计尺寸原样进入新建命令，不将增强选项传给 UI 验收", async (t) => {
  const { root, config } = await fixture(t, [
    {
      name: "new-app",
      framework: "vue",
      language: "js",
      ui: "tdesign",
      css: "unocss",
      uiSmoke: true,
      screen: { designWidth: 1600, designHeight: 900, mode: "cover" },
      engines: ["cesium", "babylon"],
      modelProtection: "external",
    },
  ]);
  const report = await planWorkspaceRecovery(root, config);
  assert.equal(report.ok, true);
  const [create, smoke] = report.apps[0].steps;
  const options = validateProjectOptions(parseCliArgs(create.args.slice(1)));
  assert.deepEqual(options.engines, ["cesium", "babylon"]);
  assert.equal(options.modelProtection, "external");
  assert.deepEqual(options.screen, { designWidth: 1600, designHeight: 900, mode: "cover" });
  assert.ok(!smoke.args.includes("--engines"));
  assert.ok(!smoke.args.includes("--screen"));
  assert.deepEqual(await readdir(join(root, "apps")), []);
});

test("真实 CLI 只输出人工计划；无配置/混写选项拒绝；链接目录拒绝", async (t) => {
  const { root, config } = await fixture(t, [{ name: "new-app", framework: "react" }]);
  const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
  const run = (extra) =>
    spawnSync(process.execPath, [cli, "--plan-recovery", root, ...extra], { encoding: "utf8" });
  const result = run(["--config", config]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).mode, "manual-plan");
  assert.deepEqual(await readdir(join(root, "apps")), []);
  assert.equal(run([]).status, 1);
  assert.equal(run(["--config", config, "--apply-existing"]).status, 1);
  await symlink(root, join(root, "apps/link"), process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(planWorkspaceRecovery(root, config), /符号链接或 junction/);
});
