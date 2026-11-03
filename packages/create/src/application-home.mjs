import { modelEngine } from "./options.mjs";

export function homeFiles(options) {
  const vue = options.framework === "vue",
    ts = (options.language ?? "ts") === "ts";
  const ext = ts ? "ts" : "js",
    jsx = ts ? "tsx" : "jsx";
  const ui = options.ui && options.ui !== "none",
    screen = Boolean(options.screen),
    engine = modelEngine(options);
  const files = {},
    exports = [];
  if (ui) {
    const library = vue
      ? {
          "element-plus": ["ElButton", "element-plus"],
          antd: ["Button", "ant-design-vue"],
          tdesign: ["Button", "tdesign-vue-next"],
        }[options.ui]
      : ["Button", options.ui === "antd" ? "antd" : "tdesign-react"];
    files[`src/plugins/ui/index.${ext}`] =
      (vue && options.ui === "element-plus"
        ? "import 'element-plus/es/components/button/style/css'\n"
        : "") +
      (vue && options.ui === "antd" ? "import 'ant-design-vue/dist/reset.css'\n" : "") +
      `export { ${library[0]} as UiButton } from '${library[1]}'\n`;
    exports.push(`export { UiButton } from './ui/index.${ext}'`);
  }
  if (screen)
    exports.push(
      `export { AdScreen } from './screen/${options.framework}.mjs'`,
      `export { screenConfig } from './screen/config.${ext}'`,
    );
  if (ui || screen || engine)
    files[`src/plugins/index.${ext}`] =
      [
        "// ADui application plugins",
        ...exports,
        ...(vue
          ? [
              ts ? "import type { Plugin } from 'vue'" : "",
              ui ? `import { UiButton } from './ui/index.${ext}'` : "",
              screen ? "import { AdScreenPlugin } from './screen/vue.mjs'" : "",
              `export default { install(${ui || screen ? `app${ts ? ": import('vue').App" : ""}` : ""}) { ${ui ? "app.component('UiButton', UiButton);" : ""} ${screen ? "app.use(AdScreenPlugin);" : ""} } }${ts ? " satisfies Plugin" : ""}`,
            ]
          : []),
      ]
        .filter(Boolean)
        .join("\n") + "\n";
  const button = ui ? "UiButton" : "button";
  const imports = [ui ? "UiButton" : "", screen ? "AdScreen, screenConfig" : ""]
    .filter(Boolean)
    .join(", ");
  const cssClass =
    options.css && options.css !== "none" ? " starter-content p-6" : " starter-content";
  if (vue) {
    const content = `<section class="${cssClass.trim()} ad-screen-interactive"><img class="starter-logo" :src="logoUrl" alt="ADui Studio" width="120" height="120" /><h1>${options.name}</h1><p>{{ message }}</p><${button} ${ui ? (options.ui === "tdesign" ? 'theme="primary"' : 'type="primary"') : 'type="button"'} @click="${engine ? "active = true" : "count++"}">${engine ? "加载场景" : "点击次数：{{ count }}"}</${button}></section>`;
    files["src/App.vue"] =
      `<script setup${ts ? ' lang="ts"' : ""}>\nimport { ref, computed } from 'vue'\nimport logoUrl from './assets/adui-studio-logo.svg'\n${imports ? `import { ${imports} } from './plugins/index.${ext}'` : ""}\n${engine ? "import SceneView from './components/SceneView.vue'\nconst active = ref(false)\nconst message = computed(() => active.value ? '场景已启用' : '点击按钮按需加载场景')" : "const count = ref(0)\nconst message = computed(() => '项目已就绪')"}\nimport './styles/application.css'\n</script>\n<template>\n${screen ? `<AdScreen v-bind="screenConfig"><template #hud>${content}</template>${engine ? '<template #engine><SceneView v-if="active" /></template>' : ""}</AdScreen>` : `<main>${content}${engine ? '<SceneView v-if="active" />' : ""}</main>`}\n</template>\n`;
  } else {
    const content = `<section className="${cssClass.trim()} ad-screen-interactive"><img className="starter-logo" src={logoUrl} alt="ADui Studio" width="120" height="120" /><h1>${options.name}</h1><p>${engine ? '{active ? "场景已启用" : "点击按钮按需加载场景"}' : "项目已就绪"}</p><${button} ${ui ? (options.ui === "tdesign" ? 'theme="primary"' : 'type="primary"') : 'type="button"'} onClick={() => ${engine ? "setActive(true)" : "setCount(value => value + 1)"}}>${engine ? "加载场景" : "点击次数：{count}"}</${button}></section>`;
    files[`src/App.${jsx}`] =
      `import { useState } from 'react'\nimport logoUrl from './assets/adui-studio-logo.svg'\n${imports ? `import { ${imports} } from './plugins/index.${ext}'` : ""}\n${engine ? `import SceneView from './components/SceneView.${jsx}'` : ""}\nimport './styles/application.css'\nexport default function App() {\nconst [${engine ? "active, setActive" : "count, setCount"}] = useState(${engine ? "false" : "0"})\nreturn ${screen ? `<AdScreen {...screenConfig} hud={${content}}${engine ? " engine={active ? <SceneView /> : null}" : ""} />` : `<main>${content}${engine ? "{active && <SceneView />}" : ""}</main>`}\n}\n`;
  }
  files["src/styles/application.css"] =
    `html,body,#app,#root{width:100%;height:100%;margin:0}body{font-family:system-ui,sans-serif;background:#0c182b;color:#e6eef9}#app,#root{max-width:none;padding:0;text-align:left}main{min-height:100%}.starter-content{position:relative;z-index:1;padding:32px;max-width:640px}.starter-logo{display:block;object-fit:contain;margin:0 0 16px}.starter-content h1{margin:0 0 16px}.starter-content p{margin:0 0 24px}.starter-scene{position:relative;width:100%;height:100%;min-height:360px}.starter-scene canvas{display:block;width:100%;height:100%;touch-action:none}.starter-scene-status{position:absolute;bottom:12px;left:16px;z-index:1}.starter-unlock{position:absolute;top:12px;right:16px;z-index:1}\n`;
  if (engine) files[`src/components/SceneView.${vue ? "vue" : jsx}`] = sceneView(options);
  return files;
}

