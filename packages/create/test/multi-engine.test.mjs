import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { validateProjectOptions } from "../src/options.mjs";
import { runMultiEngine } from "../src/multi-engine.mjs";
import { createBatchPlan } from "../src/batch.mjs";
import { planEngine } from "../src/engine.mjs";
import { validateThreeTarget } from "../src/three-smoke.mjs";
const base = {
  name: "multi-engine-new",
  type: "application",
  framework: "vue",
  screen: true,
  engines: ["babylon", "three", "cesium"],
};
test("多引擎只向一个模型适配阶段传递保护，Cesium/Babylon 组合选择 Babylon", async () => {
  for (const engines of [
    ["cesium", "babylon"],
    ["three", "babylon"],
    ["cesium"],
    ["three", "cesium", "babylon"],
  ]) {
    const calls = [];
    const options = { ...base, engines };
    const plan = await runMultiEngine({ ...options, dryRun: true });
    assert.equal(
      plan.modelProtection.engine,
      engines.includes("three") ? "three" : engines.includes("babylon") ? "babylon" : "cesium",
    );
    await runMultiEngine(options, async (argv) => calls.push(argv));
    const protectedCalls = calls.filter(
      (argv) => argv[argv.indexOf("--model-protection") + 1] === "embedded",
    );
    assert.equal(protectedCalls.length, 1);
    assert.equal(
      protectedCalls[0][protectedCalls[0].indexOf("--engine") + 1],
      plan.modelProtection.engine,
    );
  }
});
test("七种非空引擎子集覆盖四种框架语言，计划文件无冲突", async () => {
  for (let mask = 1; mask < 8; mask++)
    for (const framework of ["vue", "react"])
      for (const language of ["ts", "js"]) {
        const engines = ["three", "cesium", "babylon"].filter(
          (_name, index) => mask & (1 << index),
        );
        const normalized = validateProjectOptions({ ...base, framework, language, engines });
        assert.deepEqual(validateProjectOptions(normalized), normalized);
        const plan = await planEngine(normalized);
        assert.equal(plan.previews.length, engines.length);
        assert.equal(new Set(plan.files).size, plan.files.length);
      }
});
test("后续引擎输出冲突在首阶段写入前拒绝", async (t) => {
  const parent = await mkdtemp(join(tmpdir(), "multi-conflict-")),
    root = join(parent, "demo"),
    cwd = process.cwd();
  t.after(async () => {
    process.chdir(cwd);
    await rm(parent, { recursive: true, force: true });
  });
  await mkdir(join(root, "src/adui-screen"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ dependencies: { vue: "3", "vite-plus": "1" } }),
  );
  await writeFile(join(root, "src/main.ts"), "");
  for (const name of ["core.mjs", "controller.mjs", "style.css", "vue.mjs", "config.ts"])
    await writeFile(join(root, "src/adui-screen", name), "");
  await writeFile(
    join(root, "vite.config.ts"),
    'import {defineConfig} from "vite-plus";export default defineConfig({plugins:[]})',
  );
  await writeFile(join(root, "babylon-smoke.html"), "user file");
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      dependencies: { vue: "3", "vite-plus": "1", three: "catalog:", "@types/three": "catalog:" },
    }),
  );
  for (const [name, version] of [
    ["three", "0.186.1"],
    ["@types/three", "0.186.0"],
  ]) {
    await mkdir(join(root, "node_modules", name), { recursive: true });
    await writeFile(
      join(root, "node_modules", name, "package.json"),
      JSON.stringify({ name, version }),
    );
  }
  assert.equal(
    (await validateThreeTarget(root, { name: "demo", type: "application", framework: "vue" }))
      .three,
    "0.186.1",
  );
  process.chdir(parent);
  let runs = 0;
  await assert.rejects(
    runMultiEngine(
      { ...base, name: "demo", screen: undefined, applyExisting: true, modelProtection: "none" },
      async () => {
        runs++;
      },
    ),
    (error) => {
      assert.match(error.message, /已存在/);
      assert.equal(error.failed, "补装预检");
      assert.equal(error.target, root);
      assert.deepEqual(error.completed, []);
      assert.ok(error.cause instanceof Error);
      return true;
    },
  );
  assert.equal(runs, 0);
  await assert.rejects(stat(join(root, "three-smoke.html")), { code: "ENOENT" });
});
test("多引擎规范排序、兼容单选并拒绝歧义与非法列表", () => {
  assert.deepEqual(validateProjectOptions(base).engines, ["three", "cesium", "babylon"]);
  assert.equal(validateProjectOptions(base).modelProtection, "embedded");
  for (const engines of [[], ["none"], ["three", "three"], "three", null, [true]])
    assert.throws(() => validateProjectOptions({ ...base, engines }));
  assert.throws(() => validateProjectOptions({ ...base, engine: "three" }));
  assert.throws(() => validateProjectOptions({ ...base, type: "monorepo" }));
});
test("多引擎计划不写文件，只有第一阶段创建基础工程和大屏，失败停止", async () => {
  const preview = await runMultiEngine({ ...base, dryRun: true });
  assert.equal(preview.official.args[1], "vite:application");
  assert.equal(preview.engine.entry, "/");
  assert.equal(preview.engine.previews, undefined);
  const calls = [];
  const completed = await runMultiEngine(base, async (argv) => calls.push(argv));
  assert.ok(completed.engine.files.includes("src/plugins/three/lazy.mjs"));
  assert.equal(completed.engine.previews, undefined);
  assert.ok(calls[0].includes("--screen"));
  assert.ok(!calls[0].includes("--apply-existing"));
  assert.ok(calls[1].includes("--apply-existing"));
  assert.ok(!calls[1].includes("--screen"));
  assert.equal(calls[1][calls[1].indexOf("--model-protection") + 1], "none");
  let count = 0;
  await assert.rejects(
    runMultiEngine(base, async () => {
      if (++count === 2) throw Error("failed");
    }),
    /cesium/,
  );
  assert.equal(count, 2);
});

