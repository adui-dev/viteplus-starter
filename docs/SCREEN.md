# 大屏适配插件（P5 首期）

参考 `D:\Workspace\bn\smart-geology-web\src\components\AdScreen.vue` 的原生引擎层、设计稿 HUD 和两种浮层设计重新实现。原业务工程仅作为参考，没有修改。共享实现位于 `packages/screen`，提供 Vue 插件/组件、React 组件、框架无关布局与 DOM 控制器，以及 TS 声明。包当前 private，仅在仓库与生成项目内使用，尚未发布 npm。

## 生成与补装

从仓库上级目录运行：

```powershell
# 新建官方 Vue TS 项目并接入大屏
node ./viteplus-starter/packages/create/bin/cli.mjs --name screen-vue --type application --framework vue --screen

# 已有官方 React JS 项目补装；名称必须指向真实项目
node ./viteplus-starter/packages/create/bin/cli.mjs --name starter-react-js --type application --framework react --language js --screen --screen-mode stretch --apply-existing

# 已有官方 Monorepo 成员
node ./viteplus-starter/packages/create/bin/cli.mjs --workspace ./adui-batch-demo --name admin --type application --framework vue --screen --apply-existing --dry-run
```

CLI 支持 `--screen`、`--screen-width 1920`、`--screen-height 1080`、`--screen-mode contain`；尺寸为 1–32768 正整数，模式为 contain/cover/stretch/none。默认 TS，JS 必须显式 `--language js`。仅 Application 使用，Monorepo 根不启用。可以和兼容的 UI/CSS 集成同用；不能与 `--ui-smoke` 或 `--repair-existing` 同次使用，UI 验收另行调用。

批量 JSON 的每个应用可配置 `"screen": true` 或 `"screen": {"designWidth": 1920, "designHeight": 1080, "mode": "contain"}`；未知字段拒绝，`false` 或省略表示不启用。也可与 `uiSmoke: true` 同用，执行器将其作为独立阶段调用。示例见 [screen.batch.json](../examples/screen.batch.json)。

生成 `src/adui-screen/`（源码快照、声明、config.ts/js）、`src/screen-smoke/`（演示组件、入口和 CSS）、`screen-smoke.html`。只复制所选框架适配器，不添加应用依赖，不修改 App、main、正式 HTML 或 Vite 配置。目标任一文件已存在或包含链接时提前拒绝，不支持覆盖升级。新项目仍完全委托官方 Vite+ 模板。

进入应用运行 `vp check`、`vp run build`、`vp dev`，打开终端端口的 `/screen-smoke.html`。独立 HTML 是开发验收入口，默认正式构建仍只以原首页为入口；如需部署演示页，须在应用自行配置多页构建。正式业务使用时从 `src/adui-screen/vue.mjs` 或 `react.mjs` 导入组件并嵌入自己的页面。

## 布局契约

| 配置                       | 含义                                                            |
| -------------------------- | --------------------------------------------------------------- |
| designWidth / designHeight | 设计稿尺寸，默认 1920 × 1080                                    |
| mode                       | contain 等比留白；cover 等比裁切；stretch 双轴独立；none 不缩放 |
| allowUpscale               | 默认 true；false 时每个轴最大为 1                               |
| engineInsets               | 设计单位的 top/right/bottom/left，默认全为 0                    |

父容器必须有实际宽高；组件填满父容器，默认隐藏溢出。不要在 shell 或其祖先加 transform、zoom，不要覆盖 HUD 的定位与变换。隐藏/零尺寸时布局标记 visible=false，坐标返回 null。引擎视口先按设计单位内缩，再与容器求交集，尺寸不会为负。

引擎层保持物理 CSS 像素、`transform: none`；HUD 按设计单位缩放。覆盖层默认不拦截鼠标，交互控件加 `ad-screen-interactive`。不要把需要原生尺寸的 canvas 放进 HUD。引擎的 ResizeObserver、drawing buffer、DPR、拾取和资源释放由各引擎适配器管理。目前可选 Three、Cesium、Babylon，独立 screen-smoke 页面保留网格验收。

Vue 导入 `{ AdScreen, AdScreenPlugin, useAdScreen }`，可局部注册或 `app.use(AdScreenPlugin)`；slots 为 engine、hud（或 default）、overlayScaled、overlayUnscaled。`useAdScreen()` 只在组件后代调用，使用独立 Symbol 注入。暴露的 layout、scaledRoot、unscaledRoot 是只读 ref；模板组件 ref 会解包它们。

React 导入 `{ AdScreen, useAdScreen }`；engine、hud/children、overlayScaled、overlayUnscaled 接受节点或 `(context) => ReactNode`。context 的 layout 和两个浮层 DOM 根由状态更新，初始为 null；可用 `createPortal`。Vue 对应使用 Teleport。浮层应挂入对应 root，避免全屏时挂到 body 的弹窗消失。

两框架均提供 refresh、clientToDesign(clientX, clientY)、requestFullscreen、exitFullscreen，布局通过 Vue `@layout` / React `onLayout` 通知。坐标输入为浏览器 client 坐标，输出设计坐标 `{x,y,inside}`，stretch 使用两个轴反算。全屏通过原生 Fullscreen API，必须由用户操作触发，拒绝会返回 Promise 错误；旧组件的 fullScreen（拉伸）对应新 mode=stretch，不等于原生全屏。

