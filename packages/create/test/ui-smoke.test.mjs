import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addUiSmoke, planUiSmoke } from "../src/ui-smoke.mjs";

test("Vue JS TDesign + UnoCSS 独立演示包含按钮和点击计数", () => {
  const result = planUiSmoke({
    name: "demo",
    type: "application",
    framework: "vue",
    language: "js",
    ui: "tdesign",
    css: "unocss",
  });
  assert.match(result.files["src/ui-smoke/SmokeApp.vue"], /<t-button/);
  assert.match(result.files["src/ui-smoke/SmokeApp.vue"], /clicks \+= 1/);
  assert.match(result.files["src/ui-smoke/SmokeApp.vue"], /data-ui-smoke-css/);
  assert.match(result.files["src/ui-smoke/main.js"], /virtual:uno\.css/);
  assert.match(result.files["ui-smoke.html"], /main\.js/);
  assert.equal(result.files["src/App.vue"], undefined);
});
test("Vue TS 使用 main.ts 且不会强制生成 CSS 块", () => {
  const result = planUiSmoke({
    name: "demo",
    type: "application",
    framework: "vue",
    ui: "tdesign",
    css: "none",
  });
  assert.ok(result.files["src/ui-smoke/main.ts"]);
  assert.doesNotMatch(result.files["src/ui-smoke/SmokeApp.vue"], /data-ui-smoke-css/);
});
test("React JS Ant Design/Tailwind 生成 JSX 点击演示", () => {
  const result = planUiSmoke({
    name: "demo",
    type: "application",
    framework: "react",
    language: "js",
    ui: "antd",
    css: "tailwindcss",
  });
  assert.match(result.files["src/ui-smoke/SmokeApp.jsx"], /<Button type="primary"/);
  assert.match(result.files["src/ui-smoke/SmokeApp.jsx"], /setClicks/);
  assert.match(result.files["src/ui-smoke/SmokeApp.jsx"], /export default function SmokeApp/);
  assert.doesNotMatch(result.files["src/ui-smoke/SmokeApp.jsx"], /createRoot/);
  assert.match(result.files["src/ui-smoke/main.jsx"], /import SmokeApp from '\.\/SmokeApp.jsx'/);
  assert.doesNotMatch(result.files["src/ui-smoke/main.jsx"], /function SmokeApp|useState/);
  assert.match(result.files["src/ui-smoke/main.jsx"], /starter.tailwind.css/);
  assert.match(result.files["ui-smoke.html"], /main\.jsx/);
});
test("React TS 使用 main.tsx", () => {
  const result = planUiSmoke({
    name: "demo",
    type: "application",
    framework: "react",
    ui: "antd",
    css: "none",
  });
  assert.ok(result.files["src/ui-smoke/main.tsx"]);
  assert.match(result.files["src/ui-smoke/main.tsx"], /import SmokeApp from '\.\/SmokeApp.tsx'/);
  assert.ok(result.files["src/ui-smoke/SmokeApp.tsx"]);
});
test("不支持未知组合或 Monorepo 根目录", () => {
  assert.throws(() =>
    planUiSmoke({ name: "demo", type: "application", framework: "vue", ui: "none" }),
  );
  assert.throws(() =>
    planUiSmoke({ name: "demo", type: "application", framework: "react", ui: "element-plus" }),
  );
  assert.throws(() => planUiSmoke({ name: "demo", type: "monorepo" }));
});
async function fakeProject(options, fn) {
  const dir = await mkdtemp(join(tmpdir(), "vp-smoke-"));
  try {
    await mkdir(join(dir, "src"));
    const pkg =
      options.framework === "vue"
        ? { tdesign: "tdesign-vue-next", antd: "ant-design-vue", "element-plus": "element-plus" }[
            options.ui
          ]
        : options.ui === "tdesign"
          ? "tdesign-react"
          : "antd";
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({
        dependencies: { "vite-plus": "1.4.0", [options.framework]: "1.0.0", [pkg]: "1.0.0" },
      }),
    );
    const ext =
      options.framework === "vue"
        ? options.language === "js"
          ? "js"
          : "ts"
        : options.language === "js"
          ? "jsx"
          : "tsx";
    await writeFile(join(dir, "src", "main." + ext), "/* original */\n");
    await writeFile(
      join(dir, "vite.config.ts"),
      "export default defineConfig({ plugins: [TDesignResolver(), ElementPlusResolver(), AntDesignVueResolver(), UnoCSS(), tailwindcss()] })",
    );
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
test("Vue 既有应用写入时不覆盖 App/入口，重复调用被拒绝", async () => {
  const options = {
    name: "demo",
    type: "application",
    framework: "vue",
    language: "js",
    ui: "tdesign",
    css: "unocss",
  };
  await fakeProject(options, async (dir) => {
    await writeFile(join(dir, "src", "App.vue"), "<template>original</template>");
    const calls = [];
    const result = await addUiSmoke(dir, options, () => calls.push("format"));
    assert.deepEqual(calls, ["format"]);
    assert.equal(result.previewPath, "/ui-smoke.html");
    assert.match(await readFile(join(dir, "src", "main.js"), "utf8"), /original/);
    assert.match(await readFile(join(dir, "src", "App.vue"), "utf8"), /original/);
    await assert.rejects(
      addUiSmoke(dir, options, () => {}),
      /拒绝覆盖/,
    );
  });
});
test("React JS 已有应用可创建隔离验收页", async () => {
  const options = {
    name: "demo",
    type: "application",
    framework: "react",
    language: "js",
    ui: "antd",
    css: "tailwindcss",
  };
  await fakeProject(options, async (dir) => {
    const result = await addUiSmoke(dir, options, () => {});
    assert.ok(result.written.includes("src/ui-smoke/main.jsx"));
    assert.ok(result.written.includes("src/ui-smoke/SmokeApp.jsx"));
    assert.match(await readFile(join(dir, "ui-smoke.html"), "utf8"), /ui-smoke\/main\.jsx/);
  });
});

test("React 新组件文件已存在时，在写入 HTML 或入口前拒绝覆盖", async () => {
  for (const language of ["js", "ts"]) {
    const options = { name: "demo", type: "application", framework: "react", language, ui: "antd" };
    await fakeProject(options, async (dir) => {
      const extension = language === "js" ? "jsx" : "tsx";
      await mkdir(join(dir, "src/ui-smoke"));
      const componentPath = join(dir, "src/ui-smoke/SmokeApp." + extension);
      await writeFile(componentPath, "original component");
      let formatted = false;
      await assert.rejects(
        addUiSmoke(dir, options, () => {
          formatted = true;
        }),
        /拒绝覆盖/,
      );
      assert.equal(formatted, false);
      assert.equal(await readFile(componentPath, "utf8"), "original component");
      await assert.rejects(readFile(join(dir, "ui-smoke.html")), { code: "ENOENT" });
      await assert.rejects(readFile(join(dir, "src/ui-smoke/main." + extension)), {
        code: "ENOENT",
      });
    });
  }
});
test("缺少组件依赖时拒绝写入任何测试文件", async () => {
  const options = {
    name: "demo",
    type: "application",
    framework: "react",
    language: "js",
    ui: "antd",
  };
  await fakeProject(options, async (dir) => {
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ dependencies: { react: "19", "vite-plus": "1.4.0" } }),
    );
    await assert.rejects(
      addUiSmoke(dir, options, () => {}),
      /对应 UI 组件库/,
    );
    await assert.rejects(readFile(join(dir, "ui-smoke.html")), { code: "ENOENT" });
  });
});

