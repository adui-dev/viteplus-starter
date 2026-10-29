# 需求规格（V1.0 目标）

## 2026-10-26 P3 质量修复记录

- 用户本地 Vue/TDesign/UnoCSS、React/Ant Design/Tailwind CSS 的 `vp build` 均通过。
- 旧版生成器存在插件相对导入 TS2307 与格式问题。修复要求：生成阶段内联插件、自动格式化并提供保留备份的旧项目修复入口。
- 用户 2026-10-26 反馈：两组旧项目修复后 `vp build` 均通过，React 的 `vp check` 直接通过，Vue 的 `vp check --fix` 修正生成声明后通过；不得新增 CI/CD。

状态定义：**已实现 / 进行中 / 规划中 / 待确认**。已完成官方工程创建和多项按应用预设集成；当前完成度及未覆盖范围以 [生成器状态](GENERATOR_STATUS.md) 为准，不将计划验证当成真实构建/渲染。

### FR-001 官方工程模板

- 状态：Vue/React × TS/JS 四种 Application 官方模板已完成创建和构建验证；2026-10-27 官方 Monorepo 根及混合子应用通过创建、检查和构建验收；优先级：P0。
- 目标：Application 委托 `vp create vite:application -- --template vue|vue-ts|react|react-ts`；语言可选 `ts` / `js`，默认 TypeScript；Monorepo 委托 `vp create vite:monorepo`。
- 验收：实测生成 Vue 和 React 应用，且保留 Vite+ 官方结构、工具链与 Git 配置。

### FR-002 交互式创建

- 状态：已实现框架/语言/UI/CSS/大屏/引擎/模型保护交互，Windows TTY 选择与取消已实测；优先级：P0。
- 目标：交互选择名称、项目形态、框架、语言（默认 TypeScript）及确认/取消；非交互调用支持 `--language ts|js`。
- 验收：非法名称、目录存在或未知参数时安全失败；交互与非交互创建均可用。

### FR-003 UI 集成

- 状态：Vue TS/JS + TDesign/UnoCSS、React TS/JS + Ant Design/Tailwind 四种代表组合已验证安装、检查、构建及真实组件渲染；其余组合待验收；优先级：P1。
- 2026-10-28 补验：Vue JS Element Plus/Tailwind、Vue TS Ant Design Vue/UnoCSS、React JS TDesign/UnoCSS 已通过生成、检查和首页构建；这些补验不含组件渲染。Ant Design Vue 安装仅补充 core-js 的显式禁用构建脚本规则，保留已有用户策略。
- 目标：None / Element Plus（Vue 专属）/ Ant Design（Vue 为 ant-design-vue，React 为 antd）/ TDesign（对应框架包），单选。
- 验收：生成后组件正常加载、类型检查和构建成功；React 不出现 Element Plus。

### FR-004 CSS 集成

- 状态：TS/JS 下 UnoCSS、Tailwind 的代表组合已通过检查和构建，格式生成规则已完善；其他组合待验收；优先级：P1。
- 目标：None / UnoCSS / Tailwind CSS，单选。
- 验收：对应 Vite 插件及样式入口有效，未选择不引入依赖。

### FR-005 大屏可视化

- 状态：P5 首期已实现分层插件、Vue/React TS/JS 适配及 CLI/批量接入；布局、原生全屏进入/退出及 Three.js Canvas 的代表组合已实机验收；Cesium/Babylon 的 Vue TS、React JS 代表组合已补验 DPR、全屏与卸载重挂，其余组合待验收；优先级：P1。
- 目标：按应用选择是否启用自定义大屏适配，支持设计稿尺寸及 contain / cover / stretch。
- 验收：窗口变化、全屏、清理监听器和 3D Canvas 交互正确。
- 首期范围：contain/cover/stretch/none、可配置引擎内缩、双轴坐标反算、缩放/非缩放浮层、监听器清理与独立页面；无额外应用依赖、无覆盖写入，详见 [SCREEN](SCREEN.md)。

### FR-006 3D 引擎

