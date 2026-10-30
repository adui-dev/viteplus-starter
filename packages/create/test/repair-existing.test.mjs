import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, readdir, lstat, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { repairExistingIntegrations } from "../src/integrations.mjs";

const legacy = "export function starterPlugins() { return [] }\n";
async function fixture(t, framework = "vue") {
  const root = await mkdtemp(join(tmpdir(), "starter-repair-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const app = join(root, "app");
  const main = framework === "vue" ? "src/main.ts" : "src/main.tsx";
  const appFile = framework === "vue" ? "src/App.vue" : "src/App.tsx";
  await mkdir(join(app, "src"), { recursive: true });
  await writeFile(
    join(app, "package.json"),
    JSON.stringify({ dependencies: { [framework]: "1", "vite-plus": "1" } }),
  );
  await writeFile(
    join(app, "vite.config.ts"),
    "import { starterPlugins } from './starter.plugins'\nexport default defineConfig({plugins:[...starterPlugins()]})\n",
  );
  await writeFile(join(app, "starter.plugins.ts"), legacy);
  await writeFile(join(app, main), "// original entry\n");
  await writeFile(join(app, appFile), "original app");
  return {
    root,
    app,
    main,
    appFile,
    options: {
      type: "application",
      framework,
      ui: framework === "vue" ? "tdesign" : "antd",
      css: "unocss",
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
        content: info.isFile() ? await readFile(join(root, path)) : null,
      };
    }),
  );
}

test("旧版 Vue/React TS 修复保留原入口/清单，BOM 清单可用且已有备份不覆盖", async (t) => {
  for (const framework of ["vue", "react"]) {
    const f = await fixture(t, framework);
    if (framework === "vue")
      await writeFile(
        join(f.app, "package.json"),
        "\uFEFF" + (await readFile(join(f.app, "package.json"), "utf8")),
      );
    const files = ["package.json", f.main, f.appFile];
    const before = await Promise.all(files.map((file) => readFile(join(f.app, file))));
    const calls = [];
    assert.equal(
      await repairExistingIntegrations(f.app, f.options, async (cwd, file) =>
        calls.push({ cwd, file }),
      ),
      true,
    );
    assert.deepEqual(calls, [{ cwd: f.app, file: "vite.config.ts" }]);
    assert.deepEqual(await Promise.all(files.map((file) => readFile(join(f.app, file)))), before);
    assert.equal(await readFile(join(f.app, "starter.plugins.ts.bak"), "utf8"), legacy);
    await assert.rejects(lstat(join(f.app, "starter.plugins.ts")), { code: "ENOENT" });
    assert.doesNotMatch(
      await readFile(join(f.app, "vite.config.ts"), "utf8"),
      /starterPlugins|starter\.plugins/,
    );
    const after = await snapshot(f.root);
    await assert.rejects(
      repairExistingIntegrations(f.app, f.options, () => assert.fail("不应格式化")),
    );
    assert.deepEqual(await snapshot(f.root), after);
  }
});

test("旧修复 CLI 对坏清单、路径/备份占用和未知旧格式提前拒绝，不回显清单内容", async (t) => {
  const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH"),
  );
  env.PATH = "";
  for (const mode of [
    "json",
    "null",
    "array",
    "missing",
    "directory",
    "package-link",
    "config-link",
    "legacy-link",
    "framework",
    "backup",
    "backup-directory",
    "legacy-format",
    "config-format",
    "js",
  ]) {
    const f = await fixture(t);
    const pkg = join(f.app, "package.json");
    if (["json", "null", "array"].includes(mode))
      await writeFile(pkg, { json: "CONTENTMARKER-invalid-json", null: "null", array: "[]" }[mode]);
    if (["missing", "directory", "package-link"].includes(mode)) await rm(pkg);
    if (mode === "directory") await mkdir(pkg);
    if (mode.endsWith("-link")) {
      const target = join(f.root, "outside.txt");
      await writeFile(target, "CONTENTMARKER-outside");
      const link =
        mode === "package-link"
          ? pkg
          : join(f.app, mode === "config-link" ? "vite.config.ts" : "starter.plugins.ts");
      if (mode !== "package-link") await rm(link);
      await symlink(target, link);
    }
    if (mode === "framework")
      await writeFile(pkg, JSON.stringify({ dependencies: { react: "1", "vite-plus": "1" } }));
    if (mode === "backup")
      await writeFile(join(f.app, "starter.plugins.ts.bak"), "original backup");
    if (mode === "backup-directory") await mkdir(join(f.app, "starter.plugins.ts.bak"));
    if (mode === "legacy-format")
      await writeFile(join(f.app, "starter.plugins.ts"), "// unknown old file");
    if (mode === "config-format")
      await writeFile(join(f.app, "vite.config.ts"), "export default defineConfig({plugins:[]})");
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
        mode === "js" ? "js" : "ts",
        "--ui",
        "tdesign",
        "--css",
        "unocss",
        "--repair-existing",
      ],
      { cwd: f.root, env, encoding: "utf8", timeout: 10_000 },
    );
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /阶段：旧配置修复/);
    assert.ok(result.stderr.includes(f.app));
    assert.ok(!result.stderr.includes("CONTENTMAR"));
    assert.deepEqual(await snapshot(f.root), before);
  }
});

test("旧版修复等待异步格式化，失败时传播错误并保留原插件备份", async (t) => {
  const f = await fixture(t);
  let calls = 0;
  await assert.rejects(
    repairExistingIntegrations(f.app, f.options, async () => {
      calls++;
      throw new Error("format-failed");
    }),
    /format-failed/,
  );
  assert.equal(calls, 1);
  assert.equal(await readFile(join(f.app, "starter.plugins.ts.bak"), "utf8"), legacy);
  assert.equal(await readFile(join(f.app, f.main), "utf8"), "// original entry\n");
});
