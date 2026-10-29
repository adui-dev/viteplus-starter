import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { validateProjectOptions } from "./options.mjs";
import { inspectPath } from "./safe-paths.mjs";

const presets = {
  vue: {
    tdesign: {
      name: "TDesign",
      package: "tdesign-vue-next",
      resolver: "TDesignResolver",
      style: "tdesign-vue-next/es/style/index.css",
      tag: "t-button",
      primary: 'theme="primary"',
    },
    "element-plus": {
      name: "Element Plus",
      package: "element-plus",
      resolver: "ElementPlusResolver",
      tag: "el-button",
      primary: 'type="primary"',
    },
    antd: {
      name: "Ant Design Vue",
      package: "ant-design-vue",
      resolver: "AntDesignVueResolver",
      style: "ant-design-vue/dist/reset.css",
      tag: "a-button",
      primary: 'type="primary"',
    },
  },
  react: {
    antd: {
      name: "Ant Design",
      package: "antd",
      style: "antd/dist/reset.css",
      primary: 'type="primary"',
    },
    tdesign: {
      name: "TDesign",
      package: "tdesign-react",
      style: "tdesign-react/es/style/index.css",
      primary: 'theme="primary"',
    },
  },
};

function htmlPage(mainFile) {
  return [
    "<!doctype html>",
    '<html lang="zh-CN">',
    "  <head>",
    '    <meta charset="UTF-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    "    <title>ADui UI Smoke</title>",
    "  </head>",
    "  <body>",
    '    <div id="ui-smoke-root"></div>',
    '    <script type="module" src="/src/ui-smoke/' + mainFile + '"></script>',
    "  </body>",
    "</html>",
    "",
  ].join("\n");
}

function vueComponent(css, preset) {
  const lines = [
    "<script setup>",
    "import { ref } from 'vue'",
    "",
    "const clicks = ref(0)",
    "</script>",
    "",
    "<template>",
    '  <main style="max-width: 680px; margin: 64px auto; padding: 24px; font-family: sans-serif">',
    `    <h1>ADui UI Smoke — Vue + ${preset.name}</h1>`,
    "    <p>测试组件渲染、CSS 样式和点击交互，不修改应用首页。</p>",
    `    <${preset.tag} ${preset.primary} data-ui-smoke-button @click="clicks += 1">${preset.name} 按钮</${preset.tag}>`,
    "    <p data-ui-smoke-count>点击次数：{{ clicks }}</p>",
  ];
  if (css !== "none") {
    lines.push(
      '    <div data-ui-smoke-css class="mt-5 rounded-lg bg-emerald-100 p-4 text-emerald-800">',
      "      原子化样式测试：应显示浅绿色背景与深绿色文字",
      "    </div>",
    );
  }
  lines.push("  </main>", "</template>", "");
  return lines.join("\n");
}

function reactComponent(css, preset) {
  const lines = ["import { useState } from 'react'", `import { Button } from '${preset.package}'`];
  lines.push(
    "",
    "export default function SmokeApp() {",
    "  const [clicks, setClicks] = useState(0)",
    "  return (",
    "    <main style={{ maxWidth: 680, margin: '64px auto', padding: 24, fontFamily: 'sans-serif' }}>",
    `      <h1>ADui UI Smoke — React + ${preset.name}</h1>`,
    "      <p>测试组件渲染、CSS 样式和点击交互，不修改应用首页。</p>",
    `      <Button ${preset.primary} data-ui-smoke-button onClick={() => setClicks((value) => value + 1)}>`,
    `        ${preset.name} 按钮`,
    "      </Button>",
    "      <p data-ui-smoke-count>点击次数：{clicks}</p>",
  );
  if (css !== "none") {
    lines.push(
      '      <div data-ui-smoke-css className="mt-5 rounded-lg bg-emerald-100 p-4 text-emerald-800">',
      "        原子化样式测试：应显示浅绿色背景与深绿色文字",
      "      </div>",
    );
  }
  lines.push("    </main>", "  )", "}", "");
  return lines.join("\n");
}

