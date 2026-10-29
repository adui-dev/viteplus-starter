import { engineScreenSmoke, engineScreenStyles } from "./engine-screen-smoke.mjs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";
import { inspectPath } from "./safe-paths.mjs";
import { validateProjectOptions } from "./options.mjs";
import { runWorkspaceVp } from "./workspace.mjs";
export const babylonVersion = "9.32.1";
export async function planBabylon(input) {
  const options = validateProjectOptions(input);
  if (options.type !== "application" || options.engine !== "babylon")
    throw new Error("Babylon 预设需要 Application 和 engine=babylon");
  const ts = (options.language ?? "ts") === "ts",
    vue = options.framework === "vue",
    ext = vue ? (ts ? "ts" : "js") : ts ? "tsx" : "jsx",
    files = {};
  for (const name of [
    "runtime.mjs",
    "scene.mjs",
    "resolution.mjs",
    "lazy.mjs",
    "lazy.d.mts",
    "demo.mjs",
    "demo.d.mts",
    "model.mjs",
    "loader.mjs",
  ])
    files["src/adui-babylon/" + name] = (
      await readFile(new URL("../../babylon/src/" + name, import.meta.url), "utf8")
    )
      .replaceAll("../../model-security/src/", "./")
      .replaceAll("../../screen/src/", "./");
  files["src/adui-babylon/viewport.mjs"] = await readFile(
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
    files["src/adui-babylon/" + name] = await readFile(
      new URL("../../model-security/src/" + name, import.meta.url),
      "utf8",
    );
  files["src/babylon-smoke/demo.css"] =
    "body{margin:0;background:#091322;color:#fff;font-family:system-ui}button{padding:8px;margin:8px}header{height:64px}.babylon-frame{height:calc(100dvh - 64px)}.babylon-engine,.babylon-host{width:100%;height:100%;position:relative}.babylon-canvas{width:100%;height:100%;display:block;touch-action:none}.babylon-controls{position:absolute;top:8px;left:8px;background:#10243eee;padding:6px;z-index:1}";
  if (vue) {
    files["src/babylon-smoke/BabylonView.vue"] = `<script setup${ts ? ' lang="ts"' : ""}>
import {ref,onMounted,onBeforeUnmount} from 'vue'
import {mountBabylonDemo} from '../adui-babylon/demo.mjs'
const host=ref${ts ? "<HTMLDivElement|null>" : ""}(null)
let cleanup${ts ? ": (()=>void)|undefined" : ""}
onMounted(()=>{if(host.value)cleanup=mountBabylonDemo(host.value)})
onBeforeUnmount(()=>cleanup?.())
</script><template><div ref="host" class="babylon-engine"/></template>`;
    files["src/babylon-smoke/App.vue"] = engineScreenSmoke({
      engine: "babylon",
      view: "BabylonView",
      vue,
      ts,
      ext,
    });
    files["src/babylon-smoke/main." + ext] =
      "import {createApp} from 'vue'\nimport App from './App.vue'\ncreateApp(App).mount('#babylon-root')\n";
  } else {
    files["src/babylon-smoke/BabylonView." + ext] = `import {useRef,useEffect} from 'react'
import {mountBabylonDemo} from '../adui-babylon/demo.mjs'
export default function BabylonView(){const host=useRef${ts ? "<HTMLDivElement|null>" : ""}(null);useEffect(()=>{if(host.current)return mountBabylonDemo(host.current)},[]);return <div ref={host} className="babylon-engine"/>}`;
    files["src/babylon-smoke/App." + ext] = engineScreenSmoke({
      engine: "babylon",
      view: "BabylonView",
      vue,
      ts,
      ext,
    });
    files["src/babylon-smoke/main." + ext] =
      `import {createRoot} from 'react-dom/client'\nimport App from './App.${ext}'\nconst root=document.getElementById('babylon-root');if(root)createRoot(root).render(<App/>)\n`;
  }
  files["babylon-smoke.html"] =
    `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>ADui Babylon</title></head><body><div id="babylon-root"></div><script type="module" src="/src/babylon-smoke/main.${ext}"></script></body></html>`;
  files["src/babylon-smoke/demo.css"] += engineScreenStyles;
  return { files, previewPath: "/babylon-smoke.html" };
}
export async function preflightBabylon(directory, input, requireScreen = true) {
  const options = validateProjectOptions(input),
    plan = await planBabylon(options);
  for (const path of ["src/adui-babylon", "src/babylon-smoke"]) {
    const stat = await inspectPath(join(directory, path));
    if (stat && !stat.isDirectory()) throw new Error("Babylon 目录被占用");
  }
  for (const path of Object.keys(plan.files))
    if (await inspectPath(join(directory, path)))
      throw new Error("Babylon 文件已存在，拒绝覆盖：" + path);
  const manifestPath = join(directory, "package.json");
  await inspectPath(manifestPath);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")),
    deps = { ...manifest.devDependencies, ...manifest.dependencies };
  if (!deps["vite-plus"] || !deps[options.framework])
    throw new Error("Babylon 需要所选框架的 Vite+ 应用");
  for (const dependency of ["@babylonjs/core", "@babylonjs/loaders"]) {
    let version = deps[dependency];
    if (version === "catalog:") {
      const require = createRequire(manifestPath);
      try {
        const metadata = JSON.parse(
          await readFile(require.resolve(dependency + "/package.json"), "utf8"),
        );
        if (metadata.name !== dependency || typeof metadata.version !== "string")
          throw new Error("缺少依赖版本元数据");
        version = metadata.version;
      } catch {
        throw new Error("无法确认 Babylon catalog 的已安装版本");
      }
    }
    if (version && version !== babylonVersion)
      throw new Error("已有 Babylon 版本未经验证，拒绝升级");
  }
  const ts = (options.language ?? "ts") === "ts",
    entry =
      options.framework === "vue" ? (ts ? "main.ts" : "main.js") : ts ? "main.tsx" : "main.jsx";
  const paths = [
    "src/" + entry,
    ...(requireScreen
      ? [
          "core.mjs",
          "controller.mjs",
          options.framework + ".mjs",
          "config." + (ts ? "ts" : "js"),
        ].map((name) => "src/adui-screen/" + name)
      : []),
  ];
  for (const path of paths)
    if (!(await inspectPath(join(directory, path)))?.isFile())
      throw new Error("缺少所选框架/语言的入口或大屏预设：" + path);
  return { plan, dependencies: deps };
}
export async function addBabylon(directory, input, runner = runWorkspaceVp) {
  const before = await preflightBabylon(directory, input);
  if (!before.dependencies["@babylonjs/core"])
    await runner(directory, ["add", "@babylonjs/core@" + babylonVersion, "--save-exact"]);
  if (!before.dependencies["@babylonjs/loaders"])
    await runner(directory, ["add", "@babylonjs/loaders@" + babylonVersion, "--save-exact"]);
  const current = await preflightBabylon(directory, input);
  for (const [path, source] of Object.entries(current.plan.files)) {
    const target = join(directory, path);
    await mkdir(dirname(target), { recursive: true });
    await inspectPath(target);
    await writeFile(target, source, { flag: "wx" });
  }
  await runner(directory, [
    "fmt",
    "src/adui-babylon",
    "src/babylon-smoke",
    "babylon-smoke.html",
    "package.json",
    "--write",
  ]);
  return current.plan;
}
