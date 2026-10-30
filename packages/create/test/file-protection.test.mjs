import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink, lstat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { addUiSmoke } from "../src/ui-smoke.mjs";
import { applyIntegrations, preflightIntegrations } from "../src/integrations.mjs";
import { addScreenPreset } from "../src/screen.mjs";
import { inspectPath } from "../src/safe-paths.mjs";
async function fixture(t, framework = "vue", language = "js", workspace = false) {
  const root = await mkdtemp(join(tmpdir(), "starter-protect-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const app = workspace ? join(root, "apps", "app") : join(root, "app"),
    outside = join(root, "outside");
  await mkdir(join(app, "src"), { recursive: true });
  await mkdir(outside);
  if (workspace) {
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ private: true, devDependencies: { "vite-plus": "1" } }),
    );
    await writeFile(join(root, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n");
    await writeFile(join(root, "vite.config.ts"), "export default defineConfig({fmt:{}})");
  }
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

async function snapshot(root) {
  return Promise.all(
    (await readdir(root, { recursive: true })).sort().map(async (path) => {
      const absolute = join(root, path);
      const info = await lstat(absolute);
      return {
        path,
        mtime: info.mtimeMs,
        content: info.isFile() ? await readFile(absolute) : null,
      };
    }),
  );
}

test("UI/CSS 只读预检保留四种入口和文件，未选择集成时不访问目标", async (t) => {
  for (const framework of ["vue", "react"])
    for (const language of ["ts", "js"]) {
      const f = await fixture(t, framework, language);
      const before = await snapshot(f.root);
      assert.ok(await preflightIntegrations(f.app, f.options));
      assert.deepEqual(await snapshot(f.root), before);
    }
  assert.equal(
    await preflightIntegrations("missing-app", { type: "application", framework: "vue" }),
    null,
  );
});

test("真实 CLI 工作区补装在修改共享配置前拒绝未知 Vite 结构和输出占用", async (t) => {
  const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH"),
  );
  env.PATH = "";
  for (const framework of ["vue", "react"])
    for (const language of ["ts", "js"])
      for (const conflict of ["config", "output"]) {
        const f = await fixture(t, framework, language, true);
        if (conflict === "config")
          await writeFile(
            join(f.app, "vite.config.js"),
            "export default defineConfig({plugins:customPlugins()})",
          );
        else await writeFile(join(f.app, `uno.config.${language}`), "user configuration");
        const before = await snapshot(f.root);
        const result = spawnSync(
          process.execPath,
          [
            cli,
            "--workspace",
            f.root,
            "--name",
            "app",
            "--type",
            "application",
            "--framework",
            framework,
            "--language",
            language,
            "--ui",
            f.options.ui,
            "--css",
            "unocss",
            "--apply-existing",
          ],
          { cwd: f.root, env, encoding: "utf8", timeout: 10_000 },
        );
        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stderr, /阶段：补装预检/);
        assert.match(result.stderr, /已完成：无/);
        assert.match(
          result.stderr,
          conflict === "config" ? /仅支持 plugins/ : /文件已存在，拒绝覆盖/,
        );
        assert.deepEqual(await snapshot(f.root), before);
      }
});

test("补装清单与入口检查共用基础样式预检，坏清单不回显原文", async (t) => {
  const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH"),
  );
  env.PATH = "";
  for (const manifest of [
    "manifest-content-marker",
    "null",
    "[]",
    '\uFEFF{"dependencies":{"vue":"3","vite-plus":"1"}}',
  ]) {
    const f = await fixture(t);
    await writeFile(join(f.app, "package.json"), manifest);
    await writeFile(
      join(f.app, "vite.config.js"),
      "export default defineConfig({plugins:customPlugins()})",
    );
    const before = await snapshot(f.root);
    const result = spawnSync(
      process.execPath,
      [
        cli,
        "--name",
        "app",
        "--type",
        "application",
        "--framework",
        "vue",
        "--language",
        "js",
        "--ui",
        "tdesign",
        "--css",
        "unocss",
        "--apply-existing",
      ],
      { cwd: f.root, env, encoding: "utf8", timeout: 10_000 },
    );
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /阶段：补装预检/);
    assert.match(
      result.stderr,
      manifest.startsWith("\uFEFF") ? /仅支持 plugins/ : /package.json 无效/,
    );
    assert.ok(!result.stderr.includes("manifest-content-marker"));
    assert.deepEqual(await snapshot(f.root), before);
  }
});
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