export function planUiSmoke(input) {
  const options = validateProjectOptions(input);
  const { type, framework, language = "ts", ui = "none", css = "none" } = options;
  if (type !== "application") throw new Error("UI Smoke 仅支持独立 Application");
  const preset = presets[framework]?.[ui];
  if (!preset) throw new Error("UI Smoke 需要选择与框架兼容的 UI 组件库");
  const extension =
    framework === "vue" ? (language === "js" ? "js" : "ts") : language === "js" ? "jsx" : "tsx";
  const mainFile = "main." + extension;
  const files = { "ui-smoke.html": htmlPage(mainFile) };
  if (framework === "vue") {
    const imports = ["import { createApp } from 'vue'", "import SmokeApp from './SmokeApp.vue'"];
    if (preset.style) imports.push(`import '${preset.style}'`);
    if (css === "unocss") imports.push("import 'virtual:uno.css'");
    if (css === "tailwindcss") imports.push("import '../starter.tailwind.css'");
    files["src/ui-smoke/" + mainFile] =
      imports.join("\n") + "\n\ncreateApp(SmokeApp).mount('#ui-smoke-root')\n";
    files["src/ui-smoke/SmokeApp.vue"] = vueComponent(css, preset);
  } else {
    const imports = [
      "import { createRoot } from 'react-dom/client'",
      `import SmokeApp from './SmokeApp.${extension}'`,
      `import '${preset.style}'`,
    ];
    if (css === "tailwindcss") imports.push("import '../starter.tailwind.css'");
    if (css === "unocss") imports.push("import 'virtual:uno.css'");
    files["src/ui-smoke/" + mainFile] =
      imports.join("\n") +
      "\n\nconst root = document.getElementById('ui-smoke-root')\nif (root) createRoot(root).render(<SmokeApp />)\n";
    files["src/ui-smoke/SmokeApp." + extension] = reactComponent(css, preset);
  }
  return { framework, language, ui, css, files, previewPath: "/ui-smoke.html" };
}

function formatNewFiles(directory) {
  for (const target of ["src/ui-smoke", "ui-smoke.html"]) {
    const args = ["fmt", target, "--write"];
    const result =
      process.platform === "win32"
        ? spawnSync(["vp", ...args].join(" "), { cwd: directory, stdio: "inherit", shell: true })
        : spawnSync("vp", args, { cwd: directory, stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error("格式化 UI Smoke 文件失败：vp " + args.join(" "));
  }
}

async function fileExists(path) {
  return Boolean(await inspectPath(path, "UI Smoke"));
}

export async function addUiSmoke(directory, options, formatter = formatNewFiles) {
  const plan = planUiSmoke(options);
  await inspectPath(join(directory, "package.json"), "UI Smoke");
  const manifest = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
  const preset = presets[plan.framework][plan.ui];
  const componentPackage = preset.package;
  if (
    !dependencies["vite-plus"] ||
    !dependencies[plan.framework] ||
    !dependencies[componentPackage]
  ) {
    throw new Error("目标必须是已安装对应 UI 组件库的 Vite+ 应用");
  }
  const entry =
    plan.framework === "vue"
      ? "main." + (plan.language === "js" ? "js" : "ts")
      : "main." + (plan.language === "js" ? "jsx" : "tsx");
  if (!(await fileExists(join(directory, "src", entry)))) {
    throw new Error("目标项目的框架/语言与参数不匹配");
  }
  const candidates = ["vite.config.ts", "vite.config.mts", "vite.config.js", "vite.config.mjs"];
  const configs = [];
  for (const filename of candidates) {
    if (await fileExists(join(directory, filename))) configs.push(filename);
  }
  if (configs.length !== 1) throw new Error("无法唯一识别 Vite+ 配置文件");
  const config = await readFile(join(directory, configs[0]), "utf8");
  if (plan.framework === "vue" && !config.includes(preset.resolver)) {
    throw new Error(`未发现 Vue ${preset.name} 自动导入配置`);
  }
  if (plan.css === "unocss" && !config.includes("UnoCSS")) {
    throw new Error("未发现 UnoCSS 插件配置");
  }
  if (plan.css === "tailwindcss" && !config.includes("tailwindcss()")) {
    throw new Error("未发现 Tailwind CSS 插件配置");
  }
  for (const relative of Object.keys(plan.files)) {
    if (await fileExists(join(directory, relative))) {
      throw new Error("UI Smoke 文件已存在，拒绝覆盖：" + relative);
    }
  }
  await mkdir(join(directory, "src", "ui-smoke"), { recursive: true });
  for (const [relative, content] of Object.entries(plan.files)) {
    await inspectPath(join(directory, relative), "UI Smoke");
    await writeFile(join(directory, relative), content, { flag: "wx" });
  }
  formatter(directory);
  return { previewPath: plan.previewPath, written: Object.keys(plan.files) };
}
