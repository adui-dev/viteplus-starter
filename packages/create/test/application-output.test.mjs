import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { validateProjectOptions } from "../src/options.mjs";
import { parseCliArgs } from "../src/cli-args.mjs";
import { validateBatchConfig } from "../src/batch.mjs";
import { applicationInvocations } from "../src/application-invocations.mjs";
import { addScreenPreset, preflightScreenPreset, planScreenPreset } from "../src/screen.mjs";
import { addThreeSmoke, validateThreeTarget } from "../src/three-smoke.mjs";
import { addCesium } from "../src/cesium.mjs";
import { addBabylon } from "../src/babylon.mjs";
import { addModelProtection } from "../src/model-protection.mjs";
import {
  applicationEntry,
  captureApplication,
  finalizeApplication,
  planApplicationOutput,
} from "../src/application-output.mjs";
import { inspectWorkspace } from "../src/workspace-inspect.mjs";
const noop = () => {};

async function put(root, path, source) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), source);
}
async function fixture(t, selection) {
  const directory = await mkdtemp(join(tmpdir(), "adui-output-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const options = validateProjectOptions({
    name: "example",
    type: "application",
    framework: "vue",
    screen: true,
    ...selection,
  });
  const { app, main } = applicationEntry(options);
  await put(directory, app, "// official application fixture\n");
  await put(
    directory,
    main,
    options.framework === "vue"
      ? "import {createApp} from 'vue'\nimport App from './App.vue'\nimport './styles/normalize.css'\nimport './style.css'\ncreateApp(App).mount('#app')\n"
      : "import {createRoot} from 'react-dom/client'\nimport App from './App.jsx'\nimport './styles/normalize.css'\nimport './index.css'\ncreateRoot(document.getElementById('root')).render(<App />)\n",
  );
  await put(
    directory,
    "index.html",
    '<!doctype html><html><head><link rel="icon" href="/vite.svg" /></head><body></body></html>\n',
  );
  await put(
    directory,
    "vite.config.ts",
    "import {defineConfig} from 'vite-plus'\nexport default defineConfig({plugins:[]})\n",
  );
  await put(directory, ".gitignore", "node_modules\n");
  await put(
    directory,
    "package.json",
    JSON.stringify({
      name: options.name,
      dependencies: { "vite-plus": "1", [options.framework]: "3" },
    }),
  );
  const snapshot = await captureApplication(directory, options);
  if (options.screen) await addScreenPreset(directory, options, noop);
  for (const engine of options.engines ?? [options.engine].filter(Boolean)) {
    const single = { ...options, engines: undefined, engine };
    await { three: addThreeSmoke, cesium: addCesium, babylon: addBabylon }[engine](
      directory,
      single,
      noop,
    );
  }
  await addModelProtection(directory, options, noop);
  return { directory, options, snapshot };
}

