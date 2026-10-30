import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, readdir, lstat, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { repairExistingIntegrations } from "../src/integrations.mjs";
import {
  generateIntegration as legacyGenerate,
  planIntegrations as legacyPlan,
} from "../fixtures/legacy-integrations.mjs";

async function fixture(
  t,
  framework = "vue",
  ui = framework === "vue" ? "tdesign" : "antd",
  css = "unocss",
) {
  const root = await mkdtemp(join(tmpdir(), "starter-repair-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const app = join(root, "app");
  const main = framework === "vue" ? "src/main.ts" : "src/main.tsx";
  const appFile = framework === "vue" ? "src/App.vue" : "src/App.tsx";
  const options = { type: "application", framework, ui, css };
  const plan = legacyPlan(options);
  const generated = legacyGenerate(
    options,
    "export default defineConfig({ plugins: [] })",
    "// original entry\n",
  );
  const legacy = generated.files["starter.plugins.ts"];
  const entry = generated.files[main];
  await mkdir(join(app, "src"), { recursive: true });
  await writeFile(
    join(app, "package.json"),
    JSON.stringify({
      dependencies: {
        [framework]: "1",
        "vite-plus": "1",
        ...Object.fromEntries(plan.dependencies.map((name) => [name, "catalog:"])),
      },
      devDependencies: Object.fromEntries(
        plan.devDependencies.map((name) => [name, "workspace:*"]),
      ),
    }),
  );
  await writeFile(
    join(app, "vite.config.ts"),
    "import { starterPlugins } from './starter.plugins'\nexport default defineConfig({plugins:[...starterPlugins()]})\n",
  );
  await writeFile(join(app, "starter.plugins.ts"), legacy);
  await writeFile(join(app, main), entry);
  for (const [file, source] of Object.entries(generated.files))
    if (file !== main && file !== "starter.plugins.ts") await writeFile(join(app, file), source);
  await writeFile(join(app, appFile), "original app");
  return {
    root,
    app,
    main,
    appFile,
    legacy,
    entry,
    options,
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
    assert.equal(await readFile(join(f.app, "starter.plugins.ts.bak"), "utf8"), f.legacy);
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
  assert.equal(await readFile(join(f.app, "starter.plugins.ts.bak"), "utf8"), f.legacy);
  assert.equal(await readFile(join(f.app, f.main), "utf8"), f.entry);
});

test("旧版修复在 UI/CSS 参数不匹配时拒绝写入", async (t) => {
  const f = await fixture(t);
  await writeFile(
    join(f.app, "starter.plugins.ts"),
    "import tailwindcss from '@tailwindcss/vite'\nexport function starterPlugins() { return [tailwindcss()] }\n",
  );
  const before = await snapshot(f.root);
  await assert.rejects(
    repairExistingIntegrations(f.app, f.options, () => {}),
    /UI\/CSS/,
  );
  assert.deepEqual(await snapshot(f.root), before);
});

test("历史生成器的十七种有效 TS 插件组合均可修复，保留入口、样式与清单", async (t) => {
  let count = 0;
  for (const framework of ["vue", "react"])
    for (const ui of framework === "vue"
      ? ["none", "element-plus", "antd", "tdesign"]
      : ["none", "antd", "tdesign"])
      for (const css of ["none", "unocss", "tailwindcss"]) {
        if (css === "none" && (framework === "react" || ui === "none")) continue;
        const f = await fixture(t, framework, ui, css);
        // Quote style, CRLF, comments, semicolons and trailing commas from formatters.
        const source = f.legacy
          .replaceAll("'", '"')
          .replaceAll("\n", "\r\n")
          .replace("return [", "return [ /* example: tailwindcss() ElementPlusResolver() */")
          .replace("\r\n  ]", ",\r\n  ];");
        await writeFile(join(f.app, "starter.plugins.ts"), source);
        const before = (await snapshot(f.root)).filter(
          (item) =>
            item.content !== null &&
            !item.path.endsWith("vite.config.ts") &&
            !item.path.endsWith("starter.plugins.ts"),
        );
        await repairExistingIntegrations(f.app, f.options, () => {});
        assert.equal(await readFile(join(f.app, "starter.plugins.ts.bak"), "utf8"), source);
        assert.deepEqual(
          (await snapshot(f.root)).filter((item) =>
            before.some((original) => original.path === item.path),
          ),
          before,
        );
        assert.doesNotMatch(
          await readFile(join(f.app, "vite.config.ts"), "utf8"),
          /starterPlugins|starter\.plugins/,
        );
        count++;
      }
  assert.equal(count, 17);
});

test("真实 CLI 拒绝旧插件、入口样式、依赖与修复参数不一致，所有文件保持", async (t) => {
  const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
  const env = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH"),
    ),
    PATH: "",
  };
  for (const mode of [
    "vue-ui",
    "react-ui",
    "css",
    "ui-none",
    "css-none",
    "dependency",
    "dev-dependency",
    "missing-main",
    "main-directory",
    "main-link",
    "style-comment",
    "style-string",
    "style-other",
    "css-style",
    "custom-code",
    "custom-option",
    "alias",
    "empty",
    "comment-only",
    "return-newline",
  ]) {
    const f = await fixture(t, mode === "react-ui" ? "react" : "vue");
    const options = { ...f.options };
    const main = join(f.app, f.main);
    const old = join(f.app, "starter.plugins.ts");
    if (mode.endsWith("ui")) options.ui = mode === "vue-ui" ? "element-plus" : "tdesign";
    if (mode === "css") options.css = "tailwindcss";
    if (mode === "ui-none") options.ui = "none";
    if (mode === "css-none") options.css = "none";
    if (mode === "dependency" || mode === "dev-dependency") {
      const manifest = JSON.parse(await readFile(join(f.app, "package.json"), "utf8"));
      if (mode === "dependency") delete manifest.dependencies["tdesign-vue-next"];
      else delete manifest.devDependencies.unocss;
      await writeFile(join(f.app, "package.json"), JSON.stringify(manifest));
    }
    if (["missing-main", "main-directory", "main-link"].includes(mode)) {
      await rm(main);
      if (mode === "main-directory") await mkdir(main);
      if (mode === "main-link") {
        const outside = join(f.root, "outside.ts");
        await writeFile(outside, f.entry);
        await symlink(outside, main);
      }
    }
    if (mode === "style-comment")
      await writeFile(
        main,
        "// import 'tdesign-vue-next/es/style/index.css'\nimport 'virtual:uno.css'",
      );
    if (mode === "style-string")
      await writeFile(
        main,
        "const example = `import 'tdesign-vue-next/es/style/index.css'`;\nimport 'virtual:uno.css'",
      );
    if (mode === "style-other") await writeFile(main, "import 'antd/dist/reset.css'\n" + f.entry);
    if (mode === "css-style")
      await writeFile(main, f.entry.replace("virtual:uno.css", "./starter.tailwind.css"));
    if (mode === "custom-code")
      await writeFile(old, f.legacy + "console.log('custom plugin side effect')\n");
    if (mode === "custom-option") await writeFile(old, f.legacy.replace("'vue-next'", "'other'"));
    if (mode === "alias") await writeFile(old, f.legacy.replaceAll("UnoCSS", "Other"));
    if (mode === "empty") await writeFile(old, "export function starterPlugins() { return [] }");
    if (mode === "comment-only") await writeFile(old, "/* " + f.legacy + " */");
    if (mode === "return-newline") await writeFile(old, f.legacy.replace("return [", "return\n["));
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
        options.framework,
        "--ui",
        options.ui,
        "--css",
        options.css,
        "--repair-existing",
      ],
      { cwd: f.root, env, encoding: "utf8", timeout: 10_000 },
    );
    assert.equal(result.status, 1, mode + ": " + result.stderr);
    assert.match(result.stderr, /阶段：旧配置修复/);
    assert.ok(result.stderr.includes(f.app), mode);
    assert.deepEqual(await snapshot(f.root), before, mode);
  }
});
