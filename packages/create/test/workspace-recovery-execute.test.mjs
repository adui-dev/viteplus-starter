import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, lstat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { executeWorkspaceRecovery } from "../src/workspace-recovery-execute.mjs";
import { parseCliArgs } from "../src/cli-args.mjs";
import { planUiSmoke } from "../src/ui-smoke.mjs";

async function fixture(t, uiSmoke = false) {
  const base = await mkdtemp(join(tmpdir(), "adui-execute-")),
    root = join(base, "repo");
  assert.equal(dirname(resolve(base)), resolve(tmpdir()));
  assert.ok(basename(base).startsWith("adui-execute-"));
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

test("恢复创建与 UI 阶段保留有效退出码，拒绝无效码并保留错误上下文", async (t) => {
  for (const [ui, code] of [
    [false, 7],
    [true, 9],
    ...[undefined, 0, -1, 1.5, "9"].map((code) => [false, code]),
  ]) {
    const { root, config } = await fixture(t, ui);
    const cause = Object.assign(new Error("controlled failure"), { exitCode: code });
    const calls = [];
    await assert.rejects(
      executeWorkspaceRecovery(
        root,
        config,
        async (step) => {
          calls.push(step.label);
          if (ui && step.label === "新建应用 first") await createApp(step.target, "antd");
          else throw cause;
        },
        quiet,
      ),
      (error) => {
        assert.equal(error.cause, cause);
        assert.equal(error.exitCode, [7, 9].includes(code) ? code : undefined);
        assert.equal(error.failed, ui ? "UI 验收页 first" : "新建应用 first");
        assert.deepEqual(error.completed, ui ? ["新建应用 first"] : []);
        assert.deepEqual(error.skipped, ["existing"]);
        return true;
      },
    );
    assert.deepEqual(calls, ui ? ["新建应用 first", "UI 验收页 first"] : ["新建应用 first"]);
    assert.ok(!(await readdir(join(root, "apps"))).includes("second"));
  }
});

test(
  "Windows 恢复 CLI 保留应用退出码，已有应用不变且部分失败重试阻塞",
  { skip: process.platform !== "win32" },
  async (t) => {
    const { root, config } = await fixture(t);
    const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
    const shim = join(dirname(root), "shims");
    await mkdir(shim);
    const fake = join(shim, "fake-vp.mjs"),
      log = join(shim, "calls.jsonl");
    await writeFile(
      fake,
      `
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join, resolve } from "node:path";
const args=process.argv.slice(2);
if(args[1]!=="vite:application") throw new Error("unexpected command");
appendFileSync(${JSON.stringify(log)},JSON.stringify(args)+"\\n");
const target=resolve(args[args.indexOf("--directory")+1]);
mkdirSync(target,{recursive:true});
writeFileSync(join(target,"keep.txt"),"partial");
process.exit(13);
`,
    );
    await writeFile(join(shim, "vp.cmd"), `@echo off\r\n"${process.execPath}" "${fake}" %*\r\n`);
    const paths = [
      config,
      ...[
        "package.json",
        "pnpm-workspace.yaml",
        "vite.config.ts",
        "apps/existing/package.json",
        "apps/existing/index.html",
        "apps/existing/src/main.jsx",
        "apps/existing/vite.config.js",
      ].map((path) => join(root, path)),
    ];
    const snapshot = () =>
      Promise.all(
        paths.map(async (path) => ({
          path,
          mtime: (await lstat(path)).mtimeMs,
          content: await readFile(path),
        })),
      );
    const before = await snapshot();
    const env = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH"),
      ),
      PATH: shim,
    };
    const run = () =>
      spawnSync(process.execPath, [cli, "--execute-recovery", root, "--config", config], {
        env,
        encoding: "utf8",
        timeout: 10000,
      });
    const failed = run();
    assert.equal(failed.status, 13, failed.stderr);
    assert.match(failed.stderr, /恢复执行失败：新建应用 first/);
    assert.match(failed.stderr, /已完成子进程：无/);
    const firstLog = await readFile(log, "utf8");
    const args = JSON.parse(firstLog.trim());
    assert.equal(args[args.indexOf("--directory") + 1], "apps/first");
    assert.deepEqual((await readdir(join(root, "apps"))).sort(), ["existing", "first"]);
    assert.equal(await readFile(join(root, "apps/first/keep.txt"), "utf8"), "partial");
    const retry = run();
    assert.equal(retry.status, 1, retry.stderr);
    assert.match(retry.stderr, /人工阻塞/);
    assert.equal(await readFile(log, "utf8"), firstLog);
    assert.deepEqual(await snapshot(), before);
  },
);
