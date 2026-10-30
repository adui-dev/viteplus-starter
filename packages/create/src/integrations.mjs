import { spawnSync } from "node:child_process";
import { readFile, rename, writeFile } from "node:fs/promises";
import { join, relative, dirname, basename } from "node:path";
import { inspectPath } from "./safe-paths.mjs";
import { prepareUiBuildPolicy } from "./build-policy.mjs";
import { injectStarterPlugins, repairLegacyStarterConfig } from "./vite-config.mjs";
import { ignoreGeneratedVueComponentDeclarations } from "./format-config.mjs";

const UI = {
  none: [[], []],
  "element-plus": [["element-plus"], ["unplugin-vue-components"]],
  antd: [["ant-design-vue"], ["unplugin-vue-components"]],
  tdesign: [
    ["tdesign-vue-next"],
    ["unplugin-vue-components", "@tdesign-vue-next/auto-import-resolver"],
  ],
};

export function planIntegrations({ type, framework, ui = "none", css = "none" }) {
  if (
    !["none", "element-plus", "antd", "tdesign"].includes(ui) ||
    !["none", "unocss", "tailwindcss"].includes(css)
  ) {
    throw new Error("无效 UI 或 CSS 选项");
  }
  if (type === "monorepo") {
    if (ui !== "none" || css !== "none") throw new Error("Monorepo 根目录不可配置 UI/CSS");
    return { ui, css, dependencies: [], devDependencies: [] };
  }
  if (type !== "application" || !["vue", "react"].includes(framework)) {
    throw new Error("必须选择有效的 Application 框架");
  }
  if (framework === "react" && ui === "element-plus") {
    throw new Error("Element Plus 仅支持 Vue");
  }
  const [dependencies, devDependencies] =
    framework === "vue"
      ? UI[ui]
      : [ui === "antd" ? ["antd"] : ui === "tdesign" ? ["tdesign-react"] : [], []];
  return {
    ui,
    css,
    dependencies: [...dependencies],
    devDependencies: [
      ...devDependencies,
      ...(css === "unocss" ? ["unocss"] : []),
      ...(css === "tailwindcss" ? ["tailwindcss", "@tailwindcss/vite"] : []),
    ],
  };
}

export function generateIntegration(options, viteConfig, mainSource, { repair = false } = {}) {
  const plan = planIntegrations({ type: "application", ...options });
  if (plan.ui === "none" && plan.css === "none") return null;
  if (!repair && viteConfig.includes("starterPlugins")) throw new Error("Starter 配置已存在");
  const imports = [];
  const plugins = [];
  const mainImports = [];
  const files = {};
  const { framework, language = "ts", ui = "none", css = "none" } = options;

  if (framework === "vue" && ui !== "none") {
    imports.push("import Components from 'unplugin-vue-components/vite'");
    const resolvers = {
      "element-plus": [
        "import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'",
        "ElementPlusResolver()",
      ],
      antd: [
        "import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'",
        "AntDesignVueResolver({ importStyle: false })",
      ],
      tdesign: [
        "import { TDesignResolver } from '@tdesign-vue-next/auto-import-resolver'",
        "TDesignResolver({ library: 'vue-next' })",
      ],
    };
    const [importLine, resolver] = resolvers[ui];
    imports.push(importLine);
    plugins.push(
      `Components({ resolvers: [${resolver}], dts: ${language === "ts" ? "'src/components.d.ts'" : "false"} })`,
    );
    if (ui === "tdesign") mainImports.push("import 'tdesign-vue-next/es/style/index.css'");
  }
  if (framework === "react" && ui === "antd") mainImports.push("import 'antd/dist/reset.css'");
  if (framework === "react" && ui === "tdesign")
    mainImports.push("import 'tdesign-react/es/style/index.css'");
  if (css === "unocss") {
    imports.push("import UnoCSS from 'unocss/vite'");
    plugins.push("UnoCSS()");
    mainImports.push("import 'virtual:uno.css'");
    files[`uno.config.${language === "js" ? "js" : "ts"}`] =
      "import { defineConfig, presetWind3 } from 'unocss'\n\nexport default defineConfig({ presets: [presetWind3()] })\n";
  }
  if (css === "tailwindcss") {
    imports.push("import tailwindcss from '@tailwindcss/vite'");
    plugins.push("tailwindcss()");
    mainImports.push("import './starter.tailwind.css'");
    files["src/starter.tailwind.css"] = '@import "tailwindcss";\n';
  }
  const entryName = `src/main.${framework === "vue" ? (language === "js" ? "js" : "ts") : language === "js" ? "jsx" : "tsx"}`;
  files[entryName] = mainImports.length ? mainImports.join("\n") + "\n" + mainSource : mainSource;
  if (!plugins.length) return { config: viteConfig, files };
  const pluginConfig = repair
    ? repairLegacyStarterConfig(viteConfig, { imports, plugins })
    : injectStarterPlugins(viteConfig, { imports, plugins });
  const config =
    framework === "vue" && ui !== "none" && language === "ts" && !options.workspace
      ? ignoreGeneratedVueComponentDeclarations(pluginConfig)
      : pluginConfig;
  return { config, files };
}

