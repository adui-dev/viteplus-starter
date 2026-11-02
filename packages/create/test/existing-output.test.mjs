import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { validateProjectOptions } from "../src/options.mjs";
import { addScreenPreset, planScreenPreset } from "../src/screen.mjs";
import { addThreeSmoke } from "../src/three-smoke.mjs";
import { addBabylon } from "../src/babylon.mjs";
import { addCesium } from "../src/cesium.mjs";
import { addModelProtection } from "../src/model-protection.mjs";
import { applicationPath, isSmokeFile } from "../src/plugin-paths.mjs";
import { applicationEntry } from "../src/application-output.mjs";
import { preflightExistingOutput, finalizeExistingOutput } from "../src/existing-output.mjs";
import { inspectWorkspace } from "../src/workspace-inspect.mjs";
const noop = () => {};

async function put(directory, path, source) {
  await mkdir(dirname(join(directory, path)), { recursive: true });
  await writeFile(join(directory, path), source);
}
async function fixture(t, selection = {}, screenLayout) {
  const parent = await mkdtemp(join(tmpdir(), "adui-existing-output-"));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const directory = join(parent, "business-app");
  const options = validateProjectOptions({
    name: "business-app",
    type: "application",
    framework: "vue",
    language: "ts",
    ...selection,
  });
  const { app, main } = applicationEntry(options);
  await put(directory, app, "// business homepage: keep every byte\n");
  await put(directory, main, "// business mounting and providers: keep every byte\n");
  await put(
    directory,
    "vite.config.ts",
    "import { defineConfig } from 'vite-plus'\n// business config\nexport default defineConfig({plugins:[]})\n",
  );
  await put(
    directory,
    "package.json",
    JSON.stringify({
      name: options.name,
      dependencies: { "vite-plus": "1", [options.framework]: "3" },
    }),
  );
  await put(directory, ".gitignore", "node_modules\n");
  await put(directory, "src/plugins/business/index.mjs", "export const business = true\n");
  await put(directory, "src/plugins/index.ts", "// custom registry must remain untouched\n");
  if (screenLayout) {
    const screen = await planScreenPreset({ ...options, screen: true });
    for (const [path, source] of Object.entries(screen.files))
      if (!isSmokeFile(path))
        await put(directory, screenLayout === "grouped" ? applicationPath(path) : path, source);
  }
  return { directory, options, app, main };
}
async function install(directory, options) {
  if (options.screen) await addScreenPreset(directory, options, noop);
  for (const engine of options.engines ?? [options.engine].filter(Boolean))
    await { three: addThreeSmoke, babylon: addBabylon, cesium: addCesium }[engine](
      directory,
      { ...options, engines: undefined, engine },
      noop,
    );
  await addModelProtection(directory, options, noop);
}
async function snapshot(directory) {
  const files = new Map();
  for (const path of await readdir(directory, { recursive: true }))
    if ((await stat(join(directory, path))).isFile())
      files.set(path.replaceAll("\\", "/"), await readFile(join(directory, path)));
  return files;
}

test("补装只归档新增插件，保留业务入口、自定义注册与历史插件", async (t) => {
  for (const [framework, language, engine, layout, mode] of [
    ["vue", "ts", "three", "legacy", "none"],
    ["react", "js", "babylon", "grouped", "external"],
    ["react", "ts", "cesium", "legacy", "embedded"],
  ]) {
    const { directory, options, app, main } = await fixture(
      t,
      { framework, language, engine, modelProtection: mode },
      layout,
    );
    const before = await snapshot(directory),
      plan = await preflightExistingOutput(directory, options);
    await install(directory, options);
    const key = mode !== "none" ? await readFile(join(directory, ".env.local")) : null;
    const afterInstall = await snapshot(directory);
    await finalizeExistingOutput(directory, plan, noop);
    assert.deepEqual(await readFile(join(directory, app)), before.get(app));
    assert.deepEqual(await readFile(join(directory, main)), before.get(main));
    for (const [path, source] of before)
      if (
        path.replaceAll("\\", "/").startsWith("src/plugins/") ||
        path.replaceAll("\\", "/").startsWith("src/adui-screen/")
      )
        assert.deepEqual(await readFile(join(directory, path)), source);
    await readFile(join(directory, `src/plugins/${engine}/lazy.mjs`));
    const remaining = (await readdir(directory, { recursive: true })).map((path) =>
      path.replaceAll("\\", "/"),
    );
    assert.ok(!remaining.some(isSmokeFile));
    assert.ok(!remaining.some((path) => path.startsWith(`src/adui-${engine}/`)));
    for (const [path, source] of afterInstall)
      if (path.includes(".before-adui-"))
        assert.deepEqual(await readFile(join(directory, path)), source);
    if (key) {
      assert.deepEqual(await readFile(join(directory, ".env.local")), key);
      assert.match(
        await readFile(join(directory, "package.json"), "utf8"),
        /node build\/plugins\/models\/keygen.mjs/,
      );
      assert.doesNotMatch(
        await readFile(join(directory, "MODEL_GUIDE.md"), "utf8"),
        /打开 \/model-smoke.html/,
      );
    }
  }
});