原组件 top=75/right=1 的业务偏移已改为 engineInsets 配置；演示显式传 top=75 展示迁移，核心默认不保留该常量。布局采用 ResizeObserver + 窗口/全屏事件 + requestAnimationFrame 合帧，卸载释放观察器、监听器与待执行帧，不依赖 lodash 或 MutationObserver。Vue 按配置值监听，避免父组件内联对象与 layout 回调造成递归更新。

## 本地验收

1. 切换四种模式与容器尺寸，核对 scaleX/scaleY；按钮从 0 增到 1。
2. 点击引擎网格，半尺寸 contain 的中心应约为 x=960、y=577.5（演示 top=75）。引擎 transform 保持 none，非缩放浮层字体保持 12px。
3. 卸载/重挂后继续缩放和交互，无重复监听或控制台错误；清理机制另由 DOM 控制器测试验证。
4. 手动点击进入全屏，确认 shell 是 fullscreenElement，浮层仍显示，退出后恢复容器尺寸；自动化环境拒绝请求时记录错误，不能算全屏成功。

本轮真实验证范围与限制见 [PROJECT_CONTEXT](PROJECT_CONTEXT.md)。不添加 CI/CD。

## Three.js 补充验收

已有大屏应用可按 [THREE_SMOKE](THREE_SMOKE.md) 增加真实 WebGL 场景。本轮 Vue/React 代表组合已经验证前台原生全屏进入/退出、实际 canvas DPR、拾取与卸载重挂；此结果补充前述 P5 首期的待验收项。Cesium/Babylon 已接入；其专项记录见下文。

## Cesium / Babylon 大屏专项（2026-10-29）

新生成的 cesium-smoke.html、babylon-smoke.html 提供四种模式切换、半宽/恢复容器、进入/退出全屏。模式控件放在 overlayUnscaled 内并开启指针事件；HUD 标记按设计坐标缩放，canvas 始终位于不缩放的 engine 层。全屏错误显示在页面，不视为成功。

两种引擎有效绘图比例为 min(DPR, 2, 8192 / 最长 CSS 边)，Babylon 另受硬件最大纹理尺寸约束。零尺寸不分配新缓冲区。Babylon 使用硬件缩放倒数，Cesium 关闭浏览器推荐分辨率并用 resolutionScale 补偿原生 DPR。容器、窗口、全屏与媒体查询变化触发刷新；另在逐帧回调中只比较 DPR 数值，解决部分浏览器仿真不发事件的情况。卸载清理观察器、监听和待执行帧。

浏览器实测：Vue TS + Babylon 在相同 CSS 尺寸 1250×703 下，DPR 1 为 1250×703、DPR 2 为 2500×1406、DPR 3 仍为 2500×1406；半宽容器、contain/cover/stretch/none 及 engine transform=none 已核对。Cesium 原版基线确认按 1 倍 CSS 像素渲染；新 Cesium 和 React 页面已构建及静态检查，本轮其真实交互尚未验证。全屏请求被浏览器拒绝，切到前台时电脑操作工具无法确认页面地址并终止；不能计为通过。

旧生成项目的源码快照仍拒绝覆盖。本次使用全新官方样例验证，未自动升级已有项目。下一次应优先补齐两个框架、两个引擎的全屏及 Cesium DPR 浏览器实测。

## 大屏专项补验收尾（2026-10-29）

前节的浏览器遗留项在同一组官方样例中补验完成：独立 Vue TS screen-engines-vue-ts 与 Monorepo React JS screen-engines-react-js，均使用生产多入口构建。没有修改生成器源码或增加演示功能。

| 项目                             | Vue TS / Cesium | React JS / Cesium | Vue TS / Babylon | React JS / Babylon |
| -------------------------------- | --------------- | ----------------- | ---------------- | ------------------ |
| DPR 1/2/3 与 2 倍上限            | 本轮通过        | 本轮通过          | 前轮通过         | 本轮通过           |
| 原生全屏进入/退出                | 本轮通过        | 本轮通过          | 本轮通过         | 本轮通过           |
| 非缩放覆盖层控件保留             | 通过            | 通过              | 通过             | 通过               |
| 卸载 canvas 为 0，重挂重新 ready | 通过            | 通过              | 通过             | 通过               |
| 控制台 warn/error                | 无              | 无                | 无               | 无                 |

Cesium 的同尺寸 DPR 数据：CSS 1250×703，DPR 1 缓冲区 1250×703，DPR 2 与 3 均为 2500×1406。半宽 contain 的 CSS 尺寸 625×352，缓冲区 1250×704；cover / stretch 的引擎区域为 625×811，HUD 分别等比/双轴缩放，none 的 HUD 为单位变换。引擎层始终 transform=none。React Babylon 同样确认 DPR 1、2、3 的全宽数据及半宽容器更新。

上轮拒绝来自后台页面的全屏请求。本轮清除尺寸仿真、将验收标签页切到前台，再点击页面按钮；使用 :fullscreen 匹配确认原生全屏元素是 ad-screen，4 个覆盖层按钮仍在该元素内部。点击退出后匹配为空，容器恢复，Cesium 的半宽 frame/shell 均恢复为 1600 CSS 像素。没有关闭浏览器安全限制或更改系统显示设置。

四张本地全屏截图保留在工作目录 screen-{cesium|babylon}-{vue|react}-fullscreen-20261029.png，不纳入仓库。结果仅覆盖上述代表组合；非整数 DPR、真实跨显示器切换、其他系统和全部语言组合没有扩大验收声明。后续转入其他 UI 库的组件生成与渲染验收。
