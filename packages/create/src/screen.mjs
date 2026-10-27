import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateProjectOptions } from "./options.mjs";
import { runWorkspaceVp } from "./workspace.mjs";
import { demoCss, reactDemo, vueDemo } from "./screen-demo.mjs";

const sources = fileURLToPath(new URL("../../screen/src/", import.meta.url));
export async function planScreenPreset(input) {
  const options = validateProjectOptions(input);
  if (options.type !== "application" || !options.screen)
    throw new Error("大屏预设需要 Application 和 --screen");
  const framework = options.framework,
    ts = (options.language ?? "ts") === "ts";
  const files = {};
  for (const name of [
    "core.mjs",
    "core.d.mts",
    "controller.mjs",
    "controller.d.mts",
    "style.css",
    framework + ".mjs",
    framework + ".d.mts",
  ]) {
    files["src/adui-screen/" + name] = await readFile(join(sources, name), "utf8");
  }
  const configName = "config." + (ts ? "ts" : "js");
  files["src/adui-screen/" + configName] =
    (ts ? "import type { ScreenOptions } from './core.mjs'\n" : "") +
    "export const screenConfig = " +
    JSON.stringify(options.screen, null, 2) +
    (ts ? " satisfies ScreenOptions" : "") +
    "\n";
  const ext = framework === "vue" ? (ts ? "ts" : "js") : ts ? "tsx" : "jsx";
  const main = "main." + ext;
  files["screen-smoke.html"] =
    '<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>ADui Screen Smoke</title></head><body><div id="screen-root"></div><script type="module" src="/src/screen-smoke/' +
    main +
    '"></script></body></html>\n';
  files["src/screen-smoke/demo.css"] = demoCss;
  if (framework === "vue") {
    files["src/screen-smoke/ScreenDemo.vue"] = vueDemo(ts);
    files["src/screen-smoke/" + main] =
      "import { createApp } from 'vue'\nimport ScreenDemo from './ScreenDemo.vue'\ncreateApp(ScreenDemo).mount('#screen-root')\n";
  } else {
    files["src/screen-smoke/ScreenDemo." + ext] = reactDemo(ts);
    files["src/screen-smoke/" + main] =
      "import { createRoot } from 'react-dom/client'\nimport ScreenDemo from './ScreenDemo." +
      ext +
      "'\nconst root=document.getElementById('screen-root')\nif(root)createRoot(root).render(<ScreenDemo/>)\n";
  }
  return { files, previewPath: "/screen-smoke.html", options: options.screen };
}

async function inspect(path) {
  try {
    const result = await lstat(path);
    if (result.isSymbolicLink()) throw new Error("大屏目标路径不允许符号链接或 junction：" + path);
    return result;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
export async function preflightScreenPreset(directory, plan) {
  for (const relative of ["src", "src/adui-screen", "src/screen-smoke"]) {
    const entry = await inspect(join(directory, relative));
    if (entry && !entry.isDirectory()) throw new Error("大屏目录被非目录文件占用：" + relative);
  }
  for (const relative of Object.keys(plan.files))
    if (await inspect(join(directory, relative)))
      throw new Error("大屏文件已存在，拒绝覆盖：" + relative);
}
export async function addScreenPreset(directory, input, formatter = runWorkspaceVp) {
  const options = validateProjectOptions(input);
  const plan = await planScreenPreset(options);
  const manifest = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
  if (!dependencies["vite-plus"] || !dependencies[options.framework])
    throw new Error("大屏预设仅支持已安装的对应 Vite+ 应用");
  const entry =
    options.framework === "vue"
      ? (options.language ?? "ts") === "ts"
        ? "main.ts"
        : "main.js"
      : (options.language ?? "ts") === "ts"
        ? "main.tsx"
        : "main.jsx";
  if (!(await inspect(join(directory, "src", entry)))?.isFile())
    throw new Error("大屏目标语言与应用入口不匹配");
  await preflightScreenPreset(directory, plan);
  for (const [relative, content] of Object.entries(plan.files)) {
    const target = join(directory, relative);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, { flag: "wx" });
  }
  formatter(directory, [
    "fmt",
    "src/adui-screen",
    "src/screen-smoke",
    "screen-smoke.html",
    "--write",
  ]);
  return plan;
}