test("新大屏/UI 与多引擎补装统一目录，显式独立页使用正确的新旧引用", async (t) => {
  for (const selection of [
    { framework: "vue", language: "js", screen: true, ui: "element-plus", smokePages: true },
    {
      framework: "react",
      language: "ts",
      screen: true,
      engines: ["three", "cesium", "babylon"],
      modelProtection: "embedded",
      smokePages: true,
    },
  ]) {
    const { directory, options } = await fixture(t, selection);
    const plan = await preflightExistingOutput(directory, options);
    await install(directory, options);
    await finalizeExistingOutput(directory, plan, noop);
    await readFile(join(directory, "screen-smoke.html"));
    const screenFiles = (await readdir(join(directory, "src/screen-smoke"))).filter((name) =>
      /Demo\.(?:vue|tsx)$/.test(name),
    );
    assert.match(
      await readFile(join(directory, "src/screen-smoke", screenFiles[0]), "utf8"),
      /plugins\/screen/,
    );
    if (options.ui)
      assert.match(
        await readFile(join(directory, "src/plugins/ui/index.js"), "utf8"),
        /element-plus\/es\/components\/button\/style\/css/,
      );
    if (options.engines)
      for (const engine of options.engines) {
        await readFile(join(directory, `src/plugins/${engine}/lazy.mjs`));
        await readFile(join(directory, engine + "-smoke.html"));
      }
  }
  const legacy = await fixture(
    t,
    { engine: "three", modelProtection: "none", smokePages: true },
    "legacy",
  );
  const plan = await preflightExistingOutput(legacy.directory, legacy.options);
  await install(legacy.directory, legacy.options);
  await finalizeExistingOutput(legacy.directory, plan, noop);
  assert.match(
    await readFile(join(legacy.directory, "src/three-smoke/ScreenDemo.vue"), "utf8"),
    /\.\.\/adui-screen\//,
  );
});

test("新增模型保护不会改写已有 Cesium 构建插件引用或其原文件", async (t) => {
  const { directory, options } = await fixture(t, { engine: "three" }, "legacy");
  const config =
    "import { defineConfig } from 'vite-plus'\nimport {aduiCesium} from './adui-cesium-build/vite.mjs'\nexport default defineConfig({plugins:[...aduiCesium()]})\n";
  await put(directory, "vite.config.ts", config);
  await put(directory, "adui-cesium-build/vite.mjs", "// existing build plugin\n");
  const plan = await preflightExistingOutput(directory, options);
  await install(directory, options);
  await finalizeExistingOutput(directory, plan, noop);
  const actual = await readFile(join(directory, "vite.config.ts"), "utf8");
  assert.match(actual, /\.\/adui-cesium-build\/vite.mjs/);
  assert.match(actual, /\.\/build\/plugins\/models\/vite.mjs/);
  assert.equal(
    await readFile(join(directory, "adui-cesium-build/vite.mjs"), "utf8"),
    "// existing build plugin\n",
  );
});

test("补装目的路径、旧暂存目录与 junction 冲突在安装前拒绝", async (t) => {
  for (const conflict of [
    "src/plugins/screen/core.mjs",
    "src/adui-screen/unknown.txt",
    "src/plugins",
    "junction",
  ]) {
    const { directory, options } = await fixture(t, { screen: true });
    if (conflict === "junction") {
      const outside = await mkdtemp(join(tmpdir(), "adui-existing-outside-"));
      t.after(() => rm(outside, { recursive: true, force: true }));
      await symlink(
        outside,
        join(directory, "src/plugins/screen"),
        process.platform === "win32" ? "junction" : "dir",
      );
    } else if (conflict === "src/plugins")
      await put(directory, "src/plugins/screen", "not a directory");
    else await put(directory, conflict, "business file\n");
    const before = await snapshot(directory);
    await assert.rejects(
      preflightExistingOutput(directory, options),
      /已存在|占用|junction|不是目录/,
    );
    assert.deepEqual(await snapshot(directory), before);
  }
});

