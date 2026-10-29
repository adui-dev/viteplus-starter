import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  createBatchPlan,
  executeBatch,
  loadBatchPlan,
  validateBatchConfig,
} from "../src/batch.mjs";
import { parseCliArgs } from "../src/cli-args.mjs";

const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
const config = {
  version: 1,
  name: "mixed-repo",
  apps: [
    { name: "admin", framework: "vue", ui: "tdesign", css: "unocss", uiSmoke: true },
    {
      name: "portal",
      framework: "react",
      language: "js",
      ui: "antd",
      css: "tailwindcss",
      uiSmoke: true,
    },
  ],
};
const quiet = () => {};

async function temporary(t) {
  const path = await mkdtemp(join(tmpdir(), "vp-batch- space & "));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}
async function fakeRoot(path) {
  await mkdir(join(path, "apps"), { recursive: true });
  await writeFile(
    join(path, "package.json"),
    JSON.stringify({ name: config.name, private: true, devDependencies: { "vite-plus": "1.4.0" } }),
  );
  await writeFile(join(path, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n  - packages/*\n");
  await writeFile(
    join(path, "vite.config.ts"),
    "export default defineConfig({fmt:{},run:{cache:true}})\n",
  );
}

test("批量配置严格校验版本、字段类型、重名及框架组合，语言默认 TS", () => {
  assert.equal(validateBatchConfig(config).apps[0].language, "ts");
  const bad = [
    null,
    [],
    {},
    { ...config, version: 2 },
    { ...config, apps: [] },
    { ...config, language: "ts" },
    { ...config, name: "../escape" },
    { ...config, name: "con" },
    { ...config, name: "website" },
    { ...config, name: "utils" },
    { ...config, apps: [...config.apps, config.apps[0]] },
    ...["website", "utils", "mixed-repo", "aux", "../escape"].map((name) => ({
      ...config,
      apps: [{ name, framework: "vue" }],
    })),
    ...[
      null,
      { name: "x", framework: "angular" },
      { name: "x", framework: "react", ui: "element-plus" },
      { name: "x", framework: "vue", language: null },
      { name: "x", framework: "vue", css: 0 },
      { name: "x", framework: "vue", uiSmoke: "true" },
      { name: "x", framework: "vue", uiSmoke: true },
      { name: "x", framework: "vue", command: "anything" },
    ].map((app) => ({ ...config, apps: [app] })),
    {
      ...config,
      apps: Array.from({ length: 33 }, (_, index) => ({ name: "app-" + index, framework: "vue" })),
    },
  ];
  for (const input of bad) assert.throws(() => validateBatchConfig(input));
});

test("dry-run 计划包含官方命令、应用依赖和验收文件，不写目标目录", async (t) => {
  const cwd = await temporary(t);
  const before = await readdir(cwd);
  const plan = await createBatchPlan(config, cwd);
  assert.equal(plan.steps.length, 5);
  assert.equal(plan.steps[0].args[1], "vite:monorepo");
  assert.ok(plan.steps[0].args.includes("--no-interactive"));
  assert.ok(plan.steps[0].args.includes("--git"));
  assert.deepEqual(plan.steps[1].official.args.slice(-3), ["--", "--template", "vue-ts"]);
  assert.deepEqual(plan.steps[3].official.args.slice(-3), ["--", "--template", "react"]);
  assert.ok(plan.steps[1].integrations.dependencies.includes("tdesign-vue-next"));
  assert.ok(plan.steps[3].integrations.dependencies.includes("antd"));
  assert.ok(plan.steps[4].files.includes("src/ui-smoke/SmokeApp.jsx"));
  assert.equal(plan.steps[1].official.args.includes("--git"), false);
  assert.deepEqual(await readdir(cwd), before);
  const minimal = await createBatchPlan(
    { version: 1, name: "minimal", apps: [{ name: "web", framework: "react" }] },
    cwd,
  );
  assert.equal(minimal.steps.length, 2);
  assert.equal(minimal.config.apps[0].uiSmoke, false);
  assert.equal(minimal.config.apps[0].ui, "none");
});

test("真实 CLI 支持带空格和元字符的配置路径及 BOM，拒绝混用参数", async (t) => {
  const cwd = await temporary(t);
  const filename = join(cwd, "batch & config.json");
  await writeFile(filename, "\uFEFF" + JSON.stringify(config));
  const run = (...extra) =>
    spawnSync(process.execPath, [cli, "--config", filename, ...extra], { cwd, encoding: "utf8" });
  const preview = run("--dry-run");
  assert.equal(preview.status, 0, preview.stderr);
  assert.equal(JSON.parse(preview.stdout).config.apps.length, 2);
  assert.deepEqual(await readdir(cwd), ["batch & config.json"]);
  for (const args of [
    ["--name", "other"],
    ["--workspace", "."],
    ["--ui-smoke"],
    ["--apply-existing"],
    ["--repair-existing"],
    ["--language", "ts"],
  ]) {
    const result = run(...args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /只能与 --dry-run/);
  }
  assert.throws(() => parseCliArgs(["--config"]));
  assert.throws(() => parseCliArgs(["--config", "a", "--config", "b"]));
  await writeFile(
    filename,
    JSON.stringify({
      ...config,
      apps: [...config.apps, { name: "bad-last", framework: "invalid" }],
    }),
  );
  const invalid = run();
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /framework/);
  assert.deepEqual(await readdir(cwd), ["batch & config.json"]);
});

test("配置读取拒绝非法 JSON、目录和超过 1 MiB 文件", async (t) => {
  const cwd = await temporary(t);
  const filename = join(cwd, "config.json");
  await writeFile(filename, "{ invalid");
  await assert.rejects(loadBatchPlan(filename, cwd), /有效 JSON/);
  await assert.rejects(loadBatchPlan(cwd, cwd), /JSON 文件/);
  await writeFile(filename, Buffer.alloc(1024 * 1024 + 1));
  await assert.rejects(loadBatchPlan(filename, cwd), /1 MiB/);
});

test("目标、悬空链接、已有工作区及其子目录预检失败，不覆盖现场", async (t) => {
  const cwd = await temporary(t);
  const destination = join(cwd, config.name);
  await mkdir(destination);
  await writeFile(join(destination, "keep.txt"), "keep");
  await assert.rejects(createBatchPlan(config, cwd), /已存在/);
  assert.equal(await readFile(join(destination, "keep.txt"), "utf8"), "keep");
  await rm(destination, { recursive: true });
  await symlink(
    join(cwd, "missing"),
    destination,
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(createBatchPlan(config, cwd), /已存在/);
  await rm(destination);
  await writeFile(join(cwd, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n");
  const child = join(cwd, "child");
  await mkdir(child);
  await assert.rejects(createBatchPlan(config, child), /工作区之外/);
  await rm(join(cwd, "pnpm-workspace.yaml"));
  await writeFile(join(cwd, "package.json"), JSON.stringify({ workspaces: ["apps/*"] }));
  await assert.rejects(createBatchPlan(config, child), /已有 workspace/);
});

test("执行顺序为根→应用→对应验收页；重新生成计划，不信任修改的命令", async (t) => {
  const cwd = await temporary(t);
  const plan = await createBatchPlan(config, cwd);
  plan.steps[0].args = ["unexpected"];
  const calls = [];
  let active = 0;
  const result = await executeBatch(
    plan,
    async (step) => {
      assert.equal(++active, 1);
      calls.push(step.kind + ":" + (step.name ?? config.name));
      if (step.kind === "workspace") {
        assert.equal(step.args[1], "vite:monorepo");
        await fakeRoot(step.target);
      }
      await Promise.resolve();
      active--;
    },
    quiet,
  );
  assert.deepEqual(calls, [
    "workspace:mixed-repo",
    "application:admin",
    "ui-smoke:admin",
    "application:portal",
    "ui-smoke:portal",
  ]);
  assert.equal(result.completed.length, 5);
});

test("后续应用失败立即停止，报告已完成/未执行，并保留部分生成文件", async (t) => {
  const cwd = await temporary(t);
  const plan = await createBatchPlan(config, cwd);
  const calls = [];
  await assert.rejects(
    executeBatch(
      plan,
      async (step) => {
        calls.push(step.label);
        if (step.kind === "workspace") await fakeRoot(step.target);
        if (step.kind === "application") {
          await mkdir(step.target);
          await writeFile(join(step.target, "keep.txt"), "partial");
          if (step.name === "portal") throw new Error("install failed");
        }
      },
      quiet,
    ),
    (error) => {
      assert.deepEqual(error.completed, ["工作区 mixed-repo", "应用 admin", "验收页 admin"]);
      assert.equal(error.failed, "应用 portal");
      assert.deepEqual(error.pending, ["验收页 portal"]);
      assert.match(error.message, /install failed/);
      return true;
    },
  );
  assert.equal(calls.length, 4);
  assert.equal(await readFile(join(plan.workspaceRoot, "apps/portal/keep.txt"), "utf8"), "partial");
});

test("根生成失败、生成后预检失败均不运行应用，也不清理现场", async (t) => {
  for (const mode of ["root-failure", "preflight-failure", "root-junction"]) {
    const cwd = await temporary(t);
    const plan = await createBatchPlan(config, cwd);
    let calls = 0;
    await assert.rejects(
      executeBatch(
        plan,
        async (step) => {
          calls++;
          if (mode === "root-junction") {
            const outside = join(cwd, "outside");
            await fakeRoot(outside);
            await symlink(outside, step.target, process.platform === "win32" ? "junction" : "dir");
          } else {
            await fakeRoot(step.target);
            if (mode === "root-failure") throw new Error("root failed");
            await mkdir(join(step.target, "apps/admin"));
          }
        },
        quiet,
      ),
      (error) => {
        assert.ok(error.pending.includes("应用 admin"));
        return true;
      },
    );
    assert.equal(calls, 1);
    assert.ok((await readdir(cwd)).includes(config.name));
  }
});

test("规划后目标被占用、末尾应用非法时，执行前拒绝且不启动子进程", async (t) => {
  const cwd = await temporary(t);
  const plan = await createBatchPlan(config, cwd);
  await mkdir(plan.workspaceRoot);
  let calls = 0;
  await assert.rejects(
    executeBatch(
      plan,
      () => {
        calls++;
      },
      quiet,
    ),
    /已存在/,
  );
  await rm(plan.workspaceRoot, { recursive: true });
  plan.config.apps[1].framework = "invalid";
  await assert.rejects(
    executeBatch(
      plan,
      () => {
        calls++;
      },
      quiet,
    ),
    /framework/,
  );
  assert.equal(calls, 0);
  assert.deepEqual(await readdir(cwd), []);
});

test("批量 UI Smoke 接受 Element Plus、Ant Design Vue 和 React TDesign，仍逐应用生成", async (t) => {
  const plan = await createBatchPlan(
    {
      version: 1,
      name: "ui-repo",
      apps: [
        { name: "element", framework: "vue", ui: "element-plus", uiSmoke: true },
        { name: "ant-vue", framework: "vue", ui: "antd", uiSmoke: true },
        { name: "td-react", framework: "react", ui: "tdesign", language: "js", uiSmoke: true },
      ],
    },
    await temporary(t),
  );
  const steps = plan.steps.filter((step) => step.files?.includes("ui-smoke.html"));
  assert.equal(steps.length, 3);
  assert.ok(steps[0].files.includes("src/ui-smoke/SmokeApp.vue"));
  assert.ok(steps[2].files.includes("src/ui-smoke/SmokeApp.jsx"));
});
