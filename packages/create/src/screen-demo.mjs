export const demoCss = `
*{box-sizing:border-box}body{margin:0;background:#070e1c;color:#deecff;font-family:system-ui,sans-serif}
.demo-toolbar{min-height:80px;padding:12px 20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;background:#111f34}
.demo-toolbar h1{font-size:18px;margin:0 20px 0 0}button,select{font:inherit;padding:7px 12px;border:1px solid #3b607f;border-radius:6px;background:#163953;color:#e0faff;cursor:pointer}
.demo-frame{margin:16px;border:1px solid #38506a;max-width:calc(100% - 32px);background:#020710}
.engine-grid{width:100%;height:100%;background:linear-gradient(90deg,#1b344a 1px,transparent 1px),linear-gradient(#1b344a 1px,transparent 1px),#0c2433;background-size:32px 32px;padding:24px;color:#6de5dd}
.hud-design{position:absolute;inset:0;border:3px solid #48d4f0;pointer-events:none}
.hud-title{margin:0;position:absolute;top:12px;left:0;width:100%;text-align:center;font-size:36px;color:#aeefff}
.hud-panel{position:absolute;left:32px;bottom:32px;min-width:480px;padding:24px;background:#10243ee8;border:1px solid #4c7498;border-radius:12px;font-size:22px}
.hud-panel button{font-size:24px}.scaled-badge{position:absolute;right:32px;top:110px;background:#125770;padding:12px;font-size:24px}
.native-badge{position:absolute;right:12px;top:12px;background:#563752;padding:8px;font-size:12px;display:flex;gap:12px;align-items:center}
.demo-readout{font-family:monospace;font-size:13px;color:#91c4dc}.placeholder{padding:48px}
`;

export function vueDemo(ts) {
  return `<script setup${ts ? ' lang="ts"' : ""}>
import { computed, ref, shallowRef } from 'vue'
import { AdScreen } from '../adui-screen/vue.mjs'
import { screenConfig } from '../adui-screen/config.${ts ? "ts" : "js"}'
${ts ? "import type { ScreenLayout, ScreenMode } from '../adui-screen/core.mjs'\nimport type { VueScreenHandle } from '../adui-screen/vue.mjs'" : ""}
import './demo.css'
const screen = ref${ts ? "<VueScreenHandle | null>" : ""}(null)
const layout = shallowRef${ts ? "<ScreenLayout | null>" : ""}(null)
const mode = ref${ts ? "<ScreenMode>" : ""}(screenConfig.mode)
const compact = ref(false), mounted = ref(true), clicks = ref(0), point = ref('点击引擎网格测试坐标'), message = ref('')
const settings = computed(() => ({...screenConfig, mode: mode.value}))
function pick(event${ts ? ": PointerEvent" : ""}) {
 const value = screen.value?.clientToDesign(event.clientX,event.clientY)
 if(value) point.value = 'x: ' + value.x.toFixed(1) + ', y: ' + value.y.toFixed(1) + ', inside: ' + value.inside
}
function fullscreen(){ screen.value?.requestFullscreen().catch(error => {message.value=String(error)}) }
</script>
<template>
 <header class="demo-toolbar">
  <h1>ADui Screen · Vue</h1>
  <select v-model="mode" aria-label="缩放模式"><option>contain</option><option>cover</option><option>stretch</option><option>none</option></select>
  <button @click="compact=!compact">切换容器尺寸</button><button @click="mounted=!mounted">{{mounted?'卸载大屏':'挂载大屏'}}</button><button @click="fullscreen">进入全屏</button>
  <span class="demo-readout" data-screen-layout>{{layout ? layout.containerWidth+'×'+layout.containerHeight+' scaleX:'+layout.scaleX.toFixed(3)+' scaleY:'+layout.scaleY.toFixed(3) : '等待布局'}}</span><span>{{message}}</span>
 </header>
 <div class="demo-frame" :style="{width:compact?'960px':'calc(100% - 32px)',height:compact?'540px':'calc(100dvh - 112px)'}">
  <AdScreen v-if="mounted" ref="screen" v-bind="settings" :engine-insets="{top:75}" @layout="layout=$event">
   <template #engine><div class="engine-grid" data-screen-engine @pointerdown="pick">ENGINE · 原生像素视口 · transform: none</div></template>
   <template #hud><div class="hud-design"><h2 class="hud-title">HUD · {{screenConfig.designWidth}} × {{screenConfig.designHeight}}</h2><div class="hud-panel ad-screen-interactive"><p>HUD 按设计稿缩放；引擎保持原生尺寸</p><button data-screen-button @click="clicks++">点击次数：{{clicks}}</button><p data-screen-point>{{point}}</p></div></div></template>
   <template #overlayScaled><div class="scaled-badge">随 HUD 缩放的浮层</div></template>
   <template #overlayUnscaled><div class="native-badge ad-screen-interactive">不缩放的浮层 <button @click="screen?.exitFullscreen()">退出全屏</button></div></template>
  </AdScreen><p v-else class="placeholder">AdScreen 已卸载</p>
 </div>
</template>
`;
}

