import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { addBaseStyles, planBaseStyles, preflightBaseStyles } from "../src/base-styles.mjs";
import { generateIntegration } from "../src/integrations.mjs";

async function fixture(t, framework = "vue", language = "ts") {
  const root = await mkdtemp(join(tmpdir(), "adui-base-styles-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const options = { type: "application", framework, language };
  const plan = planBaseStyles(options);
  await mkdir(join(root, "src"));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ dependencies: { [framework]: "3", "vite-plus": "1" } }),
  );
  await writeFile(join(root, "vite.config.ts"), "export default {server:{port:4321}}");
  await writeFile(
    join(root, plan.entry),
    '/* user header */\nimport "./style.css";\n// original entry\n',
  );
  await writeFile(join(root, "src/App.vue"), "original app");
  await writeFile(join(root, "src/style.css"), "body { color: red; }");
  return { root, options, plan };
}

test("基础样式覆盖 Vue/React TS/JS，不选择 UI/CSS 也生成；不作用于 Monorepo 根", () => {
  for (const [framework, language, entry] of [
    ["vue", "ts", "ts"],
    ["vue", "js", "js"],
    ["react", "ts", "tsx"],
    ["react", "js", "jsx"],
  ]) {
    const plan = planBaseStyles({ type: "application", framework, language });
    assert.equal(plan.entry, "src/main." + entry);
    assert.deepEqual(plan.dependencies, []);
    assert.deepEqual(plan.files, ["src/styles/normalize.css", "src/styles/normalize.LICENSE.txt"]);
  }
  assert.equal(planBaseStyles({ type: "monorepo" }), null);
  assert.throws(() => planBaseStyles({ framework: "angular" }));
});

