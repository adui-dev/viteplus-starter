import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { addUiSmoke } from "../src/ui-smoke.mjs";
import { applyIntegrations } from "../src/integrations.mjs";
import { addScreenPreset } from "../src/screen.mjs";
import { inspectPath } from "../src/safe-paths.mjs";
async function fixture(t, framework = "vue", language = "js") {
  const root = await mkdtemp(join(tmpdir(), "starter-protect-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const app = join(root, "app"),
    outside = join(root, "outside");
  await mkdir(join(app, "src"), { recursive: true });
  await mkdir(outside);
  const ext =
    framework === "vue" ? (language === "js" ? "js" : "ts") : language === "js" ? "jsx" : "tsx";
  const options = {
    name: "app",
    type: "application",
    framework,
    language,
    ui: framework === "vue" ? "tdesign" : "antd",
    css: "unocss",
  };
  const config =
    'import {defineConfig} from "vite-plus";export default defineConfig({plugins:[TDesignResolver(),UnoCSS()]})';
  const entry = "// preserve entry\n";
  await writeFile(join(app, "vite.config.js"), config);
  await writeFile(join(app, "src/main." + ext), entry);
  await writeFile(
    join(app, "package.json"),
    JSON.stringify({
      dependencies: {
        "vite-plus": "1",
        [framework]: "1",
        [framework === "vue" ? "tdesign-vue-next" : "antd"]: "1",
      },
    }),
  );
  return { root, app, outside, options, config, entry, main: "src/main." + ext };
}
test("UI 验收四种框架/语言拒绝输出 junction，站外目录与正式文件保持不变", async (t) => {
  for (const framework of ["vue", "react"])
    for (const language of ["ts", "js"]) {
      const f = await fixture(t, framework, language);
      await symlink(f.outside, join(f.app, "src/ui-smoke"), "junction");
      await assert.rejects(
        addUiSmoke(f.app, f.options, () => {
          throw Error("formatter must not run");
        }),
        /junction/,
      );
      assert.deepEqual(await readdir(f.outside), []);
      assert.equal(await readFile(join(f.app, f.main), "utf8"), f.entry);
      await assert.rejects(readFile(join(f.app, "ui-smoke.html")), { code: "ENOENT" });
    }
});
test("UI/CSS 入口父目录 junction 在依赖安装前拒绝", async (t) => {
  const f = await fixture(t);
  await rm(join(f.app, "src"), { recursive: true });
  await writeFile(join(f.outside, "main.js"), f.entry);
  await symlink(f.outside, join(f.app, "src"), "junction");
  let installed = false;
  await assert.rejects(
    applyIntegrations(
      f.app,
      f.options,
      () => {
        installed = true;
      },
      () => {},
    ),
    /junction/,
  );
  assert.equal(installed, false);
  assert.equal(await readFile(join(f.outside, "main.js"), "utf8"), f.entry);
  assert.equal(await readFile(join(f.app, "vite.config.js"), "utf8"), f.config);
});
test("安装期间创建冲突文件或改动入口，拒绝覆盖且不写其他配置", async (t) => {
  for (const change of ["output", "entry", "config", "link"]) {
    const f = await fixture(t);
    let calls = 0;
    await assert.rejects(
      applyIntegrations(
        f.app,
        f.options,
        async () => {
          if (calls++) return;
          if (change === "output") await writeFile(join(f.app, "uno.config.js"), "user file");
          if (change === "entry") await writeFile(join(f.app, f.main), "user edited");
          if (change === "config") await writeFile(join(f.app, "vite.config.js"), "user config");
          if (change === "link") {
            await rm(join(f.app, "src"), { recursive: true });
            await writeFile(join(f.outside, "main.js"), "outside");
            await symlink(f.outside, join(f.app, "src"), "junction");
          }
        },
        () => {
          throw Error("formatter must not run");
        },
      ),
      /拒绝覆盖|junction/,
    );
    assert.equal(
      await readFile(join(f.app, "vite.config.js"), "utf8"),
      change === "config" ? "user config" : f.config,
    );
    if (change === "output") {
      assert.equal(await readFile(join(f.app, f.main), "utf8"), f.entry);
      assert.equal(await readFile(join(f.app, "uno.config.js"), "utf8"), "user file");
    }
    if (change === "entry")
      assert.equal(await readFile(join(f.app, f.main), "utf8"), "user edited");
    if (change === "link")
      assert.equal(await readFile(join(f.outside, "main.js"), "utf8"), "outside");
  }
});
test("祖先 junction 与悬空目标在 CLI/大屏写入前拒绝", async (t) => {
  const f = await fixture(t);
  const alias = join(f.root, "alias");
  await symlink(f.app, alias, "junction");
  await assert.rejects(
    addScreenPreset(alias, { ...f.options, screen: true }, () => {}),
    /junction/,
  );
  await assert.rejects(readFile(join(f.app, "screen-smoke.html")), { code: "ENOENT" });
  const missing = join(f.root, "dangling");
  await symlink(join(f.root, "not-created"), missing, "junction");
  await assert.rejects(inspectPath(missing), /junction/);
  const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
  const result = spawnSync(
    process.execPath,
    [cli, "--name", "dangling", "--type", "application", "--framework", "vue"],
    { cwd: f.root, encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /junction/);
  await assert.rejects(readFile(join(f.root, "not-created/package.json")), { code: "ENOENT" });
});