test("安装期间占用或混入未知文件拒绝归档，格式失败保留暂存和原件备份", async (t) => {
  for (const failure of ["destination", "unknown", "formatter"]) {
    const { directory, options } = await fixture(t, { screen: true, engine: "three" });
    const plan = await preflightExistingOutput(directory, options);
    await install(directory, options);
    if (failure === "destination")
      await put(directory, "src/plugins/three/lazy.mjs", "business takeover");
    if (failure === "unknown") await put(directory, "src/adui-three/unknown.txt", "business file");
    await assert.rejects(
      finalizeExistingOutput(
        directory,
        plan,
        failure === "formatter"
          ? () => {
              throw Error("format failed");
            }
          : noop,
      ),
      /占用|未知文件|format failed/,
    );
    await readFile(join(directory, "src/adui-three/lazy.mjs"));
    await readFile(join(directory, "package.json.before-adui-models"));
  }
});

test("真实 CLI 在 UI 归档冲突时于安装前停止并报告补装预检阶段", async (t) => {
  const { directory, options } = await fixture(t, { ui: "tdesign" });
  await put(directory, "src/plugins/ui/index.ts", "business wrapper\n");
  const before = await snapshot(directory),
    name = directory.split(/[\\/]/).at(-1);
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH"),
  );
  env.PATH = "";
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("../bin/cli.mjs", import.meta.url)),
      "--name",
      name,
      "--type",
      "application",
      "--framework",
      options.framework,
      "--ui",
      "tdesign",
      "--apply-existing",
    ],
    { cwd: dirname(directory), env, encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /阶段：补装预检/);
  assert.match(result.stderr, /归档目标已存在/);
  assert.deepEqual(await snapshot(directory), before);
});

test("工作区结构检查支持历史大屏与新归档引擎共存，不要求改写业务注册入口", async (t) => {
  const { directory, options } = await fixture(
    t,
    { engine: "three", modelProtection: "none" },
    "legacy",
  );
  const plan = await preflightExistingOutput(directory, options);
  await install(directory, options);
  await finalizeExistingOutput(directory, plan, noop);
  const root = await mkdtemp(join(tmpdir(), "adui-existing-workspace-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await put(
    root,
    "package.json",
    JSON.stringify({ name: "workspace", private: true, devDependencies: { "vite-plus": "1" } }),
  );
  await put(root, "pnpm-workspace.yaml", "packages:\n  - apps/*\n  - packages/*\n");
  await put(root, "vite.config.ts", "export default {}\n");
  const { cp } = await import("node:fs/promises");
  await cp(directory, join(root, "apps/business-app"), { recursive: true });
  await put(root, "apps/business-app/index.html", "<!doctype html>\n");
  await put(
    root,
    "apps/business-app/package.json",
    JSON.stringify({
      name: "business-app",
      dependencies: { vue: "3", "vite-plus": "1", three: "0.186.1" },
      devDependencies: { "@types/three": "0.186.0" },
    }),
  );
  const result = await inspectWorkspace(root, undefined, {
    version: 1,
    name: "workspace",
    apps: [
      {
        name: "business-app",
        framework: "vue",
        screen: true,
        engine: "three",
        modelProtection: "none",
      },
    ],
  });
  assert.equal(result.ok, true, JSON.stringify(result));
});

test("显式 Three 验收 CLI 同样归档新增运行时并保留独立页面", async (t) => {
  const { directory } = await fixture(t, {}, "legacy");
  await put(
    directory,
    "package.json",
    JSON.stringify({
      dependencies: { vue: "3", "vite-plus": "1", three: "0.186.1", "@types/three": "0.186.0" },
    }),
  );
  const preload = join(dirname(directory), "formatter.mjs");
  await writeFile(
    preload,
    `import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
childProcess.spawnSync = command => { if (!String(command).startsWith('vp fmt ')) throw Error('unexpected child'); return {status:0}; };
syncBuiltinESMExports();\n`,
  );
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      pathToFileURL(preload).href,
      fileURLToPath(new URL("../bin/cli.mjs", import.meta.url)),
      "--name",
      "business-app",
      "--type",
      "application",
      "--framework",
      "vue",
      "--three-smoke",
    ],
    { cwd: dirname(directory), encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  await readFile(join(directory, "three-smoke.html"));
  await readFile(join(directory, "src/plugins/three/lazy.mjs"));
  assert.match(
    await readFile(join(directory, "src/three-smoke/ThreeView.vue"), "utf8"),
    /plugins\/three/,
  );
  await assert.rejects(readFile(join(directory, "src/adui-three/lazy.mjs")), { code: "ENOENT" });
});