test("多引擎真实 CLI 保留子阶段退出码，启动或信号失败返回 1，并停止后续阶段", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "multi-exit-"));
  assert.equal(dirname(resolve(root)), resolve(tmpdir()));
  assert.ok(basename(root).startsWith("multi-exit-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH"),
  );
  env.PATH = "";
  for (const [index, scenario] of [
    { at: 1, status: 17, expected: 17 },
    { at: 2, status: 23, expected: 23 },
    { at: 1, status: null, signal: "SIGTERM", expected: 1 },
    { at: 1, launchError: true, expected: 1 },
  ].entries()) {
    const cwd = join(root, String(index));
    await mkdir(cwd);
    const preload = join(cwd, "preload.mjs");
    const trace = join(cwd, "calls.json");
    await writeFile(
      preload,
      `
import childProcess from "node:child_process";
import {syncBuiltinESMExports} from "node:module";
import {mkdirSync, writeFileSync} from "node:fs";
const scenario = ${JSON.stringify(scenario)};
const calls = [];
childProcess.spawnSync = (command, args) => {
  if (command !== process.execPath || args[0] !== ${JSON.stringify(cli)} || !args.includes("--engine"))
    throw new Error("unexpected child command");
  calls.push(args[args.indexOf("--engine") + 1]);
  writeFileSync(${JSON.stringify(trace)}, JSON.stringify(calls));
  if (calls.length < scenario.at) {
    mkdirSync(${JSON.stringify(join(cwd, "failure-app"))});
    writeFileSync(${JSON.stringify(join(cwd, "failure-app/completed-stage.txt"))}, "preserve completed stage");
    mkdirSync(${JSON.stringify(join(cwd, "failure-app/src"))});
    writeFileSync(${JSON.stringify(join(cwd, "failure-app/src/App.vue"))}, "preserve official App fixture");
    return {status: 0};
  }
  if (scenario.launchError) return {error: new Error("controlled launch failure")};
  return {status: scenario.status, signal: scenario.signal ?? null};
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
        "failure-app",
        "--type",
        "application",
        "--framework",
        "vue",
        "--screen",
        "--engines",
        "three,cesium,babylon",
        "--model-protection",
        "none",
      ],
      { cwd, env, encoding: "utf8", timeout: 10000 },
    );
    assert.equal(result.status, scenario.expected, result.stderr);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /多引擎阶段失败/);
    assert.match(result.stderr, scenario.at === 2 ? /cesium/ : /three/);
    assert.deepEqual(
      JSON.parse(await readFile(trace, "utf8")),
      ["three", "cesium"].slice(0, scenario.at),
    );
    if (scenario.at === 2) {
      assert.equal(
        await readFile(join(cwd, "failure-app/completed-stage.txt"), "utf8"),
        "preserve completed stage",
      );
      assert.deepEqual((await readdir(cwd)).sort(), ["calls.json", "failure-app", "preload.mjs"]);
    } else {
      assert.deepEqual((await readdir(cwd)).sort(), ["calls.json", "preload.mjs"]);
    }
  }
});
test("批量多引擎计划隔离应用，保留旧 engine 参数", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "multi-plan-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const plan = await createBatchPlan(
    {
      version: 1,
      name: "multi-workspace",
      apps: [
        { name: "mixed", framework: "react", screen: true, engines: ["cesium", "babylon"] },
        { name: "plain", framework: "vue" },
      ],
    },
    root,
  );
  assert.ok(plan.steps[1].args.includes("--engines"));
  assert.equal(plan.steps[1].engine.names.length, 2);
  assert.equal(plan.steps[2].engine, undefined);
});
