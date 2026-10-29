import { mkdir, readFile, writeFile } from "node:fs/promises";
import { inspectPath } from "./safe-paths.mjs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
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
  for (const name of [
    "index.mjs",
    "index.d.mts",
    "runtime.mjs",
    "model.mjs",
    "lazy.mjs",
    "lazy.d.mts",
  ])
    files["src/adui-three/" + name] = (
      await readFile(new URL("../../three/src/" + name, import.meta.url), "utf8")
    ).replaceAll("../../model-security/src/", "./");
  for (const name of [
    "adui.mjs",
    "glb.mjs",
    "adui.d.mts",
    "local-grant.mjs",
    "local-grant.d.mts",
    "offline-keyring.mjs",
    "offline-keyring.d.mts",
    "bundled.mjs",
    "bundled.d.mts",
  ])
    files["src/adui-three/" + name] = await readFile(
      new URL("../../model-security/src/" + name, import.meta.url),
      "utf8",
    );
  const statusType = ts
    ? "import type { ThreeStatus } from '../adui-three/index.mjs'\nimport type { LazySceneHandle } from '../adui-three/lazy.mjs'\n"
    : "";
  if (vue) {
    files["src/three-smoke/ThreeView.vue"] = [
      "<script setup" + (ts ? ' lang="ts"' : "") + ">",
      "import { ref, onMounted, onBeforeUnmount, watch } from 'vue'",
      "import { createLazyScene } from '../adui-three/lazy.mjs'",
      "import { createLocalGrant } from '../adui-three/local-grant.mjs'",
      statusType,
      "const props=defineProps({pixelRatio:{type:Number,default:0}})",
      ts
        ? "const emit=defineEmits<{status:[value:ThreeStatus];error:[message:string]}>()"
        : "const emit=defineEmits(['status','error'])",
      "const host=ref" + (ts ? "<HTMLDivElement|null>" : "") + "(null)",
      "const loading=ref(false),ready=ref(false)",
      "const grant=createLocalGrant(),keyReady=ref(false);let modelRead=0",
      "let scene" + (ts ? ": LazySceneHandle|undefined" : ""),
      "onMounted(()=>{if(host.value)scene=createLazyScene(host.value,{pixelRatio:props.pixelRatio||undefined,onState:state=>{loading.value=state.loading;ready.value=state.ready},onStatus:value=>emit('status',value),onError:error=>emit('error',String(error))})})",
      "watch(()=>props.pixelRatio,value=>scene?.setPixelRatio(value||undefined))",
      "onBeforeUnmount(()=>{grant.clear();scene?.destroy();scene=undefined})",
      "async function openKey(event" +
        (ts ? ": Event" : "") +
        "){const input=event.target;if(!(input instanceof HTMLInputElement))return;const file=input.files?.[0],active=scene;input.value='';if(!file||!active)return;++modelRead;active.clearModel();keyReady.value=false;try{const selected=await grant.select(file);if(scene===active&&selected){keyReady.value=true;emit('error','')}}catch(error){if(scene===active)emit('error',String(error))}}",
      "function clearKey(){++modelRead;grant.clear();keyReady.value=false;scene?.clearModel()}",
      "async function openModel(event" +
        (ts ? ": Event" : "") +
        "){const input=event.target;if(!(input instanceof HTMLInputElement))return;const file=input.files?.[0],active=scene;input.value='';if(!file||!active)return;const request=++modelRead;active.cancelModelLoad();if(file.size>32*1024*1024+4112){emit('error','模型不得超过 32 MiB（加密封装另计）');return}emit('error','');try{const buffer=await file.arrayBuffer();if(scene===active&&request===modelRead){if(file.name.toLowerCase().endsWith('.adui'))await active.loadEncryptedModel(buffer,{authorize:info=>grant.authorize(info)});else await active.loadModel(buffer)}}catch(error){if(scene===active&&request===modelRead)emit('error',String(error))}}",
      "function clearModel(){++modelRead;scene?.clearModel();emit('error','')}",
      '</script><template><div class="three-host three-wrapper"><div ref="host" class="three-host"/><button v-if="!ready" class="three-load" :disabled="loading" @click="scene?.start()">{{loading?"加载中…":"加载 3D 场景"}}</button><div v-if="ready" class="three-model-controls"><label>选择 GLB / .adui<input aria-label="选择 GLB 模型" type="file" accept=".glb,.adui" @change="openModel"/></label><button @click="clearModel">清除模型</button><label>本地验收密钥<input aria-label="本地验收密钥" type="file" accept=".json" @change="openKey"/></label><span>{{keyReady?"验收密钥就绪":"未授权"}}</span><button @click="clearKey">清除授权及模型</button></div></div></template>',
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
      "import {createLazyScene} from '../adui-three/lazy.mjs'",
      "import {createLocalGrant} from '../adui-three/local-grant.mjs'",
      statusType,
      "export default function ThreeView({pixelRatio,onStatus,onError}" +
        (ts
          ? ": {pixelRatio:number;onStatus:(value:ThreeStatus)=>void;onError:(message:string)=>void}"
          : "") +
        "){",
      "const [host,setHost]=useState" + (ts ? "<HTMLDivElement|null>" : "") + "(null)",
      "const scene=useRef" + (ts ? "<LazySceneHandle|undefined>" : "") + "(undefined)",
      "const [state,setState]=useState({loading:false,ready:false})",
      "const [grant]=useState(createLocalGrant),[keyReady,setKeyReady]=useState(false);const modelRead=useRef(0)",
      "const latest=useRef({pixelRatio,onStatus,onError})",
      "useEffect(()=>{latest.current={pixelRatio,onStatus,onError}})",
      "useEffect(()=>{if(!host)return;scene.current=createLazyScene(host,{pixelRatio:latest.current.pixelRatio||undefined,onState:setState,onStatus:value=>latest.current.onStatus(value),onError:error=>latest.current.onError(String(error))});return()=>{grant.clear();scene.current?.destroy();scene.current=undefined}},[host,grant])",
      "useEffect(()=>scene.current?.setPixelRatio(pixelRatio||undefined),[pixelRatio])",
      "async function openModel(event" +
        (ts ? ": import('react').ChangeEvent<HTMLInputElement>" : "") +
        "){const file=event.target.files?.[0],active=scene.current;event.target.value='';if(!file||!active)return;const request=++modelRead.current;active.cancelModelLoad();if(file.size>32*1024*1024+4112){latest.current.onError('模型不得超过 32 MiB（加密封装另计）');return}latest.current.onError('');try{const buffer=await file.arrayBuffer();if(scene.current===active&&request===modelRead.current){if(file.name.toLowerCase().endsWith('.adui'))await active.loadEncryptedModel(buffer,{authorize:info=>grant.authorize(info)});else await active.loadModel(buffer)}}catch(error){if(scene.current===active)latest.current.onError(String(error))}}",
      "async function openKey(event" +
        (ts ? ": import('react').ChangeEvent<HTMLInputElement>" : "") +
        "){const file=event.target.files?.[0],active=scene.current;event.target.value='';if(!file||!active)return;++modelRead.current;active.clearModel();setKeyReady(false);try{const selected=await grant.select(file);if(scene.current===active&&selected){setKeyReady(true);latest.current.onError('')}}catch(error){if(scene.current===active)latest.current.onError(String(error))}}",
      'return <div className="three-host three-wrapper"><div ref={setHost} className="three-host"/>{!state.ready&&<button className="three-load" disabled={state.loading} onClick={()=>{void scene.current?.start()}}>{state.loading?"加载中…":"加载 3D 场景"}</button>}{state.ready&&<div className="three-model-controls"><label>选择 GLB / .adui<input aria-label="选择 GLB 模型" type="file" accept=".glb,.adui" onChange={openModel}/></label><button onClick={()=>{++modelRead.current;scene.current?.clearModel();latest.current.onError("")}}>清除模型</button><label>本地验收密钥<input aria-label="本地验收密钥" type="file" accept=".json" onChange={openKey}/></label><span>{keyReady?"验收密钥就绪":"未授权"}</span><button onClick={()=>{++modelRead.current;grant.clear();setKeyReady(false);scene.current?.clearModel()}}>清除授权及模型</button></div>}</div>',
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
    "\n.three-host{width:100%;height:100%}.three-wrapper{position:relative}.three-load{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)}.three-model-controls{position:absolute;left:12px;top:12px;display:flex;gap:12px;align-items:center;background:#10243ee8;padding:8px;max-width:calc(100% - 24px);flex-wrap:wrap;font-size:13px}[data-three-status]{font:12px monospace;max-width:650px;overflow-wrap:anywhere}";
  files["three-smoke.html"] =
    '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>ADui Three Smoke</title></head><body><div id="three-root"></div><script type="module" src="/src/three-smoke/main.' +
    ext +
    '"></script></body></html>';
  return { files, previewPath: "/three-smoke.html" };
}
async function inspect(path) {
  return inspectPath(path, "Three 目标");
}
export async function preflightThreeSmoke(directory, plan) {
  for (const path of ["", "src", "src/adui-screen", "src/adui-three", "src/three-smoke"]) {
    const stat = await inspect(join(directory, path));
    if (stat && !stat.isDirectory()) throw new Error("Three 目标目录被占用：" + path);
  }
  for (const path of Object.keys(plan.files))
    if (await inspect(join(directory, path)))
      throw new Error("Three 文件已存在，拒绝覆盖：" + path);
}
export async function validateThreeTarget(directory, input, requireScreen = true) {
  const options = validateProjectOptions(input);
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
    ...(requireScreen
      ? [
          "src/adui-screen/core.mjs",
          "src/adui-screen/controller.mjs",
          "src/adui-screen/style.css",
          "src/adui-screen/" + options.framework + ".mjs",
          "src/adui-screen/config." + (ts ? "ts" : "js"),
        ]
      : []),
  ])
    if (!(await inspect(join(directory, path)))?.isFile())
      throw new Error("请先按所选框架/语言运行 --screen；缺少 " + path);
  for (const [name, version] of [
    ["three", "0.186.1"],
    ["@types/three", "0.186.0"],
  ]) {
    if (deps[name] === "catalog:") {
      const metadata = JSON.parse(
        await readFile(createRequire(manifestPath).resolve(name + "/package.json"), "utf8"),
      );
      if (metadata.name !== name || typeof metadata.version !== "string")
        throw new Error("无法确认 Three catalog 版本");
      deps[name] = metadata.version;
    }
    if (deps[name] && ![version, "^" + version, "~" + version].includes(deps[name]))
      throw new Error("已有 " + name + " 版本未经本预设验证，拒绝自动升级：" + deps[name]);
  }
  return deps;
}
export async function addThreeSmoke(directory, input, runner = runWorkspaceVp) {
  const options = validateProjectOptions(input),
    plan = await planThreeSmoke(options);
  await preflightThreeSmoke(directory, plan);
  const deps = await validateThreeTarget(directory, options);
  if (!deps.three) runner(directory, ["add", "three@0.186.1", "--save-exact"]);
  if (!deps["@types/three"])
    runner(directory, ["add", "-D", "@types/three@0.186.0", "--save-exact"]);
  await preflightThreeSmoke(directory, plan);
  for (const [path, source] of Object.entries(plan.files)) {
    const target = join(directory, path);
    await mkdir(dirname(target), { recursive: true });
    await inspect(target);
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