test("五种 UI 的 TS/JS 与三种 CSS 均生成相符的组件、样式及独立入口", () => {
  const cases = [
    ["vue", "element-plus", "el-button", "Element Plus", 'type="primary"'],
    ["vue", "antd", "a-button", "Ant Design Vue", 'type="primary"'],
    ["vue", "tdesign", "t-button", "TDesign", 'theme="primary"'],
    ["react", "antd", "Button", "Ant Design", 'type="primary"'],
    ["react", "tdesign", "Button", "TDesign", 'theme="primary"'],
  ];
  for (const [framework, ui, tag, label, primary] of cases)
    for (const language of ["ts", "js"])
      for (const css of ["none", "unocss", "tailwindcss"]) {
        const plan = planUiSmoke({
          name: "smoke",
          type: "application",
          framework,
          ui,
          language,
          css,
        });
        const ext = framework === "vue" ? "vue" : language === "ts" ? "tsx" : "jsx";
        const component = plan.files["src/ui-smoke/SmokeApp." + ext];
        assert.ok(component.includes("<" + tag + " " + primary));
        assert.ok(component.includes(label + " 按钮"));
        assert.ok(component.includes("data-ui-smoke-count"));
        assert.equal(component.includes("data-ui-smoke-css"), css !== "none");
        assert.ok(
          !Object.keys(plan.files).some(
            (path) =>
              path.startsWith("src/main.") ||
              path.startsWith("src/App.") ||
              path.startsWith("vite.config"),
          ),
        );
        if (framework === "react")
          assert.ok(
            component.includes("from '" + (ui === "antd" ? "antd" : "tdesign-react") + "'"),
          );
        const entry = Object.entries(plan.files).find(([path]) =>
          path.startsWith("src/ui-smoke/main."),
        )[1];
        assert.equal(entry.includes("virtual:uno.css"), css === "unocss");
        assert.equal(entry.includes("starter.tailwind.css"), css === "tailwindcss");
        if (ui === "tdesign")
          assert.ok(
            entry.includes(
              framework === "vue"
                ? "tdesign-vue-next/es/style/index.css"
                : "tdesign-react/es/style/index.css",
            ),
          );
        if (framework === "vue" && ui === "antd")
          assert.ok(entry.includes("ant-design-vue/dist/reset.css"));
      }
});