test("新建应用集中插件并从 main/App 使用，四种框架语言及三引擎均不留默认验收页/备份", async (t) => {
  for (const framework of ["vue", "react"])
    for (const language of ["ts", "js"])
      for (const [index, engine] of ["three", "babylon", "cesium"].entries()) {
        const { directory, options, snapshot } = await fixture(t, {
          framework,
          language,
          engine,
          ui: "tdesign",
          modelProtection: ["embedded", "external", "none"][index],
        });
        const key =
          options.modelProtection !== "none" ? await readFile(join(directory, ".env.local")) : null;
        await finalizeApplication(directory, options, snapshot, noop);
        const paths = (await readdir(directory, { recursive: true })).map((path) =>
          path.replaceAll("\\", "/"),
        );
        assert.ok(
          !paths.some((path) => /smoke|before-adui|src\/adui-|^adui-.*-build/.test(path)),
          paths.join("\n"),
        );
        for (const path of (await planApplicationOutput(options)).files)
          await readFile(join(directory, path));
        const { app, main } = applicationEntry(options);
        assert.match(await readFile(join(directory, app), "utf8"), /UiButton/);
        assert.match(await readFile(join(directory, app), "utf8"), /AdScreen/);
        assert.match(await readFile(join(directory, main), "utf8"), /plugins\/index\./);
        assert.doesNotMatch(
          await readFile(join(directory, main), "utf8"),
          /import ['"]\.\/(?:style|index)\.css/,
        );
        assert.match(
          await readFile(
            join(
              directory,
              `src/components/SceneView.${framework === "vue" ? "vue" : language === "ts" ? "tsx" : "jsx"}`,
            ),
            "utf8",
          ),
          new RegExp("plugins/" + engine + "/lazy"),
        );
        if (key) {
          assert.deepEqual(await readFile(join(directory, ".env.local")), key);
          assert.match(
            await readFile(join(directory, "package.json"), "utf8"),
            /node build\/plugins\/models\/keygen.mjs/,
          );
          assert.match(
            await readFile(join(directory, "vite.config.ts"), "utf8"),
            /build\/plugins\/models\/vite.mjs/,
          );
        }
        await assert.rejects(
          preflightScreenPreset(directory, await planScreenPreset(options)),
          /拒绝重复安装/,
        );
        if (engine !== "three")
          await validateThreeTarget(directory, {
            ...options,
            engine: "three",
            modelProtection: "none",
          });
      }
});

test("显式 smokePages 保留独立页并修正导入，多引擎最终只生成一套首页", async (t) => {
  const { directory, options, snapshot } = await fixture(t, {
    engines: ["three", "cesium", "babylon"],
    smokePages: true,
  });
  await finalizeApplication(directory, options, snapshot, noop);
  for (const name of ["three", "cesium", "babylon", "screen", "model"])
    await readFile(join(directory, name + "-smoke.html"));
  assert.match(
    await readFile(join(directory, "src/three-smoke/ThreeView.vue"), "utf8"),
    /plugins\/three/,
  );
  assert.match(
    await readFile(join(directory, "src/model-smoke/ModelView.vue"), "utf8"),
    /plugins\/three/,
  );
  assert.doesNotMatch((await readdir(directory)).join("\n"), /before-adui/);
});

test("路径占用、首页变更、未知暂存文件和 junction 在接入写入前拒绝", async (t) => {
  for (const mode of ["occupied", "changed", "unknown", "junction"]) {
    const { directory, options, snapshot } = await fixture(t, { engine: "three" });
    if (mode === "occupied") await put(directory, "src/plugins/three/lazy.mjs", "keep");
    if (mode === "changed") await put(directory, snapshot.app, "user changed App\n");
    if (mode === "unknown") await put(directory, "src/three-smoke/keep.txt", "keep");
    if (mode === "junction") {
      const outside = await mkdtemp(join(tmpdir(), "adui-outside-"));
      t.after(() => rm(outside, { recursive: true, force: true }));
      await symlink(
        outside,
        join(directory, "src/plugins"),
        process.platform === "win32" ? "junction" : "dir",
      );
    }
    const before = await readFile(join(directory, "package.json"));
    await assert.rejects(
      finalizeApplication(directory, options, snapshot, noop),
      /已存在|已变更|未知文件|junction/,
    );
    assert.deepEqual(await readFile(join(directory, "package.json")), before);
    await readFile(join(directory, "src/adui-three/lazy.mjs"));
    await readFile(join(directory, "package.json.before-adui-models"));
  }
});

test("格式失败保留暂存文件和备份，空预设也接入品牌首页且不生成空插件目录", async (t) => {
  const active = await fixture(t, { engine: "three" });
  await assert.rejects(
    finalizeApplication(active.directory, active.options, active.snapshot, () => {
      throw Error("format failed");
    }),
    /format failed/,
  );
  await readFile(join(active.directory, "src/adui-three/lazy.mjs"));
  await readFile(join(active.directory, "package.json.before-adui-models"));
  const plain = await fixture(t, { screen: undefined });
  await finalizeApplication(plain.directory, plain.options, plain.snapshot, noop);
  assert.match(
    await readFile(join(plain.directory, plain.snapshot.app), "utf8"),
    /adui-studio-logo.svg/,
  );
  await assert.rejects(readFile(join(plain.directory, "src/plugins/index.ts")), { code: "ENOENT" });
});

test("验收页为布尔开关，批量和恢复调用传递开关", () => {
  assert.equal(parseCliArgs(["--smoke-pages"]).smokePages, true);
  assert.throws(() => parseCliArgs(["--smoke-pages", "--smoke-pages"]), /不能重复/);
  const config = validateBatchConfig({
    version: 1,
    name: "workspace",
    apps: [{ name: "app", framework: "vue", screen: true, smokePages: true }],
  });
  assert.ok(applicationInvocations(config.apps[0], "D:/example").args.includes("--smoke-pages"));
  assert.throws(
    () => validateBatchConfig({ ...config, apps: [{ ...config.apps[0], smokePages: "yes" }] }),
    /布尔/,
  );
});

test("工作区检查识别新布局并检查真实首页文件", async (t) => {
  const { directory, options, snapshot } = await fixture(t, {
    engine: "three",
    modelProtection: "none",
  });
  await finalizeApplication(directory, options, snapshot, noop);
  const root = await mkdtemp(join(tmpdir(), "adui-inspect-output-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await put(
    root,
    "package.json",
    JSON.stringify({ name: "workspace", private: true, devDependencies: { "vite-plus": "1" } }),
  );
  await put(root, "pnpm-workspace.yaml", "packages:\n  - apps/*\n  - packages/*\n");
  await put(root, "vite.config.ts", "export default {}\n");
  const { cp } = await import("node:fs/promises");
  await cp(directory, join(root, "apps/example"), { recursive: true });
  const manifest = JSON.parse(await readFile(join(root, "apps/example/package.json"), "utf8"));
  manifest.dependencies.three = "0.186.1";
  manifest.devDependencies = { "@types/three": "0.186.0" };
  await put(root, "apps/example/package.json", JSON.stringify(manifest));
  const config = {
    version: 1,
    name: "workspace",
    apps: [
      { name: "example", framework: "vue", screen: true, engine: "three", modelProtection: "none" },
    ],
  };
  const result = await inspectWorkspace(root, undefined, config);
  assert.equal(result.ok, true, JSON.stringify(result));
});
