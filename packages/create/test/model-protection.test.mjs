import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir, symlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateProjectOptions } from "../src/options.mjs";
import { parseCliArgs } from "../src/cli-args.mjs";
import { collectProjectOptions } from "../src/prompts.mjs";
import { createBatchPlan, validateBatchConfig } from "../src/batch.mjs";
import {
  planModelProtection,
  preflightModelProtection,
  addModelProtection,
} from "../src/model-protection.mjs";
const base = { name: "demo", type: "application", framework: "vue", engine: "three", screen: true };
test("Cesium 保护安装保留资源插件与配置备份，关闭不写入，旧快照拒绝", async (t) => {
  for (const modelProtection of ["embedded", "external"]) {
    const root = await fixture(t, "cesium"),
      options = { ...base, engine: "cesium", modelProtection };
    const config =
      'import {defineConfig} from "vite-plus";import {aduiCesium} from "./adui-cesium-build/vite.mjs";export default defineConfig({server:{port:4321},plugins:[...aduiCesium()]})';
    await writeFile(join(root, "vite.config.ts"), config);
    await addModelProtection(root, options, async () => {});
    const page = await readFile(join(root, "src/model-smoke/ModelView.vue"), "utf8");
    assert.ok(page.includes("createLazyGlobe as createLazyScene"));
    assert.ok(page.includes("../adui-cesium/lazy.mjs"));
    assert.ok(!page.includes("adui-three") && !page.includes("adui-babylon"));
    const result = await readFile(join(root, "vite.config.ts"), "utf8");
    assert.ok(
      result.includes("...aduiCesium()") &&
        result.includes("aduiModels(") &&
        result.includes("4321"),
    );
    assert.equal(await readFile(join(root, "vite.config.ts.before-adui-models"), "utf8"), config);
    assert.equal(planModelProtection(options).engine, "cesium");
    await assert.rejects(
      addModelProtection(root, options, () => assert.fail()),
      /拒绝覆盖/,
    );
  }
  const off = await fixture(t, "cesium");
  await addModelProtection(off, { ...base, engine: "cesium", modelProtection: "none" }, () =>
    assert.fail(),
  );
  assert.ok(!(await readdir(off)).includes(".env.local"));
  const old = await fixture(t, "cesium");
  await writeFile(join(old, "src/adui-cesium/lazy.mjs"), "export const oldSnapshot=true");
  await assert.rejects(
    addModelProtection(old, { ...base, engine: "cesium" }, () => assert.fail()),
    /旧快照/,
  );
  assert.ok(!(await readdir(old)).includes(".env.local"));
});
test("Babylon 两种保护模式生成专属适配页面、密钥与备份，关闭模式不写入", async (t) => {
  for (const modelProtection of ["embedded", "external"]) {
    const root = await fixture(t, "babylon");
    const options = { ...base, engine: "babylon", modelProtection };
    assert.equal(planModelProtection(options).engine, "babylon");
    await addModelProtection(root, options, async () => {});
    const page = await readFile(join(root, "src/model-smoke/ModelView.vue"), "utf8");
    assert.ok(page.includes("../adui-babylon/lazy.mjs"));
    assert.ok(!page.includes("adui-three"));
    assert.ok(page.includes("onModelState:"));
    assert.ok(
      page.includes(
        modelProtection === "embedded" ? "virtual:adui-model-key" : "createOfflineKeyring",
      ),
    );
    assert.ok((await readFile(join(root, ".env.local"), "utf8")).includes("ADUI_MODEL_KEY="));
    assert.equal(await readFile(join(root, "src/main.ts"), "utf8"), "original entry");
    await assert.rejects(
      addModelProtection(root, options, () => assert.fail()),
      /拒绝覆盖/,
    );
  }
  const root = await fixture(t, "babylon");
  await addModelProtection(root, { ...base, engine: "babylon", modelProtection: "none" }, () =>
    assert.fail(),
  );
  assert.ok(!(await readdir(root)).includes(".env.local"));
});
test("Three 默认保护、显式关闭和外置；类型、根、依赖与重复参数严格校验", () => {
  assert.equal(validateProjectOptions(base).modelProtection, "embedded");
  assert.equal(
    validateProjectOptions({ ...base, modelProtection: "none" }).modelProtection,
    "none",
  );
  assert.equal(
    validateProjectOptions({ ...base, modelProtection: "external" }).modelProtection,
    "external",
  );
  assert.equal(
    validateProjectOptions({ name: "plain", type: "application", framework: "react" })
      .modelProtection,
    undefined,
  );
  for (const modelProtection of [true, false, null, 1, {}, ["embedded"], "unknown"])
    assert.throws(() => validateProjectOptions({ ...base, modelProtection }), /模型保护/);
  assert.throws(
    () => validateProjectOptions({ ...base, engine: "none", modelProtection: "embedded" }),
    /需要 engine/,
  );
  assert.throws(
    () => validateProjectOptions({ name: "root", type: "monorepo", modelProtection: "none" }),
    /根/,
  );
  assert.throws(
    () => parseCliArgs(["--model-protection", "none", "--model-protection", "embedded"]),
    /重复/,
  );
  assert.equal(
    validateProjectOptions({ ...parseCliArgs(["--model-protection", "external"]), ...base })
      .modelProtection,
    "external",
  );
});
test("交互选择大屏和引擎，保护默认/关闭、确认摘要与取消", async () => {
  for (const [answer, expected] of [
    ["", "embedded"],
    ["2", "external"],
    ["3", "none"],
  ]) {
    const answers = ["viewer", "1", "2", "2", "1", "1", "2", "2", answer, "y"],
      questions = [];
    const result = await collectProjectOptions({}, async (prompt) => {
      questions.push(prompt);
      return answers.shift();
    });
    assert.equal(result.engine, "three");
    assert.equal(result.modelProtection, expected);
    assert.ok(result.screen);
    assert.match(questions.at(-1), new RegExp("模型保护: " + expected));
  }
  const answers = ["viewer", "1", "1", "1", "1", "1", "2", "2", "", "n"];
  assert.equal(await collectProjectOptions({}, async () => answers.shift()), null);
});
test("批量按应用保护及 UI 阶段隔离，真实 dry-run 不生成 KEY 或文件", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "model-plan-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = {
    version: 1,
    name: "models-demo",
    apps: [
      {
        name: "admin",
        framework: "vue",
        ui: "tdesign",
        uiSmoke: true,
        screen: true,
        engine: "three",
      },
      { name: "off", framework: "react", screen: true, engine: "three", modelProtection: "none" },
    ],
  };
  const plan = await createBatchPlan(input, root);
  assert.equal(plan.steps[1].modelProtection.mode, "embedded");
  assert.ok(plan.steps[1].args.includes("--model-protection"));
  assert.ok(!plan.steps[2].args.includes("--model-protection"));
  assert.equal(plan.steps[3].modelProtection, undefined);
  assert.ok(plan.steps[1].modelProtection.files.includes(".env.local"));
  assert.ok(!JSON.stringify(plan).includes("ADUI_MODEL_KEY="));
  for (const value of [null, true, {}, "unknown"])
    assert.throws(() =>
      validateBatchConfig({ ...input, apps: [{ ...input.apps[0], modelProtection: value }] }),
    );
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
      "--dry-run",
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).modelProtection.secret.generatedAtExecution, true);
  assert.deepEqual(await readdir(root), []);
});
async function fixture(t, engine = "three") {
  const root = await mkdtemp(join(tmpdir(), "model-create-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "src/adui-" + engine), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      dependencies: { "vite-plus": "1", vue: "3" },
      scripts: { build: "vp build" },
    }),
  );
  await writeFile(join(root, "src/main.ts"), "original entry");
  await writeFile(
    join(root, "src/adui-" + engine + "/lazy.mjs"),
    "export const loadBundledModel=true",
  );
  await writeFile(
    join(root, "vite.config.ts"),
    'import {defineConfig} from "vite-plus";export default defineConfig({})',
  );
  await writeFile(join(root, ".gitignore"), "dist/\n");
  return root;
}
test("创建集成生成独立 KEY、脚本与忽略规则，保护原入口、备份和重复调用", async (t) => {
  const first = await fixture(t),
    second = await fixture(t),
    calls = [];
  await addModelProtection(first, base, (root, args) => calls.push({ root, args }));
  await addModelProtection(second, base, () => {});
  const pkg = JSON.parse(await readFile(join(first, "package.json"), "utf8"));
  assert.equal(pkg.scripts.build, "vp build");
  assert.match(pkg.scripts["models:keygen"], /keygen.mjs$/);
  assert.match(pkg.scripts["models:keyrotate"], /--rotate$/);
  const one = await readFile(join(first, ".env.local"), "utf8"),
    two = await readFile(join(second, ".env.local"), "utf8");
  assert.notEqual(one, two);
  assert.match(one, /ADUI_MODEL_KEY=/);
  assert.ok(!one.includes("ADUI_MODEL_IV="));
  assert.match(await readFile(join(first, ".gitignore"), "utf8"), /\.env\.local\*/);
  assert.equal(await readFile(join(first, "src/main.ts"), "utf8"), "original entry");
  assert.equal(
    JSON.parse(await readFile(join(first, "package.json.before-adui-models"), "utf8")).scripts
      .build,
    "vp build",
  );
  assert.equal(calls.length, 1);
  await assert.rejects(
    addModelProtection(first, base, () => {}),
    /拒绝覆盖/,
  );
  assert.equal(await readFile(join(first, ".env.local"), "utf8"), one);
  assert.equal(planModelProtection({ ...base, modelProtection: "none" }), null);
});
test("已有 env 或脚本、目录链接在修改前拒绝；关闭保护无写入", async (t) => {
  const root = await fixture(t),
    original = await readFile(join(root, "vite.config.ts"), "utf8");
  await writeFile(join(root, ".env.local"), "USER_CONFIG=keep");
  await assert.rejects(
    addModelProtection(root, base, () => {}),
    /拒绝覆盖/,
  );
  assert.equal(await readFile(join(root, "vite.config.ts"), "utf8"), original);
  await addModelProtection(root, { ...base, modelProtection: "none" }, () => {
    throw Error("no runner");
  });
  assert.equal(await readFile(join(root, ".env.local"), "utf8"), "USER_CONFIG=keep");
  await rm(join(root, ".env.local"));
  const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  manifest.scripts["models:keygen"] = "user script";
  await writeFile(join(root, "package.json"), JSON.stringify(manifest));
  await assert.rejects(preflightModelProtection(root, base), /脚本/);
  delete manifest.scripts["models:keygen"];
  await writeFile(join(root, "package.json"), JSON.stringify(manifest));
  const outside = await mkdtemp(join(tmpdir(), "model-out-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await symlink(outside, join(root, "adui-model-build"), "junction");
  await assert.rejects(preflightModelProtection(root, base), /链接/);
});
