import { engineScreenSmoke, engineScreenStyles } from "./engine-screen-smoke.mjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { createRequire } from "node:module";
import { inspectPath } from "./safe-paths.mjs";
import { validateProjectOptions } from "./options.mjs";
import { injectStarterPlugins } from "./vite-config.mjs";
import { runWorkspaceVp } from "./workspace.mjs";
export const cesiumDependencies = ["cesium@1.146.0"];
export const cesiumDevDependencies = ["vite-plugin-static-copy@4.1.1"];
export async function planCesium(input) {
  const options = validateProjectOptions(input);
  if (options.type !== "application" || options.engine !== "cesium")
    throw new Error("Cesium 预设需要 Application 和 engine=cesium");
  const files = {},
    ts = (options.language ?? "ts") === "ts",
    vue = options.framework === "vue";
  for (const name of [
    "lazy.mjs",
    "lazy.d.mts",
    "scene.mjs",
    "resolution.mjs",
    "demo.mjs",
    "demo.d.mts",
    "model.mjs",
  ])
    files["src/adui-cesium/" + name] = (
      await readFile(new URL("../../cesium/src/" + name, import.meta.url), "utf8")
    )
      .replaceAll("../../model-security/src/", "./")
      .replaceAll("../../screen/src/", "./");
  files["src/adui-cesium/viewport.mjs"] = await readFile(
    new URL("../../screen/src/viewport.mjs", import.meta.url),
    "utf8",
  );
  for (const name of [
    "glb.mjs",
    "adui.mjs",
    "adui.d.mts",
    "local-grant.mjs",
    "local-grant.d.mts",
    "bundled.mjs",
    "bundled.d.mts",
    "offline-keyring.mjs",
    "offline-keyring.d.mts",
  ])
    files["src/adui-cesium/" + name] = await readFile(
      new URL("../../model-security/src/" + name, import.meta.url),
      "utf8",
    );
  for (const name of ["vite.mjs", "vite.d.mts"])
    files["adui-cesium-build/" + name] = await readFile(
      new URL("../../cesium/src/" + name, import.meta.url),
      "utf8",
    );
  files["src/cesium-smoke/demo.css"] =
    "body{margin:0;background:#091322;color:#fff;font-family:system-ui}button{padding:8px;margin:8px}header{height:64px} .cesium-frame{height:calc(100dvh - 64px)}.cesium-engine,.cesium-host{width:100%;height:100%;position:relative}.cesium-controls{position:absolute;top:8px;left:8px;background:#10243eee;padding:6px;z-index:1}";
  const ext = vue ? (ts ? "ts" : "js") : ts ? "tsx" : "jsx";
  if (vue) {
    files["src/cesium-smoke/GlobeView.vue"] = `<script setup${ts ? ' lang="ts"' : ""}>
import {ref,onMounted,onBeforeUnmount} from 'vue'
import {mountGlobeDemo} from '../adui-cesium/demo.mjs'
const host=ref${ts ? "<HTMLDivElement|null>" : ""}(null)
let cleanup${ts ? ": (()=>void)|undefined" : ""}
onMounted(()=>{if(host.value)cleanup=mountGlobeDemo(host.value)})
onBeforeUnmount(()=>cleanup?.())
</script><template><div ref="host" class="cesium-engine"/></template>`;
    files["src/cesium-smoke/App.vue"] = engineScreenSmoke({
      engine: "cesium",
      view: "GlobeView",
      vue,
      ts,
      ext,
    });
    files["src/cesium-smoke/main." + ext] =
      "import {createApp} from 'vue'\nimport App from './App.vue'\ncreateApp(App).mount('#cesium-root')\n";
  } else {
    files["src/cesium-smoke/GlobeView." + ext] = `import {useRef,useEffect} from 'react'
import {mountGlobeDemo} from '../adui-cesium/demo.mjs'
export default function GlobeView(){const host=useRef${ts ? "<HTMLDivElement|null>" : ""}(null);useEffect(()=>{if(host.current)return mountGlobeDemo(host.current)},[]);return <div ref={host} className="cesium-engine"/>}`;
    files["src/cesium-smoke/App." + ext] = engineScreenSmoke({
      engine: "cesium",
      view: "GlobeView",
      vue,
      ts,
      ext,
    });
    files["src/cesium-smoke/main." + ext] =
      `import {createRoot} from 'react-dom/client'\nimport App from './App.${ext}'\nconst root=document.getElementById('cesium-root');if(root)createRoot(root).render(<App/>)\n`;
  }
  files["cesium-smoke.html"] =
    `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>ADui Cesium</title></head><body><div id="cesium-root"></div><script type="module" src="/src/cesium-smoke/main.${ext}"></script></body></html>`;
  files["src/cesium-smoke/demo.css"] += engineScreenStyles;
  return { files, previewPath: "/cesium-smoke.html" };
}
export async function preflightCesium(directory, input, requireScreen = true) {
  const options = validateProjectOptions(input),
    plan = await planCesium(options);
  for (const path of ["src/adui-cesium", "src/cesium-smoke", "adui-cesium-build"]) {
    const stat = await inspectPath(join(directory, path));
    if (stat && !stat.isDirectory()) throw new Error("Cesium 目录被占用：" + path);
  }
  if (await inspectPath(join(directory, "public/adui-cesium")))
    throw new Error("public/adui-cesium 为预设保留资源路径，拒绝覆盖");
  for (const path of Object.keys(plan.files))
    if (await inspectPath(join(directory, path)))
      throw new Error("Cesium 文件已存在，拒绝覆盖：" + path);
  const manifestPath = join(directory, "package.json");
  await inspectPath(manifestPath);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")),
    deps = { ...manifest.devDependencies, ...manifest.dependencies };
  if (!deps["vite-plus"] || !deps[options.framework])
    throw new Error("Cesium 需要所选框架的 Vite+ 应用");
  const ts = (options.language ?? "ts") === "ts",
    entry =
      options.framework === "vue" ? (ts ? "main.ts" : "main.js") : ts ? "main.tsx" : "main.jsx";
  if (!(await inspectPath(join(directory, "src", entry)))?.isFile())
    throw new Error("缺少所选框架/语言的入口");
  for (const spec of [...cesiumDependencies, ...cesiumDevDependencies]) {
    const [name, version] = spec.split("@");
    let selected = deps[name];
    if (selected === "catalog:") {
      try {
        const require = createRequire(manifestPath);
        let current = dirname(require.resolve(name)),
          found = false;
        for (;;) {
          try {
            const metadata = JSON.parse(await readFile(join(current, "package.json"), "utf8"));
            if (metadata.name === name) {
              selected = metadata.version;
              found = true;
              break;
            }
          } catch (error) {
            if (error.code !== "ENOENT") throw error;
          }
          if (dirname(current) === current) break;
          current = dirname(current);
        }
        if (!found) throw new Error("package metadata missing");
      } catch {
        throw new Error("无法确认 catalog 中 " + name + " 的已安装版本");
      }
    }
    if (selected && selected !== version)
      throw new Error("已有 " + name + " 版本未经验证，拒绝升级");
  }
  if (requireScreen)
    for (const name of [
      "core.mjs",
      "controller.mjs",
      options.framework + ".mjs",
      "config." + ((options.language ?? "ts") === "ts" ? "ts" : "js"),
    ])
      if (!(await inspectPath(join(directory, "src/adui-screen", name)))?.isFile())
        throw new Error("请先安装所选框架/语言的大屏预设");
  const configs = [];
  for (const name of ["vite.config.ts", "vite.config.mts", "vite.config.js", "vite.config.mjs"])
    if (await inspectPath(join(directory, name))) configs.push(join(directory, name));
  if (configs.length !== 1) throw new Error("无法唯一识别 Vite 配置");
  const configPath = configs[0],
    source = await readFile(configPath, "utf8"),
    backup = configPath + ".before-adui-cesium";
  if (await inspectPath(backup)) throw new Error("Cesium 配置备份已存在，拒绝覆盖");
  if (source.includes("aduiCesium")) throw new Error("Cesium 配置已存在");
  const config = injectStarterPlugins(source, {
    imports: ["import {aduiCesium} from './adui-cesium-build/vite.mjs'"],
    plugins: ["...aduiCesium()"],
  });
  return { plan, deps, configPath, source, backup, config };
}
export async function addCesium(directory, input, runner = runWorkspaceVp) {
  const before = await preflightCesium(directory, input);
  for (const [spec, dev] of [
    [cesiumDependencies[0], false],
    [cesiumDevDependencies[0], true],
  ])
    if (!before.deps[spec.split("@")[0]])
      await runner(directory, ["add", ...(dev ? ["-D"] : []), spec, "--save-exact"]);
  const current = await preflightCesium(directory, input);
  if (current.source !== before.source) throw new Error("安装期间 Vite 配置变化，拒绝覆盖");
  for (const [path, source] of Object.entries(current.plan.files)) {
    const target = join(directory, path);
    await mkdir(dirname(target), { recursive: true });
    await inspectPath(target);
    await writeFile(target, source, { flag: "wx" });
  }
  await inspectPath(current.backup);
  await writeFile(current.backup, current.source, { flag: "wx" });
  await inspectPath(current.configPath);
  await writeFile(current.configPath, current.config);
  await runner(directory, [
    "fmt",
    "src/adui-cesium",
    "src/cesium-smoke",
    "adui-cesium-build",
    "cesium-smoke.html",
    relative(directory, current.configPath),
    "package.json",
    "--write",
  ]);
  return current.plan;
}