test("四种入口离线复制快照与 MIT 许可，优先导入，保留原入口/App/样式/配置/依赖，重复调用无写入", async (t) => {
  for (const framework of ["vue", "react"])
    for (const language of ["ts", "js"]) {
      const { root, options, plan } = await fixture(t, framework, language);
      const protectedFiles = ["package.json", "vite.config.ts", "src/App.vue", "src/style.css"];
      const before = await Promise.all(
        protectedFiles.map((file) => readFile(join(root, file), "utf8")),
      );
      const calls = [];
      const formatter = (cwd, files) => calls.push({ cwd, files });
      assert.equal(await addBaseStyles(root, options, formatter), true);
      const entry = await readFile(join(root, plan.entry), "utf8");
      assert.match(entry, /^\/\* user header \*\/\nimport "\.\/styles\/normalize\.css";/);
      assert.ok(entry.indexOf("normalize.css") < entry.indexOf("./style.css"));
      assert.ok(entry.includes("// original entry"));
      const css = await readFile(join(root, plan.files[0]), "utf8");
      assert.match(css, /normalize\.css v8\.0\.1 \| MIT License/);
      assert.doesNotMatch(css, /@import|url\s*\(/i);
      assert.match(
        await readFile(join(root, plan.files[1]), "utf8"),
        /Copyright © Nicolas Gallagher and Jonathan Neal/,
      );
      assert.match(
        await readFile(join(root, plan.files[1]), "utf8"),
        /Permission is hereby granted/,
      );
      assert.deepEqual(
        await Promise.all(protectedFiles.map((file) => readFile(join(root, file), "utf8"))),
        before,
      );
      assert.equal(await addBaseStyles(root, options, formatter), false);
      assert.equal(calls.length, 1);
      assert.deepEqual(calls[0], { cwd: root, files: [plan.entry, plan.files[0]] });
    }
});

test("后续 UI/CSS 首次补装后 normalize 仍排在组件库和 Tailwind/UnoCSS 前，不重复复制", async (t) => {
  for (const framework of ["vue", "react"]) {
    const { root, options, plan } = await fixture(t, framework);
    await addBaseStyles(root, options, () => {});
    const css = await readFile(join(root, plan.files[0]), "utf8");
    const current = await readFile(join(root, plan.entry), "utf8");
    const generated = generateIntegration(
      { ...options, ui: "tdesign", css: "tailwindcss" },
      "export default defineConfig({plugins:[]})",
      current,
    );
    await writeFile(join(root, plan.entry), generated.files[plan.entry]);
    await addBaseStyles(root, options, () => {});
    const updated = await readFile(join(root, plan.entry), "utf8");
    assert.ok(updated.indexOf("normalize.css") < updated.indexOf("tdesign"));
    assert.ok(updated.indexOf("normalize.css") < updated.indexOf("starter.tailwind.css"));
    assert.equal(updated.match(/\.\/styles\/normalize\.css/g).length, 1);
    assert.equal(await readFile(join(root, plan.files[0]), "utf8"), css);
  }
});

test("未知同名文件、部分文件、单独导入和修改过的快照在写入前拒绝，保留用户文件", async (t) => {
  for (const conflict of ["css", "license", "import", "modified"]) {
    const { root, options, plan } = await fixture(t);
    if (conflict === "modified") {
      await addBaseStyles(root, options, () => {});
      await writeFile(join(root, plan.files[0]), "user modified css");
    } else if (conflict === "import") {
      await writeFile(join(root, plan.entry), 'import "./styles/normalize.css";\nuserEntry()');
    } else {
      await mkdir(join(root, "src/styles"));
      await writeFile(join(root, plan.files[conflict === "css" ? 0 : 1]), "user file");
    }
    const original = await readFile(join(root, plan.entry), "utf8");
    const files = await readdir(join(root, "src"));
    await assert.rejects(
      addBaseStyles(root, options, () => assert.fail("冲突不得格式化")),
      /拒绝覆盖/,
    );
    assert.equal(await readFile(join(root, plan.entry), "utf8"), original);
    assert.deepEqual(await readdir(join(root, "src")), files);
  }
});

test("styles 父目录链接拒绝，站外无新增文件", async (t) => {
  const { root, options, plan } = await fixture(t);
  const outside = await mkdtemp(join(tmpdir(), "adui-base-outside-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await symlink(
    outside,
    join(root, "src/styles"),
    process.platform === "win32" ? "junction" : "dir",
  );
  const before = await readFile(join(root, plan.entry), "utf8");
  await assert.rejects(preflightBaseStyles(root, options), /符号链接|junction/);
  assert.deepEqual(await readdir(outside), []);
  assert.equal(await readFile(join(root, plan.entry), "utf8"), before);
});

test("保留 BOM/hashbang/版权注释，注释中的示例引用不当成导入，真实重复导入拒绝", async (t) => {
  const { root, options, plan } = await fixture(t);
  const header = '\uFEFF#!/usr/bin/env node\n/* copyright\nimport "./styles/normalize.css";\n*/\n';
  await writeFile(join(root, plan.entry), header + 'import "./style.css";\n');
  await addBaseStyles(root, options, () => {});
  const entry = await readFile(join(root, plan.entry), "utf8");
  assert.ok(entry.startsWith(header + 'import "./styles/normalize.css";\n'));
  await writeFile(join(root, plan.entry), entry + 'import "./styles/normalize.css";\n');
  const before = await readFile(join(root, plan.entry), "utf8");
  await assert.rejects(
    addBaseStyles(root, options, () => assert.fail("重复导入不得格式化")),
    /重复导入/,
  );
  assert.equal(await readFile(join(root, plan.entry), "utf8"), before);
});

test("真实 CLI dry-run 列出默认静态文件，无 UI/CSS 依赖且不生成目标", async (t) => {
  const { root } = await fixture(t);
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("../bin/cli.mjs", import.meta.url)),
      "--name",
      "new-app",
      "--type",
      "application",
      "--framework",
      "react",
      "--language",
      "js",
      "--dry-run",
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.baseStyles.entry, "src/main.jsx");
  assert.deepEqual(plan.integrations.dependencies, []);
  assert.deepEqual(plan.integrations.devDependencies, []);
  assert.ok(!(await readdir(root)).includes("new-app"));
});
