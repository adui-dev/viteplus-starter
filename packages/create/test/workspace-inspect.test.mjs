import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { inspectWorkspace } from "../src/workspace-inspect.mjs";
import { planUiSmoke } from "../src/ui-smoke.mjs";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "adui-inspect-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "apps/vue-app/src"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ name: "repo", private: true, devDependencies: { "vite-plus": "1" } }),
  );
  await writeFile(join(root, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n  - packages/*\n");
  await writeFile(join(root, "vite.config.ts"), "throw new Error('must not execute config')");
  const app = join(root, "apps/vue-app");
  await writeFile(
    join(app, "package.json"),
    JSON.stringify({
      name: "vue-app",
      dependencies: {
        vue: "3",
        "vite-plus": "1",
        "tdesign-vue-next": "1",
        "unplugin-vue-components": "1",
        "@tdesign-vue-next/auto-import-resolver": "1",
      },
      scripts: { secret: "DO_NOT_OUTPUT" },
    }),
  );
  for (const path of ["index.html", "src/main.js", "vite.config.js"])
    await writeFile(join(app, path), "original");
  await writeFile(join(app, ".env.local"), "DO_NOT_OUTPUT_ENV");
  const config = join(root, "expected.json");
  await writeFile(
    config,
    JSON.stringify({
      version: 1,
      name: "repo",
      apps: [
        { name: "vue-app", framework: "vue", language: "js", ui: "tdesign", uiSmoke: true },
        { name: "react-app", framework: "react" },
      ],
    }),
  );
  return { root, app, config };
}

test("只读清单不执行 Vite 配置、不输出脚本或 env，预检区分缺失预设和未创建应用", async (t) => {
  const { root, app, config } = await fixture(t);
  const before = await readdir(root),
    manifest = await readFile(join(app, "package.json"), "utf8");
  const inventory = await inspectWorkspace(root);
  assert.equal(inventory.ok, true);
  assert.equal(inventory.readOnly, true);
  assert.ok(!JSON.stringify(inventory).includes("DO_NOT_OUTPUT"));
  const report = await inspectWorkspace(root, config);
  assert.equal(report.ok, false);
  assert.equal(report.apps[0].status, "blocked");
  assert.ok(report.apps[0].issues.includes("缺少文件：ui-smoke.html"));
  assert.equal(report.apps[1].status, "not-created");
  const plan = planUiSmoke({
    name: "vue-app",
    type: "application",
    framework: "vue",
    language: "js",
    ui: "tdesign",
  });
  for (const [path, source] of Object.entries(plan.files)) {
    await mkdir(join(app, path, ".."), { recursive: true });
    await writeFile(join(app, path), source);
  }
  const complete = await inspectWorkspace(root, config);
  assert.equal(complete.apps[0].status, "present");
  assert.deepEqual(await readdir(root), before);
  assert.equal(await readFile(join(app, "package.json"), "utf8"), manifest);
});

test("重复包名、损坏清单、错误语言入口和多个配置均阻塞", async (t) => {
  const { root, app, config } = await fixture(t);
  await mkdir(join(root, "packages/duplicate"), { recursive: true });
  await writeFile(
    join(root, "packages/duplicate/package.json"),
    JSON.stringify({ name: "vue-app" }),
  );
  await writeFile(join(app, "vite.config.ts"), "original");
  await writeFile(
    config,
    JSON.stringify({
      version: 1,
      name: "repo",
      apps: [{ name: "vue-app", framework: "vue", language: "ts" }],
    }),
  );
  const report = await inspectWorkspace(root, config);
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((issue) => issue.includes("重复包名")));
  assert.ok(report.apps[0].issues.includes("缺少文件：src/main.ts"));
  assert.ok(report.apps[0].issues.includes("应用 Vite 配置缺失或不唯一"));
  await writeFile(join(root, "packages/duplicate/package.json"), JSON.stringify({ name: "repo" }));
  assert.ok((await inspectWorkspace(root)).issues.includes("工作区存在重复包名：repo"));
  await writeFile(join(app, "package.json"), "invalid json");
  assert.equal((await inspectWorkspace(root)).members[0].problems[0], "清单缺失或无效");
});

test("拒绝目录 junction 与配置中的路径遍历", async (t) => {
  const { root, config } = await fixture(t);
  await writeFile(
    config,
    JSON.stringify({ version: 1, name: "repo", apps: [{ name: "../outside", framework: "vue" }] }),
  );
  await assert.rejects(inspectWorkspace(root, config));
  const outside = await mkdtemp(join(tmpdir(), "adui-inspect-outside-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await writeFile(join(outside, "keep.txt"), "original");
  await symlink(
    outside,
    join(root, "apps/linked"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(inspectWorkspace(root), /符号链接或 junction/);
  assert.equal(await readFile(join(outside, "keep.txt"), "utf8"), "original");
});

test("CLI 输出 JSON，阻塞退出 1，禁止与写入选项混用", async (t) => {
  const { root, config } = await fixture(t);
  const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
  const result = spawnSync(
    process.execPath,
    [cli, "--inspect-workspace", root, "--config", config],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).readOnly, true);
  const success = spawnSync(process.execPath, [cli, "--inspect-workspace", root], {
    encoding: "utf8",
  });
  assert.equal(success.status, 0);
  assert.equal(JSON.parse(success.stdout).ok, true);
  const invalid = spawnSync(
    process.execPath,
    [cli, "--inspect-workspace", root, "--apply-existing"],
    { encoding: "utf8" },
  );
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /仅能与 --config 同用/);
  assert.equal(invalid.stdout, "");
});