test("新 UI 可补装独立验收页，保留入口配置和清单；错误组件依赖在写入前拒绝", async () => {
  for (const [framework, ui] of [
    ["vue", "element-plus"],
    ["vue", "antd"],
    ["react", "tdesign"],
  ]) {
    const options = {
      name: "smoke",
      type: "application",
      framework,
      ui,
      language: "js",
      css: "none",
    };
    await fakeProject(options, async (dir) => {
      const paths = [
        "package.json",
        "vite.config.ts",
        "src/main." + (framework === "vue" ? "js" : "jsx"),
      ];
      const before = await Promise.all(paths.map((path) => readFile(join(dir, path), "utf8")));
      await addUiSmoke(dir, options, () => {});
      assert.deepEqual(
        await Promise.all(paths.map((path) => readFile(join(dir, path), "utf8"))),
        before,
      );
    });
    await fakeProject(options, async (dir) => {
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({
          dependencies: {
            "vite-plus": "1",
            [framework]: "1",
            [framework === "vue" ? "tdesign-vue-next" : "antd"]: "1",
          },
        }),
      );
      await assert.rejects(
        addUiSmoke(dir, options, () => {}),
        /对应 UI 组件库/,
      );
      await assert.rejects(readFile(join(dir, "ui-smoke.html")), { code: "ENOENT" });
    });
  }
});

test("Vue 新 UI 不能误用其他组件库的自动导入配置", async () => {
  for (const ui of ["element-plus", "antd"]) {
    const options = { name: "smoke", type: "application", framework: "vue", ui };
    await fakeProject(options, async (dir) => {
      await writeFile(
        join(dir, "vite.config.ts"),
        "export default defineConfig({plugins:[TDesignResolver()]})",
      );
      await assert.rejects(
        addUiSmoke(dir, options, () => {}),
        /自动导入配置/,
      );
      await assert.rejects(readFile(join(dir, "ui-smoke.html")), { code: "ENOENT" });
    });
  }
});