function runCommand(cwd, command, args) {
  const result =
    process.platform === "win32"
      ? spawnSync([command, ...args].join(" "), { cwd, stdio: "inherit", shell: true })
      : spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("执行失败：" + command + " " + args.join(" "));
}

function format(cwd, target = ".") {
  runCommand(cwd, "vp", ["fmt", ...(Array.isArray(target) ? target : [target]), "--write"]);
}

function install(cwd, list, dev) {
  if (!list.length) return;
  const args = ["add", ...(dev ? ["-D"] : []), ...list];
  runCommand(cwd, "pnpm", args);
}

async function resolveApplicationPaths(directory, options) {
  const language = options.language ?? "ts";
  if (!["ts", "js"].includes(language)) throw new Error("开发语言必须为 ts 或 js");
  const entry =
    options.framework === "vue"
      ? language === "js"
        ? "main.js"
        : "main.ts"
      : language === "js"
        ? "main.jsx"
        : "main.tsx";
  const mainPath = join(directory, "src", entry);
  if (!(await inspectPath(mainPath))?.isFile()) throw new Error("缺少对应语言的应用入口");
  const candidates = ["vite.config.ts", "vite.config.mts", "vite.config.js", "vite.config.mjs"];
  const existing = [];
  for (const filename of candidates) {
    if (await inspectPath(join(directory, filename))) {
      existing.push(join(directory, filename));
    }
  }
  if (existing.length !== 1) {
    throw new Error("无法唯一识别 Vite+ 官方配置文件（vite.config.ts/js/mts/mjs）");
  }
  return { configPath: existing[0], mainPath };
}

export async function preflightIntegrations(directory, options) {
  const plan = planIntegrations(options);
  if (!plan.dependencies.length && !plan.devDependencies.length) return null;
  const { configPath, mainPath } = await resolveApplicationPaths(directory, options);
  const [config, entry] = await Promise.all([
    readFile(configPath, "utf8"),
    readFile(mainPath, "utf8"),
  ]);
  const generated = generateIntegration(options, config, entry);
  async function preflight() {
    for (const path of [configPath, mainPath, join(directory, "package.json")])
      await inspectPath(path);
    if (
      (await readFile(configPath, "utf8")) !== config ||
      (await readFile(mainPath, "utf8")) !== entry
    )
      throw new Error("安装期间应用配置或入口已变化，拒绝覆盖");
    for (const path of Object.keys(generated.files)) {
      if (join(directory, path) === mainPath) continue;
      if (await inspectPath(join(directory, path)))
        throw new Error(`文件已存在，拒绝覆盖：${path}`);
    }
  }
  await preflight();
  return { plan, configPath, mainPath, generated, config, preflight };
}

export async function applyIntegrations(
  directory,
  options,
  installer = install,
  formatter = format,
) {
  const context = await preflightIntegrations(directory, options);
  if (!context) return false;
  const { plan, configPath, mainPath, generated, config, preflight } = context;
  const policyPath = await prepareUiBuildPolicy(directory, options);
  await installer(directory, plan.dependencies, false);
  await installer(directory, plan.devDependencies, true);
  await preflight();
  for (const [path, source] of Object.entries(generated.files)) {
    await inspectPath(join(directory, path));
    await writeFile(join(directory, path), source, {
      flag: join(directory, path) === mainPath ? "w" : "wx",
    });
  }
  if (generated.config !== config) {
    await inspectPath(configPath);
    await writeFile(configPath, generated.config);
  }
  const targets = [
    ...Object.keys(generated.files),
    ...(generated.config !== config ? [relative(directory, configPath)] : []),
  ];
  if (await inspectPath(join(directory, "package.json"))) targets.push("package.json");
  await formatter(directory, targets);
  if (policyPath) {
    await inspectPath(policyPath);
    await formatter(dirname(policyPath), [basename(policyPath)]);
  }
  return true;
}

export async function repairExistingIntegrations(directory, options, formatter = format) {
  if (options.language === "js") {
    throw new Error("旧版 starter.plugins.ts 迁移仅支持 TypeScript 项目");
  }
  const plan = planIntegrations(options);
  if (!plan.dependencies.length && !plan.devDependencies.length) {
    throw new Error("未选择 UI/CSS，无需修复");
  }
  const configPath = join(directory, "vite.config.ts");
  const oldFile = join(directory, "starter.plugins.ts");
  const backupFile = join(directory, "starter.plugins.ts.bak");
  for (const path of [configPath, oldFile]) await inspectPath(path);
  if (await inspectPath(backupFile)) throw new Error("旧插件备份已存在，请先人工检查，拒绝覆盖");
  const [config, legacySource] = await Promise.all([
    readFile(configPath, "utf8"),
    readFile(oldFile, "utf8"),
  ]);
  if (!/export\s+function\s+starterPlugins\s*\(/.test(legacySource)) {
    throw new Error("旧插件文件不是已知 Starter 生成格式，拒绝自动修改");
  }
  const generated = generateIntegration(options, config, "", { repair: true });
  for (const path of [configPath, oldFile]) await inspectPath(path);
  if (await inspectPath(backupFile)) throw new Error("旧插件备份已存在，拒绝覆盖");
  await writeFile(configPath, generated.config);
  await rename(oldFile, backupFile);
  formatter(directory, "vite.config.ts");
  return true;
}
