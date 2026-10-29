// Independent acceptance entry; never replaces the official application entry.
export function engineScreenSmoke({ engine, view, vue, ts, ext }) {
  const title = engine === "cesium" ? "Cesium · 本地椭球（无影像/Token）" : "Babylon · 本地立方体";
  const modes = `["contain", "cover", "stretch", "none"]${ts ? " as const" : ""}`;
  if (vue)
    return `<script setup${ts ? ' lang="ts"' : ""}>
import {ref} from 'vue'
import {AdScreen} from '../adui-screen/vue.mjs'
import {screenConfig} from '../adui-screen/config.${ts ? "ts" : "js"}'
import ${view} from './${view}.vue'
import './demo.css'
const mounted=ref(true), compact=ref(false), modeIndex=ref(0), error=ref('')
const modes=${modes}
async function fullscreen(action${ts ? ": ()=>Promise<void>" : ""}) { try { error.value=''; await action() } catch(value) { error.value=String(value) } }
</script><template><header>${title}<button @click="mounted=!mounted">{{mounted?'卸载':'挂载'}}</button></header>
<div class="${engine}-frame" :style="{width:compact?'50%':'100%'}"><AdScreen v-if="mounted" v-bind="screenConfig" :mode="modes[modeIndex]">
<template #engine><${view}/></template>
<template #hud><div class="screen-marker">HUD · 设计坐标</div></template>
<template #overlayUnscaled="screen"><div class="screen-tools ad-screen-interactive">
<button @click="modeIndex=(modeIndex+1)%4">模式 {{modes[modeIndex]}}</button><button @click="compact=!compact">{{compact?'恢复宽度':'半宽容器'}}</button>
<button @click="fullscreen(() => screen.requestFullscreen())">进入全屏</button><button @click="fullscreen(() => screen.exitFullscreen())">退出全屏</button>
<output role="status">{{error}}</output></div></template></AdScreen></div></template>`;
  return `import {useState} from 'react'
import {AdScreen} from '../adui-screen/react.mjs'
import {screenConfig} from '../adui-screen/config.${ts ? "ts" : "js"}'
import ${view} from './${view}.${ext}'
import './demo.css'
const modes=${modes}
export default function App(){const [mounted,setMounted]=useState(true),[compact,setCompact]=useState(false),[modeIndex,setModeIndex]=useState(0),[error,setError]=useState('');
async function fullscreen(action${ts ? ": ()=>Promise<void>" : ""}){try{setError('');await action()}catch(value){setError(String(value))}}
return <><header>${title}<button onClick={()=>setMounted(!mounted)}>{mounted?'卸载':'挂载'}</button></header>
<div className="${engine}-frame" style={{width:compact?'50%':'100%'}}>{mounted&&<AdScreen {...screenConfig} mode={modes[modeIndex]} engine={<${view}/>} hud={<div className="screen-marker">HUD · 设计坐标</div>} overlayUnscaled={screen=><div className="screen-tools ad-screen-interactive">
<button onClick={()=>setModeIndex((modeIndex+1)%4)}>模式 {modes[modeIndex]}</button><button onClick={()=>setCompact(!compact)}>{compact?'恢复宽度':'半宽容器'}</button>
<button onClick={()=>fullscreen(() => screen.requestFullscreen())}>进入全屏</button><button onClick={()=>fullscreen(() => screen.exitFullscreen())}>退出全屏</button><output role="status">{error}</output></div>}/>}</div></>}`;
}

export const engineScreenStyles =
  ".screen-tools{position:absolute;bottom:8px;left:8px;right:8px;background:#10243eee;display:flex;flex-wrap:wrap;align-items:center}.screen-marker{position:absolute;right:40px;top:40px;padding:12px;border:2px solid #44e5c5}.screen-tools output{color:#ffb8b8}";
