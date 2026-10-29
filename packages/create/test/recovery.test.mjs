import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createStageRunner, pendingRecovery } from "../src/recovery.mjs";

test("阶段报告只计入成功步骤，保留原因/退出码，不重试失败动作", async () => {
  const run = createStageRunner("D:/workspace/app");
  assert.equal(await run("官方模板生成", () => 42), 42);
  let calls = 0;
  const cause = Object.assign(new Error("install failed"), { exitCode: 7 });
  await assert.rejects(
    run("UI/CSS 集成", () => {
      calls++;
      throw cause;
    }),
    (error) => {
      assert.equal(error.cause, cause);
      assert.equal(error.exitCode, 7);
      assert.equal(error.failed, "UI/CSS 集成");
      assert.deepEqual(error.completed, ["官方模板生成"]);
      assert.match(error.message, /不会自动删除、覆盖、回滚或续跑/);
      assert.match(error.message, /D:\/workspace\/app/);
      return true;
    },
  );
  assert.equal(calls, 1);
  await assert.rejects(
    run("异常抛值", () => {
      throw "cancelled";
    }),
    /cancelled/,
  );
});

test("待执行指引保留 argv，PowerShell 单引号转义空格、引号及元字符", () => {
  const steps = [
    {
      label: "应用 app",
      cwd: "D:/root & 'x",
      command: "C:/Program Files/node.exe",
      args: ["a'b.mjs", "--workspace", "D:/root & $x;`test"],
    },
  ];
  const [hint] = pendingRecovery(steps);
  assert.deepEqual(hint.args, steps[0].args);
  assert.equal(
    hint.powershell,
    "& 'C:/Program Files/node.exe' 'a''b.mjs' '--workspace' 'D:/root & $x;`test'",
  );
  hint.args.push("changed");
  assert.equal(steps[0].args.length, 3);
});

test("真实 CLI 验收失败打印阶段与目标，退出非零且保留已有文件", async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), "adui-recovery-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const target = join(cwd, "app");
  await mkdir(target);
  await writeFile(
    join(target, "package.json"),
    JSON.stringify({ dependencies: { vue: "3", "vite-plus": "1" } }),
  );
  await writeFile(join(target, "keep.txt"), "original");
  const before = await readdir(target);
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("../bin/cli.mjs", import.meta.url)),
      "--name",
      "app",
      "--type",
      "application",
      "--framework",
      "vue",
      "--ui",
      "tdesign",
      "--ui-smoke",
    ],
    { cwd, encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /阶段：UI 验收页/);
  assert.ok(result.stderr.includes(target));
  assert.match(result.stderr, /已完成：无/);
  assert.deepEqual(await readdir(target), before);
  assert.equal(await readFile(join(target, "keep.txt"), "utf8"), "original");
});