export function reactDemo(ts) {
  return `import { useRef, useState } from 'react'
import { AdScreen } from '../adui-screen/react.mjs'
import { screenConfig } from '../adui-screen/config.${ts ? "ts" : "js"}'
${ts ? "import type { PointerEvent } from 'react'\nimport type { ScreenLayout, ScreenMode } from '../adui-screen/core.mjs'\nimport type { ReactScreenContext } from '../adui-screen/react.mjs'" : ""}
import './demo.css'
export default function ScreenDemo(){
 const screen = useRef${ts ? "<ReactScreenContext | null>" : ""}(null)
 const [layout,setLayout] = useState${ts ? "<ScreenLayout | null>" : ""}(null)
 const [mode,setMode] = useState${ts ? "<ScreenMode>" : ""}(screenConfig.mode)
 const [compact,setCompact]=useState(false),[mounted,setMounted]=useState(true),[clicks,setClicks]=useState(0),[point,setPoint]=useState('点击引擎网格测试坐标'),[message,setMessage]=useState('')
 const modes${ts ? ": ScreenMode[]" : ""}=['contain','cover','stretch','none']
 function pick(event${ts ? ": PointerEvent<HTMLDivElement>" : ""}){const value=screen.current?.clientToDesign(event.clientX,event.clientY);if(value)setPoint('x: '+value.x.toFixed(1)+', y: '+value.y.toFixed(1)+', inside: '+value.inside)}
 return <>
  <header className="demo-toolbar"><h1>ADui Screen · React</h1>
   <select aria-label="缩放模式" value={mode} onChange={event=>{const next=modes.find(value=>value===event.target.value);if(next)setMode(next)}}>{modes.map(value=><option key={value}>{value}</option>)}</select>
   <button onClick={()=>setCompact(!compact)}>切换容器尺寸</button><button onClick={()=>setMounted(!mounted)}>{mounted?'卸载大屏':'挂载大屏'}</button><button onClick={()=>screen.current?.requestFullscreen().catch(error=>setMessage(String(error)))}>进入全屏</button>
   <span className="demo-readout" data-screen-layout>{layout?layout.containerWidth+'×'+layout.containerHeight+' scaleX:'+layout.scaleX.toFixed(3)+' scaleY:'+layout.scaleY.toFixed(3):'等待布局'}</span><span>{message}</span>
  </header>
  <div className="demo-frame" style={{width:compact?'960px':'calc(100% - 32px)',height:compact?'540px':'calc(100dvh - 112px)'}}>
   {mounted?<AdScreen ref={screen} {...screenConfig} mode={mode} engineInsets={{top:75}} onLayout={setLayout}
    engine={<div className="engine-grid" data-screen-engine onPointerDown={pick}>ENGINE · 原生像素视口 · transform: none</div>}
    hud={<div className="hud-design"><h2 className="hud-title">HUD · {screenConfig.designWidth} × {screenConfig.designHeight}</h2><div className="hud-panel ad-screen-interactive"><p>HUD 按设计稿缩放；引擎保持原生尺寸</p><button data-screen-button onClick={()=>setClicks(clicks+1)}>点击次数：{clicks}</button><p data-screen-point>{point}</p></div></div>}
    overlayScaled={<div className="scaled-badge">随 HUD 缩放的浮层</div>}
    overlayUnscaled={<div className="native-badge ad-screen-interactive">不缩放的浮层 <button onClick={()=>screen.current?.exitFullscreen()}>退出全屏</button></div>}
   />:<p className="placeholder">AdScreen 已卸载</p>}
  </div>
 </>
}
`;
}
