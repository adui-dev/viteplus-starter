import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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

test("官方步骤成功后的基础样式预检失败报告阶段，保留模板现场并停止 UI 安装", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "starter-stage-"));
  assert.equal(dirname(resolve(root)), resolve(tmpdir()));
  assert.ok(basename(root).startsWith("starter-stage-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH"),
  );
  env.PATH = "";
  for (const [framework, language, files, reason] of [
    ["vue", "ts", { "src/main.js": "// wrong language entry\n" }, /缺少应用文件/],
    [
      "react",
      "js",
      { "src/main.jsx": "// preserve entry\n", "src/styles/normalize.css": "/* occupied */\n" },
      /占用\/部分完成/,
    ],
  ]) {
    const cwd = join(root, framework);
    const target = join(cwd, "app");
    await mkdir(cwd);
    const preload = join(cwd, "preload.mjs");
    const trace = join(cwd, "calls.json");
    const baseline = join(cwd, "baseline.json");
    const templateFiles = {
      "package.json": JSON.stringify({ dependencies: { "vite-plus": "1", [framework]: "3" } }),
      "src/App.txt": "preserve simulated template\n",
      ...files,
    };
    await writeFile(
      preload,
      `
import childProcess from "node:child_process";
import {syncBuiltinESMExports} from "node:module";
import {mkdirSync, writeFileSync, readFileSync, readdirSync, statSync} from "node:fs";
import {join, dirname} from "node:path";
const target = ${JSON.stringify(target)};
const files = ${JSON.stringify(templateFiles)};
const calls = [];
childProcess.spawnSync = (command, args) => {
  calls.push({command, args: Array.isArray(args) ? args : []});
  writeFileSync(${JSON.stringify(trace)}, JSON.stringify(calls));
  const commandText = [command, ...(Array.isArray(args) ? args : [])].join(" ");
  if (calls.length !== 1 || !commandText.startsWith("vp create vite:application "))
    throw new Error("unexpected child command");
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(target, path)), {recursive: true});
    writeFileSync(join(target, path), content, {flag: "wx"});
  }
  const snapshot = readdirSync(target, {recursive: true}).sort().map(path => {
    const info = statSync(join(target, path));
    return {path, mtime: info.mtimeMs, content: info.isFile() ? readFileSync(join(target, path), "utf8") : null};
  });
  writeFileSync(${JSON.stringify(baseline)}, JSON.stringify(snapshot));
  return {status: 0};
};
syncBuiltinESMExports();
`,
    );
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        pathToFileURL(preload).href,
        cli,
        "--name",
        "app",
        "--type",
        "application",
        "--framework",
        framework,
        "--language",
        language,
        "--ui",
        "tdesign",
        "--css",
        "tailwindcss",
      ],
      { cwd, env, encoding: "utf8", timeout: 10000 },
    );
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /阶段：基础样式预检/);
    assert.match(result.stderr, /已完成：官方模板生成\n/);
    assert.ok(result.stderr.includes(target));
    assert.match(result.stderr, reason);
    assert.match(result.stderr, /不会自动删除、覆盖、回滚或续跑/);
    assert.doesNotMatch(result.stdout, /正在安装|创建完成/);
    const calls = JSON.parse(await readFile(trace, "utf8"));
    assert.equal(calls.length, 1);
    const snapshot = JSON.parse(await readFile(baseline, "utf8"));
    assert.deepEqual(
      (await readdir(target, { recursive: true })).sort(),
      snapshot.map((item) => item.path),
    );
    for (const item of snapshot) {
      const path = join(target, item.path);
      assert.equal((await stat(path)).mtimeMs, item.mtime);
      if (item.content !== null) assert.equal(await readFile(path, "utf8"), item.content);
    }
  }
});