- 状态：Three.js 共享运行时与模型能力已实测；Cesium 已接入 CLI/交互/批量逐应用预设、无 Token 场景、静态资源和按需加载。Babylon 新增同类逐应用选项及本地立方体、实例清理；CLI/JSON 多选已接入，交互多选已接入，具体实测范围见状态记录；优先级：P1。
- 目标：可多选 Three.js、CesiumJS、Babylon.js，按应用集成。
- 验收：最小场景渲染、资源回收及相应构建成功。
- 首期边界：已有 --screen 应用单独安装固定版本依赖、添加独立页面，详见 [THREE_SMOKE](THREE_SMOKE.md)。不把此工具视为完整的多引擎生成或模型安全能力。
- Cesium 边界与命令见 [CESIUM](CESIUM.md)：保留正式首页与 Vite 其他字段，原配置备份；支持本地椭球、GLB/.adui、多引擎组合和 env 自动构建保护，不接在线影像。
- Babylon 边界与命令见 [BABYLON](BABYLON.md)：保留正式入口，按需场景、GLB/.adui 加载与实例清理；支持多引擎组合，默认启用 env 自动构建保护，Vite 配置备份后增量加入插件。

### FR-007 模型安全加载

- 状态：已实现 .adui v1 AES-256-GCM 本地封装、浏览器授权回调解密及 Three/Babylon/Cesium GLB 适配；三引擎均支持无服务端 env 自动构建/加载、拆分密钥与可选域名限制，代表组合已验收；其他格式待扩展；优先级：P1。
- 目标：选择 3D 引擎时默认提供可关闭的模型加解密能力；优先 GLB，FBX / OBJ 按引擎格式兼容。
- 验收：AES-256-GCM 正确解密，拒绝错误密钥及篡改文件；embedded 模式提高直接复用门槛，不宣称密钥无法提取；external 模式密钥不进入网站包，授权回调保持可扩展。
- 创建选项：三引擎默认启用 embedded，CLI --model-protection 和逐应用 JSON modelProtection 支持 embedded/external/none；自动生成项目独立 KEY、package 的 models:keygen/models:keyrotate、忽略规则和备份。多引擎只配置一套，模型入口按 Three → Babylon → Cesium 选择，保留既有优先级。IV 每个模型独立随机生成，不配置固定共享 IV。
- 当前：建模师交付 GLB，开发/构建自动扫描、只输出 .adui；默认 embedded 由 env 配置并自动加载，不要求服务端或手动解锁，详见 [MODEL_BUILD](MODEL_BUILD.md)。
- 首期：后缀固定 .adui，32 MiB 自包含 GLB，随机 IV、完整头 AAD、密钥不随模型保存；到期/取消/晚到保护。格式与未实现范围见 [MODEL_SECURITY](MODEL_SECURITY.md)。

### FR-008 Monorepo 应用隔离

- 状态：逐应用与 JSON 批量新建已实现；2026-10-27 官方根 + Vue TS/TDesign/UnoCSS + React JS/Ant Design/Tailwind 通过创建、检查、完整构建与浏览器验收；其他组合、自定义布局仍待扩展；优先级：P1。
- 目标：同一工作区可包含不同框架、语言和插件选择的应用；根工作区不指定统一语言。
- 验收：配置互不污染，依赖与生成目录正确。
- 边界：保留官方默认应用和库；已有官方 pnpm 工作区用 `--workspace` 逐个添加；批量新建见 FR-010。根不接受框架、语言、UI/CSS 统一配置。自定义 glob 及其他包管理器暂不支持。

### NFR-001 安全与可靠性

- 状态：进行中；优先级：P0。
- 验收：拒绝路径遍历、拒绝覆盖已有目标目录、退出码准确、不嵌入生产密钥。

### NFR-002 本地验证（无 CI）

- 状态：基础本地检查已实现，2026-10-27 单元测试、文档校验及根 `vp check` 全部通过；跨组合验收持续扩展；优先级：P0。
- 验收：提供本地单元测试、文档检查与构建说明；**不得新增 CI/CD 工作流**。

### NFR-003 可维护性

- 状态：进行中；优先级：P1。
- 验收：核心需求编号稳定、代码索引准确，记录架构决策与实施状态。

## V1.0 范围与依赖

按顺序推进：官方基础模板（Vue/React × TS/JS 创建及构建已验证）→ CLI 交互和框架选择 → UI/CSS → 大屏 → 3D → 模型安全 → 跨组合验收。外部依赖版本、Vite+ 框架选项自动化及 npm scope 均需实际验证，不能推定。

