import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateProjectOptions } from "../src/options.mjs";
import { parseCliArgs } from "../src/cli-args.mjs";
import { createBatchPlan, validateBatchConfig } from "../src/batch.mjs";
test("引擎选项严格校验、默认不引入 Three；Monorepo 根与不支持引擎拒绝", () => {
  const base = { name: "demo", type: "application", framework: "vue" };
  assert.equal(validateProjectOptions(base).engine, undefined);
  assert.equal(validateProjectOptions({ ...base, engine: "none" }).engine, undefined);
  assert.equal(validateProjectOptions({ ...base, engine: "three" }).engine, "three");
  for (const engine of ["cesium", "three;echo", null, true, {}, ["three"]])
    assert.throws(() => validateProjectOptions({ ...base, engine }), /引擎/);
  assert.throws(
    () => validateProjectOptions({ name: "demo", type: "monorepo", engine: "three" }),
    /根不配置/,
  );
  assert.equal(parseCliArgs(["--engine", "three"]).engine, "three");
});
test("批量计划包含 Three 的文件依赖，UI 阶段不重复传引擎与大屏", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "three-options-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = {
    version: 1,
    name: "engine-demo",
    apps: [
      {
        name: "admin",
        framework: "vue",
        ui: "tdesign",
        screen: true,
        engine: "three",
        uiSmoke: true,
      },
      { name: "plain", framework: "react" },
    ],
  };
  const plan = await createBatchPlan(input, root);
  assert.ok(plan.steps[1].args.includes("--engine"));
  assert.ok(plan.steps[1].engine.files.includes("src/adui-three/lazy.mjs"));
  assert.equal(plan.steps[2].args.includes("--engine"), false);
  assert.equal(plan.steps[2].args.includes("--screen"), false);
  assert.equal(plan.steps[3].engine, undefined);
  assert.throws(
    () =>
      validateBatchConfig({
        ...input,
        apps: [{ name: "admin", framework: "vue", engine: "three" }],
      }),
    /同时配置 screen/,
  );
});
test("真实 CLI dry-run 列出 Three；缺大屏或混用维护模式在创建前拒绝", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "three-cli-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cli = new URL("../bin/cli.mjs", import.meta.url);
  const base = [
    fileURLToPath(cli),
    "--name",
    "demo",
    "--type",
    "application",
    "--framework",
    "react",
    "--engine",
    "three",
  ];
  const valid = spawnSync(process.execPath, [...base, "--screen", "--dry-run"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(valid.status, 0, valid.stderr);
  const plan = JSON.parse(valid.stdout);
  assert.equal(plan.engine.name, "three");
  assert.ok(plan.screen);
  for (const flags of [["--dry-run"], ["--ui-smoke"], ["--repair-existing"], ["--three-smoke"]]) {
    const result = spawnSync(process.execPath, [...base, ...flags], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
  }
});

test("组合补装遇到冲突 Three 版本时不先写大屏或改入口", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "three-preflight-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { mkdir, writeFile, readFile } = await import("node:fs/promises");
  const target = join(root, "demo");
  await mkdir(join(target, "src"), { recursive: true });
  const manifest = JSON.stringify({
    dependencies: { "vite-plus": "1.4.0", vue: "3", three: "0.150.0" },
  });
  await writeFile(join(target, "package.json"), manifest);
  await writeFile(join(target, "src/main.ts"), "original");
  await writeFile(join(target, "vite.config.ts"), "original config");
  const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
  const result = spawnSync(
    process.execPath,
    [
      cli,
      "--name",
      "demo",
      "--type",
      "application",
      "--framework",
      "vue",
      "--screen",
      "--engine",
      "three",
      "--apply-existing",
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /拒绝自动升级/);
  await assert.rejects(readFile(join(target, "screen-smoke.html")), { code: "ENOENT" });
  assert.equal(await readFile(join(target, "package.json"), "utf8"), manifest);
  assert.equal(await readFile(join(target, "src/main.ts"), "utf8"), "original");
});