function sceneView(options) {
  const vue = options.framework === "vue",
    ts = (options.language ?? "ts") === "ts";
  const engine = modelEngine(options),
    factory = engine === "cesium" ? "createLazyGlobe" : "createLazyScene";
  const handle =
    engine === "cesium" ? "GlobeHandle" : engine === "babylon" ? "SceneHandle" : "LazySceneHandle";
  const protectedModels = options.modelProtection && options.modelProtection !== "none";
  const external = protectedModels && options.modelProtection === "external";
  const imports =
    `import { ${factory} } from '../plugins/${engine}/lazy.mjs'\n` +
    (ts ? `import type { ${handle} } from '../plugins/${engine}/lazy.mjs'\n` : "") +
    (protectedModels ? "import models from 'virtual:adui-models'\n" : "") +
    (protectedModels && !external ? "import { authorize } from 'virtual:adui-model-key'\n" : "") +
    (external
      ? `import { createOfflineKeyring } from '../plugins/${engine}/offline-keyring.mjs'\n`
      : "");
  const start = `active.${engine === "three" ? "start" : "load"}()`;
  // The lazy adapters report their own model errors. Catch startup/unlock failures too.
  const load =
    protectedModels && !external
      ? `models[0] ? active.loadBundledModel(models[0], { authorize }) : ${start}`
      : start;
  if (vue)
    return `<script setup${ts ? ' lang="ts"' : ""}>\nimport { ref, onMounted, onBeforeUnmount } from 'vue'\n${imports}const host = ref${ts ? "<HTMLDivElement | null>" : ""}(null)\nconst message = ref('')\nlet scene${ts ? `: ${handle} | undefined` : ""}\n${external ? "const keyring = createOfflineKeyring()" : ""}\nonMounted(() => { if (!host.value) return; const active = ${factory}(host.value, { onError: error => { message.value = String(error) } }); scene = active; void (${load}).catch(error => { message.value = String(error) }) })\nonBeforeUnmount(() => { ${external ? "keyring.lock();" : ""}scene?.destroy(); scene = undefined })\n${external ? `async function unlock(event${ts ? ": Event" : ""}) { const input = event.target; if (!(input instanceof HTMLInputElement)) return; const file = input.files?.[0], active = scene; input.value = ''; if (!file || !active || !models[0]) return; try { if (await keyring.unlock(file) && scene === active) await active.loadBundledModel(models[0], { authorize: keyring.authorize }) } catch (error) { if (scene === active) message.value = String(error) } }` : ""}\n</script>\n<template><div class="starter-scene"><div ref="host" style="width:100%;height:100%;position:absolute;inset:0" /><p class="starter-scene-status" role="status">{{ message }}</p>${external ? '<label class="starter-unlock">解锁模型<input type="file" accept=".json" @change="unlock" /></label>' : ""}</div></template>\n`;
  return `import { useEffect, useRef, useState } from 'react'\n${imports}export default function SceneView() {\nconst host = useRef${ts ? "<HTMLDivElement | null>" : ""}(null)\nconst scene = useRef${ts ? `<${handle} | undefined>` : ""}(undefined)\nconst [message, setMessage] = useState('')\n${external ? "const [keyring] = useState(createOfflineKeyring)" : ""}\nuseEffect(() => { if (!host.current) return; const active = ${factory}(host.current, { onError: error => setMessage(String(error)) }); scene.current = active; void (${load}).catch(error => { if (scene.current === active) setMessage(String(error)) }); return () => { ${external ? "keyring.lock();" : ""}active.destroy(); scene.current = undefined } }, [${external ? "keyring" : ""}])\n${external ? `async function unlock(event${ts ? ": import('react').ChangeEvent<HTMLInputElement>" : ""}) { const file = event.target.files?.[0], active = scene.current; event.target.value = ''; if (!file || !active || !models[0]) return; try { if (await keyring.unlock(file) && scene.current === active) await active.loadBundledModel(models[0], { authorize: keyring.authorize }) } catch (error) { if (scene.current === active) setMessage(String(error)) } }` : ""}\nreturn <div className="starter-scene"><div ref={host} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} /><p className="starter-scene-status" role="status">{message}</p>${external ? '<label className="starter-unlock">解锁模型<input type="file" accept=".json" onChange={unlock} /></label>' : ""}</div>\n}\n`;
}
