import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planBabylon, preflightBabylon, addBabylon } from "../src/babylon.mjs";
import { validateProjectOptions } from "../src/options.mjs";
import { createBatchPlan } from "../src/batch.mjs";
import { collectProjectOptions } from "../src/prompts.mjs";
const base = {
  name: "cube",
  type: "application",
  framework: "vue",
  screen: true,
  engine: "babylon",
};
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "babylon-preset-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "src/adui-screen"), { recursive: true });
  for (const name of ["core.mjs", "controller.mjs", "vue.mjs", "config.ts"])
    await writeFile(join(root, "src/adui-screen", name), "");
  await writeFile(join(root, "src/main.ts"), "original entry");
  await writeFile(join(root, "vite.config.ts"), "original config");
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ dependencies: { vue: "3", "vite-plus": "1" } }),
  );
  return root;
}
test("Babylon 四种框架语言只计划本引擎，无密钥或配置覆盖", async () => {
  for (const framework of ["vue", "react"])
    for (const language of ["ts", "js"]) {
      const options = validateProjectOptions({ ...base, framework, language }),
        plan = await planBabylon(options);
      assert.equal(options.modelProtection, "embedded");
      assert.equal(plan.previewPath, "/babylon-smoke.html");
      assert.ok(plan.files["src/adui-babylon/scene.mjs"]);
      assert.ok(
        !Object.keys(plan.files).some(
          (path) =>
            path.startsWith("src/main.") || path.startsWith("vite.config") || path.includes(".env"),
        ),
      );
    }
  assert.equal(
    validateProjectOptions({ ...base, modelProtection: "external" }).modelProtection,
    "external",
  );
});
test("Babylon 增量安装保留官方入口与配置，重复和安装期间输出冲突拒绝", async (t) => {
  const root = await fixture(t),
    calls = [];
  await addBabylon(root, base, async (_cwd, args) => calls.push(args));
  assert.deepEqual(calls[0], ["add", "@babylonjs/core@9.32.1", "--save-exact"]);
  assert.deepEqual(calls[1], ["add", "@babylonjs/loaders@9.32.1", "--save-exact"]);
  assert.equal(await readFile(join(root, "src/main.ts"), "utf8"), "original entry");
  assert.equal(await readFile(join(root, "vite.config.ts"), "utf8"), "original config");
  await assert.rejects(
    addBabylon(root, base, () => assert.fail()),
    /已存在/,
  );
  const changed = await fixture(t);
  await assert.rejects(
    addBabylon(changed, base, async () => {
      await writeFile(join(changed, "babylon-smoke.html"), "user file");
    }),
    /已存在/,
  );
  assert.equal(await readFile(join(changed, "babylon-smoke.html"), "utf8"), "user file");
});
test("Babylon 版本冲突和输出祖先链接在安装前拒绝，catalog 校验实际版本", async (t) => {
  const root = await fixture(t),
    manifest = join(root, "package.json");
  await writeFile(
    manifest,
    JSON.stringify({ dependencies: { vue: "3", "vite-plus": "1", "@babylonjs/core": "8.0.0" } }),
  );
  await assert.rejects(preflightBabylon(root, base), /未经验证/);
  await writeFile(
    manifest,
    JSON.stringify({ dependencies: { vue: "3", "vite-plus": "1", "@babylonjs/core": "catalog:" } }),
  );
  const dependency = join(root, "node_modules/@babylonjs/core");
  await mkdir(dependency, { recursive: true });
  await writeFile(
    join(dependency, "package.json"),
    JSON.stringify({ name: "@babylonjs/core", version: "9.32.1" }),
  );
  await preflightBabylon(root, base);
  await writeFile(join(dependency, "package.json"), JSON.stringify({ name: "@babylonjs/core" }));
  await assert.rejects(preflightBabylon(root, base), /无法确认/);
  const linked = await fixture(t),
    outside = await mkdtemp(join(tmpdir(), "babylon-outside-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await symlink(outside, join(linked, "src/adui-babylon"), "junction");
  await assert.rejects(preflightBabylon(linked, base), /junction/);
});
test("Babylon 交互与批量计划按应用隔离，默认启用模型保护", async (t) => {
  const answers = ["1", "4", "", "y"],
    questions = [];
  const selected = await collectProjectOptions(
    { name: "cube", framework: "vue", language: "ts", ui: "none", css: "none", screen: true },
    async (question) => {
      questions.push(question);
      return answers.shift();
    },
  );
  assert.equal(selected.engine, "babylon");
  assert.ok(questions.some((question) => question.startsWith("模型保护")));
  assert.equal(selected.modelProtection, "embedded");
  const root = await mkdtemp(join(tmpdir(), "babylon-batch-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const plan = await createBatchPlan(
    {
      version: 1,
      name: "cube-workspace",
      apps: [
        { name: "cube", framework: "vue", screen: true, engine: "babylon" },
        { name: "model", framework: "react", screen: true, engine: "three" },
      ],
    },
    root,
  );
  assert.deepEqual(plan.steps[1].engine.dependencies, [
    "@babylonjs/core@9.32.1",
    "@babylonjs/loaders@9.32.1",
  ]);
  assert.equal(plan.steps[1].modelProtection.engine, "babylon");
  assert.equal(plan.steps[2].modelProtection.mode, "embedded");
});
