import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { validateProjectOptions } from "./options.mjs";
import { runWorkspaceVp } from "./workspace.mjs";
import { demoCss, vueDemo, reactDemo } from "./screen-demo.mjs";

export async function planThreeSmoke(input) {
  const options = validateProjectOptions(input);
  if (options.type !== "application") throw new Error("Three Smoke 仅支持 Application");
  const ts = (options.language ?? "ts") === "ts",
    vue = options.framework === "vue";
  const ext = vue ? (ts ? "ts" : "js") : ts ? "tsx" : "jsx";
  const files = {};
  for (const name of ["index.mjs", "index.d.mts", "runtime.mjs"])
    files["src/adui-three/" + name] = await readFile(
      new URL("../../three/src/" + name, import.meta.url),
      "utf8",
    );
  const statusType = ts
    ? "import type { ThreeStatus, ThreeHandle } from '../adui-three/index.mjs'\n"
    : "";
  if (vue) {
    files["src/three-smoke/ThreeView.vue"] = [
      "<script setup" + (ts ? ' lang="ts"' : "") + ">",
      "import { ref, onMounted, onBeforeUnmount, watch } from 'vue'",
      "import { createThreeScene } from '../adui-three/index.mjs'",
      statusType,
      "const props=defineProps({pixelRatio:{type:Number,default:0}})",
      ts
        ? "const emit=defineEmits<{status:[value:ThreeStatus];error:[message:string]}>()"
        : "const emit=defineEmits(['status','error'])",
      "const host=ref" + (ts ? "<HTMLDivElement|null>" : "") + "(null)",
      "let scene" + (ts ? ": ThreeHandle|undefined" : ""),
      "onMounted(()=>{try{if(host.value)scene=createThreeScene(host.value,{pixelRatio:props.pixelRatio||undefined,onStatus:value=>emit('status',value),onError:error=>emit('error',String(error))})}catch(error){emit('error',String(error))}})",
      "watch(()=>props.pixelRatio,value=>scene?.setPixelRatio(value||undefined))",
      "onBeforeUnmount(()=>scene?.destroy())",
      '</script><template><div ref="host" class="three-host" /></template>',
    ].join("\n");
    files["src/three-smoke/ScreenDemo.vue"] = vueDemo(ts)
      .replace(
        "import './demo.css'",
        "import ThreeView from './ThreeView.vue'\nimport './demo.css'",
      )
      .replace("const screen =", "const stats=ref('等待 WebGL'), dpr=ref(0)\nconst screen =")
      .replace("ADui Screen · Vue", "Three.js · Vue")
      .replace(
        '<div class="engine-grid" data-screen-engine @pointerdown="pick">ENGINE · 原生像素视口 · transform: none</div>',
        '<ThreeView :pixel-ratio="dpr" @status="stats=JSON.stringify($event)" @error="message=$event" />',
      )
      .replace(
        "<span>{{message}}</span>",
        '<select v-model.number="dpr" aria-label="DPR"><option :value="0">自动 DPR</option><option :value="1">DPR 1</option><option :value="2">DPR 2</option></select><span data-three-status>{{stats}}</span><span role="status">{{message}}</span>',
      )
      .replace('@click="clicks++"', '@click="clicks++" @pointerdown="pick"');
    files["src/three-smoke/main." + ext] =
      "import {createApp} from 'vue'\nimport ScreenDemo from './ScreenDemo.vue'\ncreateApp(ScreenDemo).mount('#three-root')\n";
  } else {
    files["src/three-smoke/ThreeView." + ext] = [
      "import {useEffect,useRef,useState} from 'react'",
      "import {createThreeScene} from '../adui-three/index.mjs'",
      statusType,
      "export default function ThreeView({pixelRatio,onStatus,onError}" +
        (ts
          ? ": {pixelRatio:number;onStatus:(value:ThreeStatus)=>void;onError:(message:string)=>void}"
          : "") +
        "){",
      "const [host,setHost]=useState" + (ts ? "<HTMLDivElement|null>" : "") + "(null)",
      "const scene=useRef" + (ts ? "<ThreeHandle|undefined>" : "") + "(undefined)",
      "const latest=useRef({pixelRatio,onStatus,onError})",
      "useEffect(()=>{latest.current={pixelRatio,onStatus,onError}})",
      "useEffect(()=>{if(!host)return;try{scene.current=createThreeScene(host,{pixelRatio:latest.current.pixelRatio||undefined,onStatus:value=>latest.current.onStatus(value),onError:error=>latest.current.onError(String(error))})}catch(error){latest.current.onError(String(error))}return()=>{scene.current?.destroy();scene.current=undefined}},[host])",
      "useEffect(()=>scene.current?.setPixelRatio(pixelRatio||undefined),[pixelRatio])",
      'return <div ref={setHost} className="three-host"/>',
      "}",
    ].join("\n");
    files["src/three-smoke/ScreenDemo." + ext] = reactDemo(ts)
      .replace(
        "import './demo.css'",
        "import ThreeView from './ThreeView." + ext + "'\nimport './demo.css'",
      )
      .replace(
        " const screen =",
        " const [stats,setStats]=useState('等待 WebGL'),[dpr,setDpr]=useState(0)\n const screen =",
      )
      .replace("ADui Screen · React", "Three.js · React")
      .replace(
        '<div className="engine-grid" data-screen-engine onPointerDown={pick}>ENGINE · 原生像素视口 · transform: none</div>',
        "<ThreeView pixelRatio={dpr} onStatus={value=>setStats(JSON.stringify(value))} onError={setMessage}/>",
      )
      .replace(
        "<span>{message}</span>",
        '<select aria-label="DPR" value={dpr} onChange={event=>setDpr(Number(event.target.value))}><option value="0">自动 DPR</option><option value="1">DPR 1</option><option value="2">DPR 2</option></select><span data-three-status>{stats}</span><span role="status">{message}</span>',
      )
      .replace(
        "<button data-screen-button onClick=",
        "<button data-screen-button onPointerDown={pick} onClick=",
      );
    files["src/three-smoke/main." + ext] =
      "import {createRoot} from 'react-dom/client'\nimport ScreenDemo from './ScreenDemo." +
      ext +
      "'\nconst root=document.getElementById('three-root');if(root)createRoot(root).render(<ScreenDemo/>)\n";
  }
  const demoPath = "src/three-smoke/" + (vue ? "ScreenDemo.vue" : "ScreenDemo." + ext);
  files[demoPath] = files[demoPath]
    .replaceAll("PointerEvent<HTMLDivElement>", "PointerEvent<HTMLElement>")
    .replaceAll("点击引擎网格测试坐标", "点击立方体拾取；HUD 按钮测试设计坐标");
  files["src/three-smoke/demo.css"] =
    demoCss +
    "\n.three-host{width:100%;height:100%}[data-three-status]{font:12px monospace;max-width:650px;overflow-wrap:anywhere}";
  files["three-smoke.html"] =
    '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>ADui Three Smoke</title></head><body><div id="three-root"></div><script type="module" src="/src/three-smoke/main.' +
    ext +
    '"></script></body></html>';
  return { files, previewPath: "/three-smoke.html" };
}
async function inspect(path) {
  try {
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) throw new Error("Three 目标不允许链接或 junction：" + path);
    return stat;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
export async function addThreeSmoke(directory, input, runner = runWorkspaceVp) {
  const options = validateProjectOptions(input),
    plan = await planThreeSmoke(options);
  async function preflight() {
    for (const path of ["", "src", "src/adui-screen", "src/adui-three", "src/three-smoke"]) {
      const stat = await inspect(join(directory, path));
      if (stat && !stat.isDirectory()) throw new Error("Three 目标目录被占用：" + path);
    }
    for (const path of Object.keys(plan.files))
      if (await inspect(join(directory, path)))
        throw new Error("Three 文件已存在，拒绝覆盖：" + path);
  }
  await preflight();
  const manifestPath = join(directory, "package.json");
  if (!(await inspect(manifestPath))?.isFile()) throw new Error("缺少应用 package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")),
    deps = { ...manifest.devDependencies, ...manifest.dependencies };
  if (!deps["vite-plus"] || !deps[options.framework])
    throw new Error("Three Smoke 需要所选框架的 Vite+ 应用");
  const ts = (options.language ?? "ts") === "ts";
  const main =
    options.framework === "vue" ? (ts ? "main.ts" : "main.js") : ts ? "main.tsx" : "main.jsx";
  for (const path of [
    "src/" + main,
    "src/adui-screen/core.mjs",
    "src/adui-screen/controller.mjs",
    "src/adui-screen/style.css",
    "src/adui-screen/" + options.framework + ".mjs",
    "src/adui-screen/config." + (ts ? "ts" : "js"),
  ])
    if (!(await inspect(join(directory, path)))?.isFile())
      throw new Error("请先按所选框架/语言运行 --screen；缺少 " + path);
  for (const [name, version] of [
    ["three", "0.186.1"],
    ["@types/three", "0.186.0"],
  ]) {
    if (deps[name] && ![version, "^" + version, "~" + version].includes(deps[name]))
      throw new Error("已有 " + name + " 版本未经本预设验证，拒绝自动升级：" + deps[name]);
  }
  if (!deps.three) runner(directory, ["add", "three@0.186.1", "--save-exact"]);
  if (!deps["@types/three"])
    runner(directory, ["add", "-D", "@types/three@0.186.0", "--save-exact"]);
  await preflight();
  for (const [path, source] of Object.entries(plan.files)) {
    const target = join(directory, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, source, { flag: "wx" });
  }
  runner(directory, [
    "fmt",
    "src/adui-three",
    "src/three-smoke",
    "three-smoke.html",
    "package.json",
    "--write",
  ]);
  return plan;
}