## 变更记录

- 2026-10-26：Windows 验收通过 `starter-vue-js`（Vue/JS/TDesign/UnoCSS）和 `starter-react-js`（React/JS/Ant Design/Tailwind），均直接通过 `vp build`、`vp check`；组件真实渲染仍未验收，不新增 CI。

- 2026-10-26：Vue/React 新增 `ts`、`js` 两种官方模板选项，TypeScript 默认；JavaScript UI/CSS 集成适配 `main.js`、`main.jsx`、`uno.config.js` 和 JS 配置文件；不增加 CI。

- 2026-10-26：Vue + TDesign + UnoCSS、React + Ant Design + Tailwind CSS 的旧项目修复、检查和构建验收；新增 Vue 自动生成 `components.d.ts` 的 Vite+ 格式排除规则，不影响 TS 检查。

- 2026-10-26：修复 P3 非交互选项单测回归及 Vite+ lazyPlugins/无 plugins 配置兼容；增加针对已创建项目的显式补装模式，保持无 CI 约束。

- 2026-10-26：P3 初步实现 UI/CSS 选项、依赖安装与配置生成。仅完成单元级验证，真实 Vue/React 组合构建未验证。

- 2026-10-26：P2 新增基础交互式 CLI、默认值、参数校验、确认/取消及单元测试（不含 CI）。

- 2026-10-26：根据 Application 冒烟测试修复框架默认生成普通 Vite 的问题，明确 Vue / React 模板参数并修复 Windows DEP0190 触发方式。
- 2026-10-26：确定仓库 `adui-dev/viteplus-starter`；采用 Vite+ 官方基础模板；排除所有 CI/CD。

### FR-009 UI 组件实际渲染验收

- 状态：验收页面生成工具已实现；Vue TS/JS/TDesign/UnoCSS、React TS/JS/Ant Design/Tailwind 的代表组合已通过浏览器渲染、点击及 CSS 验收。React Fast Refresh lint 警告已通过分离组件与挂载入口修复，TS 实测热更新保留点击状态；其余组合待验收；优先级：P1。
- 目标：显式 `--ui-smoke` 在已有 Vue/TDesign、React/Ant Design TS/JS 应用中添加隔离验收页面，测试组件加载、点击计数与 CSS 原子类。
- 验收：无需修改 App 或 main 入口，拒绝覆盖同名文件；浏览器中组件按钮可见、计数改变、CSS 样式正确且无控制台错误。
- 范围：不支持未配置相应 UI 的应用，也不支持 Monorepo 根；不得增加 CI。

### FR-010 Monorepo JSON 批量生成

- 状态：已实现；示例 JSON 完整生成混合工作区，5 个生成阶段、根 ready 的 8 项检查/测试/构建任务及两应用浏览器验收均通过；优先级：P1。
- 目标：`--config <JSON>` 描述一个新工作区与 1–32 个应用，逐应用选择框架、语言、UI/CSS 和可选 `uiSmoke`；默认 TS，根与应用均委托官方入口。
- 验收：所有配置先校验，拒绝未知字段、非法组合、重名、Windows 保留名、官方默认包冲突及已有目标（含悬空链接）；dry-run 列出完整阶段计划，不写文件；执行中失败立即停止，报告已完成/失败/未执行，保留现场。
- 边界：version 固定 1，JSON 最大 1 MiB；仅新建工作区，不能在已有 workspace 内嵌套创建，不能混用单项目选项或维护模式；不自动回滚、覆盖、跳过失败阶段或续跑，不创建 CI/CD。

### FR-011 GLB 本地模型加载

- 状态：已实现首期自包含 GLB 2.0 加载、替换、清除和生命周期管理；Vue/React 使用用户提供 DamagedHelmet 实测贴图、完整视角、拾取、坏文件恢复与卸载重挂；优先级：P1。
- 验收：32 MiB 上限、头/分块及外部 URI 检查，失败保留旧模型，晚到资源不挂入已卸载场景，几何/材质/纹理/位图等去重清理。
- 边界：GLB 核心无远端 URL、压缩解码器或动画播放；授权/加解密由 FR-007 前置模块负责。Three 的贴图/视角/拾取与 Babylon/Cesium 的本地 GLB/.adui 加载分别验收，不互相扩大覆盖范围，详见 [THREE_SMOKE](THREE_SMOKE.md)、[BABYLON](BABYLON.md)、[CESIUM](CESIUM.md)。

