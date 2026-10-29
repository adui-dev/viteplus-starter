import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { executeWorkspaceRecovery } from "../src/workspace-recovery-execute.mjs";
import { parseCliArgs } from "../src/cli-args.mjs";
import { planUiSmoke } from "../src/ui-smoke.mjs";

async function fixture(t, uiSmoke = false) {
  const base = await mkdtemp(join(tmpdir(), "adui-execute-")),
    root = join(base, "repo");
  t.after(() => rm(base, { recursive: true, force: true }));
  await mkdir(join(root, "apps"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ name: "repo", private: true, devDependencies: { "vite-plus": "1" } }),
  );
  await writeFile(join(root, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n  - packages/*\n");
  await writeFile(join(root, "vite.config.ts"), "export default defineConfig({})");
  const config = join(base, "config.json");
  const apps = [
    { name: "existing", framework: "react", language: "js" },
    {
      name: "first",
      framework: "react",
      language: "js",
      ...(uiSmoke ? { ui: "antd", uiSmoke: true } : {}),
    },
    { name: "second", framework: "react", language: "js" },
  ];
  await writeFile(config, JSON.stringify({ version: 1, name: "repo", apps }));
  await createApp(join(root, "apps/existing"));
  return { root, config };
}
async function createApp(target, ui = "none") {
  await mkdir(join(target, "src"), { recursive: true });
  await writeFile(
    join(target, "package.json"),
    JSON.stringify({
      name: target.split(/[\\/]/).at(-1),
      dependencies: { react: "19", "vite-plus": "1", ...(ui === "antd" ? { antd: "6" } : {}) },
    }),
  );
  for (const file of ["index.html", "src/main.jsx", "vite.config.js"])
    await writeFile(join(target, file), "original");
}
const quiet = () => {};
test("重新检查后按序仅创建缺失应用，UI 逐项检查，重复执行只跳过已有应用", async (t) => {
  const { root, config } = await fixture(t, true),
    calls = [];
  const before = await readFile(join(root, "apps/existing/package.json"), "utf8");
  const result = await executeWorkspaceRecovery(
    root,
    config,
    async (step) => {
      calls.push(step.label);
      const options = parseCliArgs(step.args.slice(1));
      if (options.uiSmoke) {
        for (const [path, source] of Object.entries(planUiSmoke(options).files)) {
          await mkdir(join(step.target, path, ".."), { recursive: true });
          await writeFile(join(step.target, path), source);
        }
      } else await createApp(step.target, options.ui);
    },
    quiet,
  );
  assert.deepEqual(calls, ["新建应用 first", "UI 验收页 first", "新建应用 second"]);
  assert.deepEqual(result.skipped, ["existing"]);
  assert.equal(result.completed.length, 3);
  assert.equal(await readFile(join(root, "apps/existing/package.json"), "utf8"), before);
  const again = await executeWorkspaceRecovery(
    root,
    config,
    () => assert.fail("不得重建已有应用"),
    quiet,
  );
  assert.deepEqual(again.completed, []);
  assert.equal(again.skipped.length, 3);
});

test("失败保留部分文件并停止，已有部分完成应用在执行前全量阻塞", async (t) => {
  const { root, config } = await fixture(t);
  let calls = 0;
  await assert.rejects(
    executeWorkspaceRecovery(
      root,
      config,
      async (step) => {
        calls++;
        await mkdir(step.target);
        await writeFile(join(step.target, "keep.txt"), "partial");
        throw Error("install failed");
      },
      quiet,
    ),
    (error) => {
      assert.equal(error.failed, "新建应用 first");
      assert.deepEqual(error.completed, []);
      return true;
    },
  );
  assert.equal(calls, 1);
  assert.equal(await readFile(join(root, "apps/first/keep.txt"), "utf8"), "partial");
  await assert.rejects(
    executeWorkspaceRecovery(root, config, () => assert.fail("预检阻塞不能启动子进程"), quiet),
    /人工阻塞/,
  );
  assert.ok(!(await readdir(join(root, "apps"))).includes("second"));
});

test("执行中占用后续目标，或 UI 输出出现冲突，均不覆盖且不继续", async (t) => {
  for (const conflict of ["next-target", "ui-output"]) {
    const { root, config } = await fixture(t, conflict === "ui-output");
    let calls = 0;
    await assert.rejects(
      executeWorkspaceRecovery(
        root,
        config,
        async (step) => {
          calls++;
          await createApp(step.target, conflict === "ui-output" ? "antd" : "none");
          if (conflict === "next-target") await mkdir(join(root, "apps/second"));
          else await writeFile(join(step.target, "ui-smoke.html"), "user content");
        },
        quiet,
      ),
    );
    assert.equal(calls, 1);
    if (conflict === "ui-output")
      assert.equal(await readFile(join(root, "apps/first/ui-smoke.html"), "utf8"), "user content");
  }
});

test("子进程即使返回成功，缺失结构仍停止；CLI 缺配置/混写模式拒绝", async (t) => {
  const { root, config } = await fixture(t);
  let calls = 0;
  await assert.rejects(
    executeWorkspaceRecovery(
      root,
      config,
      () => {
        calls++;
      },
      quiet,
    ),
    /结构检查未通过/,
  );
  assert.equal(calls, 1);
  const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
  for (const args of [
    [],
    ["--config", config, "--dry-run"],
    ["--config", config, "--plan-recovery", root],
  ]) {
    const result = spawnSync(process.execPath, [cli, "--execute-recovery", root, ...args], {
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
  }
  assert.deepEqual(await readdir(join(root, "apps")), ["existing"]);
});
