import { test } from "node:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { planIntegrations, generateIntegration, applyIntegrations } from "../src/integrations.mjs";

const vueConfig =
  "import vue from '@vitejs/plugin-vue'\nexport default defineConfig({\n  plugins: [vue()],\n})\n";
const reactConfig =
  "import react from '@vitejs/plugin-react'\nexport default defineConfig({\n  plugins: [react()],\n})\n";

test("Vue + Element Plus + UnoCSS 生成正确依赖清单", () => {
  const result = planIntegrations({
    type: "application",
    framework: "vue",
    ui: "element-plus",
    css: "unocss",
  });
  assert.deepEqual(result.dependencies, ["element-plus"]);
  assert.deepEqual(result.devDependencies, ["unplugin-vue-components", "unocss"]);
});
test("React 拒绝 Element Plus", () => {
  assert.throws(() =>
    planIntegrations({ type: "application", framework: "react", ui: "element-plus", css: "none" }),
  );
});
test("Monorepo 不允许全局 UI/CSS", () => {
  assert.throws(() => planIntegrations({ type: "monorepo", ui: "tdesign", css: "none" }));
});
test("Vue + TDesign + Tailwind 生成 Vite 插件与样式", () => {
  const generated = generateIntegration(
    { framework: "vue", ui: "tdesign", css: "tailwindcss" },
    vueConfig,
    "import App from './App.vue'\n",
  );
  assert.match(generated.config, /Components\(/);
  assert.match(generated.config, /TDesignResolver/);
  assert.match(generated.config, /tailwindcss\(\)/);
  assert.match(generated.files["src/main.ts"], /tdesign-vue-next/);
  assert.match(generated.files["src/main.ts"], /starter.tailwind.css/);
});
test("React + Ant Design 仅需入口样式", () => {
  const generated = generateIntegration(
    { framework: "react", ui: "antd", css: "none" },
    reactConfig,
    "console.log(1)",
  );
  assert.equal(generated.config, reactConfig);
  assert.match(generated.files["src/main.tsx"], /antd\/dist\/reset.css/);
});
test("未知模板布局应拒绝修改", () => {
  assert.throws(() =>
    generateIntegration({ framework: "vue", ui: "antd", css: "none" }, "export default {}", ""),
  );
});

test("Vite+ lazyPlugins 配置可以安全追加 UI/CSS 插件", () => {
  const config =
    "import { defineConfig, lazyPlugins } from 'vite-plus'\nexport default defineConfig({plugins:lazyPlugins(() => [vue()])})";
  const result = generateIntegration(
    { framework: "vue", ui: "tdesign", css: "unocss" },
    config,
    "import App from './App.vue'",
  );
  assert.match(result.config, /UnoCSS\(\)/);
});
test("Vite+ 无插件数组时可以增加 plugins", () => {
  const config =
    "import { defineConfig } from 'vite-plus'\nexport default defineConfig({staged:{}})";
  const result = generateIntegration(
    { framework: "vue", ui: "element-plus", css: "none" },
    config,
    "import App from './App.vue'",
  );
  assert.match(result.config, /plugins: lazyPlugins/);
});

test("Vue + TDesign + UnoCSS 不生成跨文件 starter.plugins 引用", () => {
  const generated = generateIntegration(
    { framework: "vue", ui: "tdesign", css: "unocss" },
    vueConfig,
    "import App from './App.vue'",
  );
  assert.equal(generated.files["starter.plugins.ts"], undefined);
  assert.doesNotMatch(generated.config, /starterPlugins|starter\.plugins/);
  assert.match(generated.config, /UnoCSS\(\)/);
});
test("React + Ant Design + Tailwind 直接在 Vite 配置中声明插件", () => {
  const generated = generateIntegration(
    { framework: "react", ui: "antd", css: "tailwindcss" },
    reactConfig,
    "",
  );
  assert.match(generated.config, /tailwindcss\(\)/);
  assert.equal(generated.files["starter.plugins.ts"], undefined);
});
test("旧配置内联迁移后不再引用 starter.plugins", () => {
  const legacy =
    "import { starterPlugins } from './starter.plugins'\nexport default defineConfig({plugins: [...starterPlugins(), vue()]})";
  const generated = generateIntegration(
    { framework: "vue", ui: "tdesign", css: "unocss" },
    legacy,
    "",
    { repair: true },
  );
  assert.doesNotMatch(generated.config, /starter\.plugins|starterPlugins/);
  assert.match(generated.config, /TDesignResolver/);
});

test("Vue UI 自动导入保留组件类型声明并排除生成文件的格式检查", () => {
  const generated = generateIntegration(
    { framework: "vue", ui: "tdesign", css: "unocss" },
    vueConfig,
    "import App from './App.vue'\n",
  );
  assert.match(generated.config, /dts: 'src\/components\.d\.ts'/);
  assert.match(generated.config, /fmt:\s*\{\s*ignorePatterns:\s*\['src\/components\.d\.ts'\]/);
  assert.match(generated.config, /TDesignResolver/);
});

test("React 不引入 Vue 组件类型声明格式配置", () => {
  const generated = generateIntegration(
    { framework: "react", ui: "antd", css: "tailwindcss" },
    reactConfig,
    "import React from 'react'\n",
  );
  assert.doesNotMatch(generated.config, /src\/components\.d\.ts/);
});

test("Vue JS + TDesign + UnoCSS 使用 main.js、uno.config.js 且不生成类型声明", () => {
  const generated = generateIntegration(
    { framework: "vue", language: "js", ui: "tdesign", css: "unocss" },
    vueConfig,
    "import App from './App.vue'\n",
  );
  assert.match(generated.files["src/main.js"], /virtual:uno.css/);
  assert.ok(generated.files["uno.config.js"]);
  assert.equal(generated.files["src/main.ts"], undefined);
  assert.equal(generated.files["uno.config.ts"], undefined);
  assert.match(generated.config, /dts: false/);
  assert.doesNotMatch(generated.config, /fmt:|components\.d\.ts/);
});

test("React JS + Ant Design + Tailwind 使用 main.jsx", () => {
  const generated = generateIntegration(
    { framework: "react", language: "js", ui: "antd", css: "tailwindcss" },
    reactConfig,
    "import React from 'react'\n",
  );
  assert.match(generated.files["src/main.jsx"], /antd\/dist\/reset.css/);
  assert.match(generated.files["src/main.jsx"], /starter.tailwind.css/);
  assert.ok(generated.files["src/starter.tailwind.css"]);
  assert.equal(generated.files["src/main.tsx"], undefined);
});

test("JavaScript 官方配置和应用入口可被正确识别并写入", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vp-starter-js-"));
  try {
    await mkdir(join(directory, "src"));
    await writeFile(
      join(directory, "vite.config.js"),
      "import { defineConfig } from 'vite-plus'\nexport default defineConfig({plugins: []})\n",
    );
    await writeFile(join(directory, "src/main.js"), "import App from './App.vue'\n");
    const installs = [];
    const formats = [];
    await applyIntegrations(
      directory,
      {
        type: "application",
        framework: "vue",
        language: "js",
        ui: "tdesign",
        css: "unocss",
      },
      (_cwd, deps, dev) => installs.push({ deps, dev }),
      (_cwd, target) => formats.push(target),
    );
    assert.match(await readFile(join(directory, "vite.config.js"), "utf8"), /TDesignResolver/);
    assert.match(await readFile(join(directory, "src/main.js"), "utf8"), /virtual:uno.css/);
    assert.ok((await readFile(join(directory, "uno.config.js"), "utf8")).includes("presetWind3"));
    assert.equal(installs.length, 2);
    assert.equal(formats.length, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("React JavaScript 入口 main.jsx 与 vite.config.js 可生成", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vp-starter-react-js-"));
  try {
    await mkdir(join(directory, "src"));
    await writeFile(
      join(directory, "vite.config.js"),
      "import { defineConfig } from 'vite-plus'\nexport default defineConfig({ plugins: [] })\n",
    );
    await writeFile(join(directory, "src/main.jsx"), "import React from 'react'\n");
    await applyIntegrations(
      directory,
      {
        type: "application",
        framework: "react",
        language: "js",
        ui: "antd",
        css: "tailwindcss",
      },
      () => {},
      () => {},
    );
    assert.match(await readFile(join(directory, "vite.config.js"), "utf8"), /tailwindcss\(\)/);
    assert.match(await readFile(join(directory, "src/main.jsx"), "utf8"), /starter.tailwind.css/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