FR-006：CLI --engines、JSON engines 与交互多选均已接入，保留 engine 单选。范围见 [多引擎](MULTI_ENGINE.md)。

## 2026-10-29：Cesium/Babylon 大屏像素策略

- 已实现：两引擎按容器 CSS 尺寸及 DPR 更新缓冲区，比例上限 2、最长边上限 8192；Babylon 考虑硬件纹理上限，隐藏容器跳过尺寸分配。独立验收页新增模式、半宽、全屏控件，不修改正式入口。
- 本地验证：共享观察器覆盖 DPR 无事件变化、媒体查询重订阅、窗口/全屏/容器变化与卸载清理；四种框架语言生成计划均测试。Vue TS 独立应用与 React JS Monorepo 应用检查及双引擎多入口构建通过。
- 部分浏览器验收：Vue Babylon 已验证模式、容器与 DPR；原生全屏被浏览器拒绝，电脑操作工具随后停止。Cesium 新策略及 React 真实交互、全屏仍待补验，不能标记整项验收完成。

2026-10-29 补验结果：上一轮大屏专项的浏览器遗留项已在 Vue TS 独立应用、React JS Monorepo 子应用完成。Cesium 两框架和 React Babylon 的 DPR 1/2/3 均符合最高 2 倍策略（Vue Babylon 已于前轮验证）；两框架、两引擎原生全屏进入/退出、覆盖层控件、卸载 canvas=0 和重挂 ready 均通过。仅对这些代表组合有效，不扩展为全部框架/语言及显示器环境已验证。

## 2026-10-29：UI Smoke 组合扩展

FR-003/FR-009：支持 Vue Element Plus、Ant Design Vue、TDesign 与 React Ant Design、TDesign 的 TS/JS 独立验收页。新增三种 UI 的代表组合及 React TDesign TS Monorepo 已通过真实按钮渲染、点击及原子 CSS 验收。检查对应组件包和 Vue resolver，仍拒绝无 UI、Monorepo 根、错误依赖和已存在文件。其余语言/CSS 组合不扩大验收声明；只读 UI Smoke 计划 330，总矩阵 462，实际构建另计。

## 2026-10-29：生成失败恢复信息

FR-010 / NFR-001：单应用执行失败报告阶段、目标与已完成步骤；批量失败保留现场，增加未执行步骤的独立 argv 和 PowerShell 指引。失败步骤不列为可直接重试，必须先检查现场和依赖关系。参数重新校验、重复输出拒绝及官方模板入口保持有效；没有自动删除、回滚、覆盖式续跑或生产凭据持久化。可恢复性预检与真正的断点恢复仍未实现。

## 2026-10-29：已有工作区只读预检

FR-008 / FR-010 / NFR-001：新增 --inspect-workspace，可配 --config 对照原批量 JSON。读取官方 pnpm 工作区结构与成员清单，检查重复包名、预期框架/语言入口、声明和预设文件，输出 JSON 状态及准确退出码。拒绝链接路径、非法配置和写入模式混用。检查不执行配置、读取环境密钥、安装或恢复文件；结构存在不等于生成/构建已完成。自动断点续跑仍未实现。

## 2026-10-29：逐应用人工恢复计划

FR-008 / FR-010 / NFR-001：新增 --plan-recovery，必须携带 --config。复用只读检查与工作区新建预检，仅为缺失且无冲突的应用生成新建 argv；已有结构完整应用仅建议验证，部分完成或存在全局问题时列人工处理原因，不生成补写动作。新建命令走原官方模板，已有目录与文件继续拒绝覆盖。计划不执行、不写状态，不称为自动恢复或构建验收通过。

## 2026-10-29：显式新建缺失应用

FR-008 / FR-010 / NFR-001：新增 --execute-recovery，必须携带原批量 JSON，重新规划后仅执行缺失应用的新建和对应验收页步骤。初始计划存在人工阻塞时零执行；已有应用跳过。每个新建应用执行前重检现场，子进程返回后核对结构，UI 验收页另做预检，失败即停并保留现场。继续委托官方模板，禁止自动覆盖、删除、回滚或接收任意执行计划。
