export function modelSmoke(framework, language, keyMode) {
  const ts = language === "ts",
    vue = framework === "vue",
    embedded = keyMode === "embedded",
    ext = vue ? (ts ? "ts" : "js") : ts ? "tsx" : "jsx";
  const imports =
    "import models from 'virtual:adui-models'\nimport {createLazyScene} from '../adui-three/lazy.mjs'\n" +
    (embedded
      ? "import {authorize} from 'virtual:adui-model-key'\n"
      : "import {createOfflineKeyring} from '../adui-three/offline-keyring.mjs'\n") +
    (ts ? "import type {LazySceneHandle} from '../adui-three/lazy.mjs'\n" : "");
  const files = {};
  if (vue) {
    files["src/model-smoke/ModelView.vue"] = [
      "<script setup" + (ts ? ' lang="ts"' : "") + ">",
      "import {ref,onMounted,onBeforeUnmount} from 'vue'",
      imports,
      "const host=ref" +
        (ts ? "<HTMLDivElement|null>" : "") +
        '(null),selected=ref(0),message=ref(""),status=ref("等待模型"),unlocked=ref(' +
        embedded +
        ")",
      "let scene" + (ts ? ":LazySceneHandle|undefined" : ""),
      embedded
        ? ""
        : "const keyring=createOfflineKeyring();const authorize=(info" +
          (ts ? ": import('../adui-three/adui.mjs').ModelMetadata" : "") +
          ")=>keyring.authorize(info)",
      "onMounted(()=>{if(!host.value)return;scene=createLazyScene(host.value,{onStatus:value=>status.value=JSON.stringify(value),onError:error=>message.value=error.message});" +
        (embedded ? "void load()" : "") +
        "})",
      "onBeforeUnmount(()=>{" +
        (embedded ? "" : "keyring.lock();") +
        "scene?.destroy();scene=undefined})",
      'async function load(){const model=models[selected.value];if(!model){message.value="没有可用模型";return}message.value="";await scene?.loadBundledModel(model,{authorize})}',
      embedded
        ? ""
        : "async function unlock(event" +
          (ts ? ": Event" : "") +
          "){const input=event.target;if(!(input instanceof HTMLInputElement))return;const file=input.files?.[0],active=scene;input.value='';if(!file||!active)return;unlocked.value=false;active.clearModel();try{if(await keyring.unlock(file)&&scene===active){unlocked.value=true;await load()}}catch(error){if(scene===active)message.value=String(error)}}\nfunction lock(){keyring.lock();unlocked.value=false;scene?.clearModel();message.value=''}",
      '</script><template><main><h1>模型查看器 · Vue</h1><div class="controls"><select v-model.number="selected" aria-label="模型"><option v-for="(model,index) in models" :key="model.modelId" :value="index">{{model.name}}</option></select><button :disabled="!unlocked" @click="load">加载模型</button>' +
        (embedded
          ? "<span>自动加载模式</span>"
          : '<label>解锁模型<input aria-label="解锁模型" type="file" accept=".json" @change="unlock"/></label><button @click="lock">锁定并清除</button><span>{{unlocked?"已解锁":"已锁定"}}</span>') +
        '</div><p role="status">{{message}}</p><pre data-model-status>{{status}}</pre><div ref="host" class="model-host"/></main></template>',
    ]
      .filter(Boolean)
      .join("\n");
    files["src/model-smoke/main." + ext] =
      "import {createApp} from 'vue'\nimport ModelView from './ModelView.vue'\nimport './style.css'\ncreateApp(ModelView).mount('#model-root')\n";
  } else {
    files["src/model-smoke/ModelView." + ext] = [
      "import {useEffect,useRef,useState} from 'react'",
      imports,
      "export default function ModelView(){",
      "const [host,setHost]=useState" +
        (ts ? "<HTMLDivElement|null>" : "") +
        '(null),[selected,setSelected]=useState(0),[message,setMessage]=useState(""),[status,setStatus]=useState("等待模型"),[unlocked,setUnlocked]=useState(' +
        embedded +
        ")",
      "const scene=useRef" + (ts ? "<LazySceneHandle|undefined>" : "") + "(undefined)",
      embedded
        ? ""
        : "const [keyring]=useState(createOfflineKeyring);const authorize=(info" +
          (ts ? ": import('../adui-three/adui.mjs').ModelMetadata" : "") +
          ")=>keyring.authorize(info)",
      "useEffect(()=>{if(!host)return;const active=createLazyScene(host,{onStatus:value=>setStatus(JSON.stringify(value)),onError:error=>setMessage(error.message)});scene.current=active;" +
        (embedded ? "if(models[0])void active.loadBundledModel(models[0],{authorize});" : "") +
        "return()=>{" +
        (embedded ? "" : "keyring.lock();") +
        "active.destroy();scene.current=undefined}},[host" +
        (embedded ? "" : ",keyring") +
        "])",
      'async function load(){const model=models[selected];if(!model){setMessage("没有可用模型");return}setMessage("");await scene.current?.loadBundledModel(model,{authorize})}',
      embedded
        ? ""
        : "async function unlock(event" +
          (ts ? ": import('react').ChangeEvent<HTMLInputElement>" : "") +
          "){const file=event.target.files?.[0],active=scene.current;event.target.value='';if(!file||!active)return;setUnlocked(false);active.clearModel();try{if(await keyring.unlock(file)&&scene.current===active){setUnlocked(true);const model=models[selected];if(model){setMessage('');await active.loadBundledModel(model,{authorize})}}}catch(error){if(scene.current===active)setMessage(String(error))}}",
      'return <main><h1>模型查看器 · React</h1><div className="controls"><select aria-label="模型" value={selected} onChange={event=>setSelected(Number(event.target.value))}>{models.map((model,index)=><option key={model.modelId} value={index}>{model.name}</option>)}</select><button disabled={!unlocked} onClick={()=>{void load()}}>加载模型</button>' +
        (embedded
          ? "<span>自动加载模式</span>"
          : '<label>解锁模型<input aria-label="解锁模型" type="file" accept=".json" onChange={unlock}/></label><button onClick={()=>{keyring.lock();setUnlocked(false);scene.current?.clearModel();setMessage("")}}>锁定并清除</button><span>{unlocked?"已解锁":"已锁定"}</span>') +
        '</div><p role="status">{message}</p><pre data-model-status>{status}</pre><div ref={setHost} className="model-host"/></main>}',
    ];
    files["src/model-smoke/ModelView." + ext] = files["src/model-smoke/ModelView." + ext]
      .filter(Boolean)
      .join("\n");
    if (embedded)
      files["src/model-smoke/ModelView." + ext] = files["src/model-smoke/ModelView." + ext].replace(
        "[unlocked,setUnlocked]",
        "[unlocked]",
      );
    files["src/model-smoke/main." + ext] =
      "import {createRoot} from 'react-dom/client'\nimport ModelView from './ModelView." +
      ext +
      "'\nimport './style.css'\nconst root=document.getElementById('model-root');if(root)createRoot(root).render(<ModelView/>)\n";
  }
  files["src/model-smoke/style.css"] =
    "*{box-sizing:border-box}body{margin:0;background:#081522;color:#e0f4ff;font-family:system-ui}main{padding:20px}h1{font-size:24px}.controls{display:flex;flex-wrap:wrap;gap:12px;align-items:center}button,select,input{font:inherit}button,select{padding:7px 12px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}.model-host{width:100%;height:70vh;min-height:300px;border:1px solid #294a63}p{min-height:24px;color:#ffb454}";
  files["model-smoke.html"] =
    '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>ADui Model</title></head><body><div id="model-root"></div><script type="module" src="/src/model-smoke/main.' +
    ext +
    '"></script></body></html>';
  return files;
}
