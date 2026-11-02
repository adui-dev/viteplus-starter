# 新建应用目录与首页接入

2026-11-02 按用户要求收紧默认输出。基础工程仍先通过 Vite+ 官方模板创建，再按选择接入正式入口；没有自维护 Vue/React 基础模板。

```text
src/
  plugins/
    index.ts             # JS 项目为 index.js
    ui/index.ts          # 只导出所选库的 UiButton
    screen/              # AdScreen 运行时与设计尺寸配置
    three/               # 按选择生成 three、cesium、babylon
  components/
    SceneView.vue        # React 为 .tsx / .jsx，按选择生成
  styles/
    normalize.css
    normalize.LICENSE.txt
    application.css
  types/adui-models.d.ts # 开启模型保护时生成
  models/                # 建模师提供的自包含 GLB
  main.ts
  App.vue
build/plugins/
  models/                # Node 侧加密、Vite 插件、KEY 脚本
  cesium/                # Cesium 静态资源构建插件，按选择生成
```

只生成所选功能需要的目录。Vite、UnoCSS、TypeScript 等工具约定的配置文件继续位于官方支持的位置；Tailwind 样式沿用 src/starter.tailwind.css。浏览器运行时与 Node 构建代码分开。

Vue 的 main 使用 `createApp(App).use(plugins).mount('#app')` 注册所选 UI 按钮和 AdScreen；App.vue 显式导入并使用组件，保留类型检查。UI 的自动导入解析器继续位于 Vite 配置，不通过全量安装组件库替代按需导入。

React 没有 Vue 的 app.use 接口；main 保持官方 createRoot 挂载，加载插件入口和样式，App 显式使用所选 UiButton、AdScreen 和 SceneView。

选中引擎时，首页的“加载场景”按钮挂载 SceneView；引擎包仍由 lazy 适配器动态导入。embedded 模式使用模型目录中的首个模型；没有模型时加载引擎基础场景。external 模式保留解锁文件入口。多引擎安装后，首页使用 Three → Babylon → Cesium 优先级选定的一个适配器，其余引擎可从对应插件目录按业务需要导入，不会同时启动多个渲染器。

## 验收页与备份

默认最终项目不含 screen/three/cesium/babylon/model-smoke 目录及其 HTML。需要独立调试页面时，在新建参数中加 `--smoke-pages`，批量 JSON 则在应用内设置 `"smokePages": true`。这是额外输出选项，不增加向导步骤。已有的 `--ui-smoke`、`--three-smoke` 独立维护入口保留。

旧安装器的独立页作为创建过程的暂存输出；所有集成成功后才整理目录、接入首页。定向格式化成功后，仅删除本次新建流程自己的暂存文件和中间 `.before-adui-models` / `.before-adui-cesium` 备份。出现未知文件、路径占用、链接或首页快照变化时拒绝整理；失败保留现场，不承诺自动回滚。KEY 轮换产生的 env 备份不属于清理范围。

## 已有项目

本变更仅自动替换**当前新建流程**中的官方初始首页。`--apply-existing` 和独立验收命令继续保留业务 main/App；不自动搬迁用户已有的 test-starter。历史目录布局仍可识别，已有 grouped 插件会拒绝重复安装；新增预设在旧补装路径下仍沿用历史目录，业务接入需手动完成。迁移现有工程应单独比较业务引用后再处理。

单应用、多引擎、批量和恢复中的新建应用共享最终整理步骤；dry-run 的 output/engine/screen/modelProtection 文件计划显示最终路径。结构检查识别带生成器标记的插件入口，仍兼容历史工程。
