import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, readdir, lstat, rm, unlink } from "node:fs/promises";
import { join, dirname, basename, resolve } from "node:path";
import { tmpdir } from "node:os";
import { addScreenPreset } from "../src/screen.mjs";
import { preflightUiSmoke } from "../src/ui-smoke.mjs";
import { validateThreeTarget } from "../src/three-smoke.mjs";
import { preflightCesium } from "../src/cesium.mjs";
import { preflightBabylon } from "../src/babylon.mjs";

async function fixture(t, framework = "react", language = "js") {
  const root = await mkdtemp(join(tmpdir(), "adui-manifest-"));
  assert.equal(dirname(resolve(root)), resolve(tmpdir()));
  assert.ok(basename(root).startsWith("adui-manifest-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "src"));
  const manifest = join(root, "package.json");
  await writeFile(
    manifest,
    "\uFEFF" +
      JSON.stringify({
        dependencies: {
          "vite-plus": "1",
          [framework]: "1",
          [framework === "vue" ? "tdesign-vue-next" : "antd"]: "1",
        },
      }),
  );
  const ext = framework === "vue" ? language : language === "ts" ? "tsx" : "jsx";
  await writeFile(join(root, "src/main." + ext), "// original main\n");
  await writeFile(
    join(root, "vite.config.ts"),
    framework === "vue"
      ? 'import {defineConfig} from "vite-plus";import Components from "unplugin-vue-components/vite";import {TDesignResolver} from "unplugin-vue-components/resolvers";export default defineConfig({plugins:[Components({resolvers:[TDesignResolver()]})]});'
      : 'import {defineConfig} from "vite-plus";export default defineConfig({plugins:[]});',
  );
  return {
    root,
    manifest,
    options: {
      name: "app",
      type: "application",
      framework,
      language,
      ui: framework === "vue" ? "tdesign" : "antd",
      screen: true,
      modelProtection: "none",
    },
  };
}

async function snapshot(root) {
  return Promise.all(
    (await readdir(root, { recursive: true })).sort().map(async (path) => {
      const info = await lstat(join(root, path));
      return {
        path,
        mtime: info.mtimeMs,
        bytes: info.isFile() ? await readFile(join(root, path)) : null,
      };
    }),
  );
}
const readers = [
  (root, options) => preflightUiSmoke(root, options),
  (root, options) => validateThreeTarget(root, options, false),
  (root, options) => preflightCesium(root, { ...options, engine: "cesium" }, false),
  (root, options) => preflightBabylon(root, { ...options, engine: "babylon" }, false),
];

test("应用 BOM 清单被 UI/三引擎预检和大屏写入一致读取，原文件保持", async (t) => {
  for (const framework of ["vue", "react"])
    for (const language of ["ts", "js"]) {
      const { root, manifest, options } = await fixture(t, framework, language);
      const before = await snapshot(root);
      for (const reader of readers) await reader(root, options);
      assert.deepEqual(await snapshot(root), before);
      let formats = 0;
      const plan = await addScreenPreset(root, options, () => formats++);
      assert.equal(formats, 1);
      for (const file of before.filter((item) => item.bytes)) {
        assert.deepEqual(await readFile(join(root, file.path)), file.bytes);
        assert.equal((await lstat(join(root, file.path))).mtimeMs, file.mtime);
      }
      for (const path of Object.keys(plan.files))
        assert.ok((await lstat(join(root, path))).isFile());
      assert.equal((await readFile(manifest, "utf8")).charCodeAt(0), 0xfeff);
    }
});

test("预设读取拒绝坏 JSON、非对象和目录，错误带路径且不回显原文，不写文件", async (t) => {
  for (const source of [
    "\uFEFFnull",
    "\uFEFF[]",
    "7",
    '"do-not-echo"',
    '{"private-note":"do-not-echo"',
    null,
  ]) {
    const { root, manifest, options } = await fixture(t);
    if (source === null) {
      await unlink(manifest);
      await mkdir(manifest);
    } else await writeFile(manifest, source);
    const before = await snapshot(root);
    for (const reader of [
      ...readers,
      (root, options) => addScreenPreset(root, options, () => assert.fail("不得格式化")),
    ]) {
      await assert.rejects(reader(root, options), (error) => {
        assert.ok(error.message.includes(manifest));
        assert.ok(!error.message.includes("do-not-echo"));
        return true;
      });
      assert.deepEqual(await snapshot(root), before);
    }
  }
});
