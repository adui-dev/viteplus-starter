import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planCesium, preflightCesium, addCesium } from "../src/cesium.mjs";
import { validateProjectOptions } from "../src/options.mjs";
import { createBatchPlan } from "../src/batch.mjs";
import { collectProjectOptions } from "../src/prompts.mjs";
const base = {
  name: "globe",
  type: "application",
  framework: "vue",
  screen: true,
  engine: "cesium",
};
test("交互选择 Cesium 后确认，不询问 Three 模型密钥策略", async () => {
  const answers = ["1", "3", "y"],
    questions = [];
  const selected = await collectProjectOptions(
    { name: "globe", framework: "vue", language: "ts", ui: "none", css: "none", screen: true },
    async (question) => {
      questions.push(question);
      return answers.shift();
    },
  );
  assert.equal(selected.engine, "cesium");
  assert.equal(selected.modelProtection, undefined);
  assert.ok(questions.some((question) => question.includes("[3] Cesium")));
  assert.ok(!questions.some((question) => question.startsWith("模型保护")));
  assert.equal(answers.length, 0);
});
test("Cesium 四种框架语言计划隔离，默认无模型保护与密钥", async () => {
  for (const framework of ["vue", "react"])
    for (const language of ["ts", "js"]) {
      const options = validateProjectOptions({ ...base, framework, language });
      assert.equal(options.modelProtection, undefined);
      const plan = await planCesium(options);
      assert.equal(plan.previewPath, "/cesium-smoke.html");
      assert.ok(plan.files["adui-cesium-build/vite.mjs"]);
      assert.ok(plan.files["src/adui-cesium/model.mjs"]);
      assert.ok(plan.files["src/adui-cesium/glb.mjs"]);
      assert.ok(plan.files["src/adui-cesium/adui.d.mts"]);
      assert.ok(!plan.files["src/adui-cesium/model.mjs"].includes("../../model-security/"));
      assert.match(
        plan.files["src/adui-cesium/demo.mjs"],
        /return import\(['"]\.\/scene\.mjs['"]\)/,
      );
      assert.ok(
        !Object.keys(plan.files).some(
          (name) =>
            name.startsWith("src/main.") || name.startsWith("src/App.") || name.includes(".env"),
        ),
      );
    }
  assert.throws(
    () => validateProjectOptions({ ...base, modelProtection: "embedded" }),
    /需要 engine=three/,
  );
});
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "cesium-preset-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "src/adui-screen"), { recursive: true });
  await writeFile(join(root, "src/main.ts"), "// official entry");
  for (const name of ["core.mjs", "controller.mjs", "vue.mjs", "config.ts"])
    await writeFile(join(root, "src/adui-screen", name), "");
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ dependencies: { vue: "3", "vite-plus": "1" } }),
  );
  await writeFile(
    join(root, "vite.config.ts"),
    'import {defineConfig} from "vite-plus";export default defineConfig({server:{port:4321},plugins:[]})',
  );
  return root;
}
test("Cesium 安装备份原配置、保留字段；重复与安装期间变化拒绝", async (t) => {
  const root = await fixture(t),
    original = await readFile(join(root, "vite.config.ts"), "utf8");
  const calls = [];
  await addCesium(root, base, async (_cwd, args) => {
    calls.push(args);
  });
  assert.equal(await readFile(join(root, "vite.config.ts.before-adui-cesium"), "utf8"), original);
  assert.match(await readFile(join(root, "vite.config.ts"), "utf8"), /server:\{port:4321\}/);
  assert.deepEqual(calls[0], ["add", "cesium@1.146.0", "--save-exact"]);
  await assert.rejects(
    addCesium(root, base, () => assert.fail("must not install")),
    /已存在/,
  );
  const changed = await fixture(t);
  await assert.rejects(
    addCesium(changed, base, async () => {
      await writeFile(join(changed, "vite.config.ts"), "user config");
    }),
    /配置|变化/,
  );
  assert.equal(await readFile(join(changed, "vite.config.ts"), "utf8"), "user config");
});
test("Cesium 冲突版本与祖先 junction 在安装前拒绝", async (t) => {
  const root = await fixture(t);
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ dependencies: { vue: "3", "vite-plus": "1", cesium: "1.100.0" } }),
  );
  await assert.rejects(preflightCesium(root, base), /未经验证/);
  const linked = await fixture(t),
    outside = await mkdtemp(join(tmpdir(), "cesium-outside-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await symlink(outside, join(linked, "src/adui-cesium"), "junction");
  await assert.rejects(preflightCesium(linked, base), /junction/);
});
test("Cesium catalog 根据本应用已安装版本检查，不执行依赖入口", async (t) => {
  const root = await fixture(t);
  const versions = { cesium: "1.146.0", "vite-plugin-static-copy": "4.1.1" };
  for (const [name, version] of Object.entries(versions)) {
    const dir = join(root, "node_modules", name);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name, version, exports: "./index.cjs" }),
    );
    await writeFile(join(dir, "index.cjs"), "throw Error('must not execute')");
  }
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      dependencies: {
        vue: "3",
        "vite-plus": "catalog:",
        cesium: "catalog:",
        "vite-plugin-static-copy": "catalog:",
      },
    }),
  );
  await preflightCesium(root, base);
  await writeFile(
    join(root, "node_modules/cesium/package.json"),
    JSON.stringify({ name: "cesium", version: "1.100.0", exports: "./index.cjs" }),
  );
  await assert.rejects(preflightCesium(root, base), /未经验证/);
});
test("批量 Cesium 与 Three 按应用隔离依赖及模型策略", async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), "cesium-batch-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const plan = await createBatchPlan(
    {
      version: 1,
      name: "globe-workspace",
      apps: [
        { name: "globe", framework: "vue", engine: "cesium", screen: true },
        { name: "model", framework: "react", engine: "three", screen: true },
      ],
    },
    cwd,
  );
  assert.deepEqual(plan.steps[1].engine.dependencies, ["cesium@1.146.0"]);
  assert.equal(plan.steps[1].modelProtection, undefined);
  assert.deepEqual(plan.steps[2].engine.dependencies, ["three@0.186.1"]);
  assert.equal(plan.steps[2].modelProtection.mode, "embedded");
});
