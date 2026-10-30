# 项目上下文

更新日期：2026-10-30。最新进度见文末各轮记录。

## 项目定位与约束

- 仓库：`adui-dev/viteplus-starter`。Vite+ 官方 `vite:application` / `vite:monorepo` 是唯一基础工程来源，Vue/React Application 按语言选 `vue` / `vue-ts` / `react` / `react-ts`。
- 已实现：基础 CLI 交互与参数模式、Application UI/CSS 集成、旧项目补装及 `--repair-existing`、UI Smoke、通过 `--workspace` 逐个添加及通过 JSON 批量新建 Monorepo 应用、本地单元测试与文档检查。
- 当前阶段：Windows V1 实际使用与问题修复。显式新建缺失应用的恢复、三引擎及代表大屏专项已实现和验收，具体范围见文末及 GENERATOR_STATUS；自定义布局、其他操作系统与覆盖式恢复不在本阶段范围。
- 严格要求：**不得添加任何 CI/CD、自动发布或部署工作流**；仅人工本地测试。

## 用户 Windows 实机验收（已确认）

- 运行环境：Node 24.22.1、pnpm 12.15.0、Vite+ 1.4.0。
- Vue + TDesign + UnoCSS：`--repair-existing` 成功，原 `./starter.plugins` TS2307 消失；`vp check` 首次仅提示自动生成 `src/components.d.ts` 格式差异，`vp check --fix` 后通过；`vp build` 通过。
- React + Ant Design + Tailwind CSS：`--repair-existing` 成功；`vp check` 直接通过；`vp build` 通过。
- Vue + JavaScript + TDesign + UnoCSS：项目创建及安装成功；`vp build` 18 个模块、218ms；`vp check` 格式检查 14 文件通过，Lint/类型检查 6 文件无错误。
- React + JavaScript + Ant Design + Tailwind：项目创建及安装成功；`vp build` 22 个模块、159ms；`vp check` 格式检查 13 文件通过，Lint/类型检查 3 文件无错误。
- **四种框架/语言基础组合已有真实创建与构建验证**，但未覆盖组件实际页面渲染与交互，也未覆盖所有 UI/CSS 组合。

## 2026-10-26 语言选择扩展

- Vue/React Application 均可选择 `ts` 或 `js`，默认 TypeScript；官方 Vite+ 模板映射已接入 CLI 交互与 `--language`。
- UI/CSS 生成器适配 JS/JSX 入口、JS Vite 配置与 UnoCSS 配置；Vue JS 不生成 `.d.ts`。
- **2026-10-26 用户 Windows 实机验证通过**：`starter-vue-js` 和 `starter-react-js` 均由 Vite+ 官方 JavaScript 模板创建，已安装选定 UI/CSS 并自动格式化；`vp build`、`vp check` 均直接通过。
- 没有新增 CI/CD。

## 本轮修复

- 针对 Vue 自动导入组件的 `src/components.d.ts`：保留 `unplugin-vue-components` 的 `dts` 输出，通过 Vite+ `fmt.ignorePatterns` 排除该自动生成文件的格式检查；不关闭 TypeScript 类型检查。
- 新生成的 Vue + UI 项目将自动加入配置，且保留已有 `fmt` 字段及忽略规则。React 不加入此 Vue 专属配置。
- 独立 Node 测试覆盖默认配置、已有 fmt 配置、已有 ignorePatterns、幂等与异常结构。用户已验证 Vue JavaScript 项目构建后首次 `vp check` 直接通过；Vue TypeScript 新建项目的该规则仍待独立复验。

## 下一步

1. 按 Windows 指南在实际项目中使用现有能力，优先修复生成、补装及输入校验的具体问题；不重复扩张组合或新增业务演示。
2. 默认本地 normalize.css、独立应用与 Monorepo 的 UI/CSS 联用已完成代表验收；官方模板和文件保护边界继续保留。
3. 新需求明确后再调整范围；不能将代表组合通过视为完整矩阵通过，不推进其他系统或发布流程。

用户协作偏好：每轮完成后汇报实际结果，并明确下一步建议；沿用分步提交与推送流程，不添加 CI/CD。

## 2026-10-26 独立 UI Smoke 页面

- 已新增 CLI `--ui-smoke`：只为已有 Vue + TDesign 或 React + Ant Design Application 生成隔离 `/ui-smoke.html`。
- TS/JS 入口均支持；Vue 检查 `<t-button>` 自动导入，React 使用 Ant Design `Button`；点击后显示更新计数，UnoCSS/Tailwind 类显示浅绿色样式区域。
- 不改动原始 `App.*`、`src/main.*`、`vite.config.*`；写入前检查库依赖与现有文件，防止覆盖。
- 代码级单元测试已编写，**实际浏览器组件渲染和交互尚未验收**。
- 下阶段：用户在已生成的 Vue/React JS 项目中运行 UI Smoke、`vp check`、`vp dev`，再推进 Monorepo 多应用创建和其余 UI/CSS 组合。

## 2026-10-27 UI Smoke 实机验收

- 验证基线：`511c8c5`，本地与 fetch 后的 `origin/main` 一致；未添加 CI/CD。
- 在已有 `starter-vue-js`、`starter-react-js` 中通过 CLI 成功生成验收页，未重新安装依赖；App、main、Vite 配置的前后 SHA-256 一致。
- Chrome 实测 Vue/JS/TDesign/UnoCSS 和 React/JS/Ant Design/Tailwind：主按钮可见，点击计数从 0 变为 1，浅绿色背景、深绿色文字、8px 圆角和 16px 内边距均生效；所验收页面控制台无 warn/error。
- 两项目的 `vp check`、`vp build` 均退出 0；Vue 无警告，React 新增的 `src/ui-smoke/main.jsx:7` 有一条 `react/only-export-components` Fast Refresh 警告，尚未修复。
- 仓库本地 `node --test` 59/59 通过，文档静态检查通过；根仓库 `vp check` 因 31 个文件格式问题退出 1，未进行全仓格式化。
- 本轮只验收上述两个已有 JavaScript 项目；TypeScript 验收页、其余组合及 Monorepo 仍待独立验证。

## 2026-10-27 P4 Monorepo 多应用首期

- 新增 `--workspace <path>`：以已有官方 pnpm Monorepo 为根，委托 `vite:application` 创建 `apps/<name>`，逐应用选择 Vue/React、TS/JS、UI/CSS；根仍委托 `vite:monorepo`，保留默认 website/utils，无 CI/CD。
- 新增工作区预检、同名包/已有目录/junction 保护、Vue TS 声明根格式忽略规则增量合并。支持 dry-run、apply-existing、ui-smoke；暂不支持自定义 glob、批量配置文件和旧版 repair-existing。
- 实测修复：官方新成员配置的 vite 导入与根 lint 规则不一致，使用官方 lint 定向修复；为 unplugin-vue-components/unocss 补充根 packageExtensions 的 Vite peer 元数据，修复混合工作区因类型解析到不同 Vite 实例引起的 TS2321；不关闭检查、不使用类型断言。
- 全新验证目录：`D:\Workspace\adui-studio\adui-p4-final-20261027`。由当前 CLI 完整创建官方根、`apps/vue-admin`（Vue TS/TDesign/UnoCSS）、`apps/react-portal`（React JS/Ant Design/Tailwind）。根无 UI/CSS 直接依赖，两个应用配置隔离。
- 根 `vp run ready` 退出 0：根检查无 lint/type 警告或错误，utils 1 项测试通过，网站、库与两应用完整构建共 8 项任务全部成功。官方 utils 构建提示 TypeScript 7 API 实验性警告，未修改官方版本。
- 构建后再次根 `vp check` 通过，46 文件格式正确、19 文件无警告或 lint/type 错误，Vue 自动生成声明不造成格式失败。
- 两应用均通过 `--workspace --ui-smoke` 生成独立验收页；Chrome 实测按钮渲染、点击 0→1、浅绿色 CSS、8px 圆角和 16px 内边距正确，控制台无 warn/error。
- 生成器 `node --test` 71/71 通过、文档检查及改动代码的定向 lint 通过；本阶段根 `vp check` 报告 68 个文件格式问题（初始 31 个，期间出现新增未跟踪 Skills 文件），未修改这些 Skills 或做无关全仓格式化。后续按用户授权分步提交并推送，Skills 清理结果另行记录。

## 2026-10-27 项目 Skills 精简

- 按用户要求审查仓库内 20 个 Skills，保留 `starter-preset-development`、`git-commit`、`gitmoji`，移除 17 个不适用、重复或当前未使用的安装目录；未修改全局或插件自带 Skills。
- 保留第三方 Skill 原文及来源哈希，`skills-lock.json` 只保留当前安装项；清理明细见 `docs/SKILLS.md`。
- 清理后 71 项测试、文档检查通过；根 `vp check` 报告 35 个文件格式问题，包含既有文件与保留的第三方 Skill 原文，未改动检查配置或跳过 Git hooks。

## 2026-10-27 依赖复现

- 将现有根 pnpm 锁文件纳入版本控制，固定已验证的 Vite+ 1.4.0 及传递依赖，不修改依赖声明或升级版本。
- pnpm 11.24.0 的 `pnpm install --frozen-lockfile --offline` 退出 0，依赖已是最新锁定状态；P4 样例仍使用 Vite+ 管理的 pnpm 12.15.0。
- 按历史的 emoji + Conventional Commits + 中文说明拆分 P4 功能、Skills 精简、依赖锁定三个提交；用户已授权推送 main。没有新增 CI/CD，也未执行 npm 发布或 Release。

## 2026-10-27 本地格式基线

- 统一项目自有源码、测试、配置和文档格式，清除此前的全仓格式失败，不改变运行逻辑和依赖版本。
- 第三方 `git-commit`、`gitmoji` Skills 按安装原文保留，根 fmt 仅排除这两个目录以保持来源哈希；项目源码、测试和文档仍完整参与检查。
- `node --test` 71/71、文档静态检查、根 `vp check` 均通过；根检查 35 文件格式正确，18 文件无警告或 lint 错误。无 CI/CD。

## 2026-10-27 React UI Smoke 质量修复

- React TS/JS 新版验收页独立生成 `SmokeApp.tsx|jsx` 与 `main.tsx|jsx`，修复 `react/only-export-components` 警告；不关闭 lint 规则，旧验收页不自动覆盖。
- 新增组件文件预存在时的写入前保护测试，JS/TS 均验证不会先写 HTML/入口或调用格式化。72 项单元测试、文档检查、根 `vp check` 全部通过。
- 实机复验：既有 `starter-react-p3`（TS）新增新版页面，`vp check` 17 文件格式正确、5 文件无警告或 lint/type 错误，完整 `vp run build`（tsc -b + Vite）通过；全新官方 `quality-react-js-20261027`（JS）同样通过检查（14 文件格式、5 文件无警告或 lint/type 错误）和构建。
- Chrome 两页面均通过按钮点击 0→1、Tailwind 样式和控制台无 warn/error 验收；TS 页面在点击后修改组件标题再恢复，Fast Refresh 两次更新均保留计数 1。临时标题改动已恢复，开发服务验收后停止。
- 自有文件格式基线与 React 行为修复分步提交；继续保持无 CI/CD、无依赖升级、无发布。

## 2026-10-27 P4 第二期：JSON 批量新建

- 已接入 `--config`：version 1 的严格 JSON 描述一个新工作区与 1–32 个应用，支持逐应用框架、TS/JS、UI/CSS 和可选验收页；目标为 cwd/name，不是配置文件目录。
- 预先拒绝所有非法选项、未知字段、重名、默认包冲突、Windows 设备名和已有目标（含悬空链接）；dry-run 无写入，执行前重新规划；根官方生成后再次校验全部应用，根/应用/验收页串行执行。
- 实际应用阶段复用既有 CLI，依赖与路径通过 argv 传递。失败摘要包含已完成/失败/未执行阶段并保留现场；不自动回滚或续跑。
- 工具接入阶段 81 项测试、文档检查和根 `vp check` 通过；示例工作区 `adui-batch-demo` 的后续实机结果见下节。未增加依赖、CI/CD 或发布配置。

### P4 第二期实机验收结果

- 使用提交中的 `examples/monorepo.batch.json` 在仓库上级目录直接运行 `--config`，完整生成 `D:\Workspace\adui-studio\adui-batch-demo`，5 个阶段均完成：官方根、Vue TS admin、其验收页、React JS portal、其验收页。
- 根无 Vue/React UI/CSS 直接依赖，两个应用插件与依赖隔离，官方 website/utils 保留，未产生 `.github/workflows`。
- 根 `vp run ready` 退出 0：检查通过、utils 1 项测试通过、全部包完整构建共 8 项任务全部成功；官方 utils 构建仍有 TypeScript 7 API 实验性提示，未改模板版本。
- 构建后根 `vp check` 再次通过：47 文件格式正确，20 文件无警告、lint/type 错误；Vue 声明的格式排除保持有效。
- Chrome 两验收页按钮显示、点击计数 0→1、CSS 颜色/8px 圆角/16px 内边距正常，控制台均无 warn/error；验收后开发服务已停止。
- 重复执行相同 batch 退出 1，明确拒绝已有根，根 package.json 哈希保持不变。失败阶段停止及保留部分文件由受控测试覆盖，不破坏真实工作区制造失败。
- 生成器最终 81 项测试、文档校验和全仓 `vp check` 均通过；功能与实机验收记录分步提交并按用户授权推送。下一步：P5 大屏适配首期。

## 2026-10-27 P5 首期：分层大屏插件

- 参考 smart-geology-web 的 AdScreen.vue，重做 packages/screen：框架无关布局/DOM 控制器、Vue 插件与 React 组件、CSS 和 TS 声明。仅阅读原业务文件，没有修改业务工程；业务 top/right 常量改为 engineInsets，核心默认零内缩。
- 支持 contain/cover/stretch/none、禁放大、双轴比例、原生引擎层、HUD、两种浮层、坐标反算、原生全屏 Promise 接口和卸载清理。Vue 使用命名 Symbol 注入及按值监听，实测修复内联对象/layout 回调导致的递归；React 使用 DOM 回调 ref 状态，解决官方 TS 模板严格 refs 警告，不关闭 lint。
- CLI --screen 与严格尺寸/模式参数、apply-existing、已有 Monorepo 成员及批量应用 screen 字段已接入。只新增 src/adui-screen 源码快照、独立演示目录/HTML，无需额外应用依赖，保留正式 App/main/Vite 配置，预检拒绝已有文件和链接。包 private，未发布 npm。
- 四种官方已有应用均实际补装：adui-batch-demo/apps/admin（Vue TS）、apps/portal（React JS）、starter-vue-js、starter-react-p3（React TS）。最终独立应用检查/构建通过；混合工作区根 ready 8/8 成功（4 项命中既有缓存），71 文件格式正确、38 文件无 lint/type 警告错误，utils 1 项测试通过。默认构建保留原首页，不把独立演示页作为生产入口。
- Chrome 两框架均验证容器 ResizeObserver、四模式、HUD 点击 0→1、网格中心坐标约 960/577.5、引擎 transform=none、卸载重挂。最终新标签复验控制台 warn/error 均为空；早期 Vue 递归错误已修复，不把旧标签历史日志当作最终结果。
- 全屏请求在当前 Chrome 自动化环境返回 TypeError: not granted，页面已正常显示拒绝；控制器的进入/退出调用和事件合帧由单测覆盖，但浏览器全屏成功/退出恢复仍待人工验收。未绕过浏览器权限。真实 Three/Cesium/Babylon canvas、DPR 与拾取尚未实现，不宣称 3D 验收完成。
- 91/91 Node 测试、文档检查、全仓 vp check 均通过。新增 screen.batch.json 在仓库上级目录 dry-run 成功；本轮未完整执行这个新批量样例，不混同先前批量工作区的创建验收。锁文件仅增加新可选框架 peer 图，未升级已有声明；联网补齐缺失缓存后 frozen-lockfile 离线安装退出 0。
- 沿用 git-commit/gitmoji Skills 和历史中文 emoji 格式分步提交推送；无 CI/CD、npm/Release 发布。下一步先人工确认原生全屏成功路径，再接入 Three.js 最小真实场景，验证 drawing buffer/DPR、拾取与资源回收。

## 2026-10-27 Three.js 首期与全屏补验

- 新增 private packages/three：真实 WebGLRenderer 最小旋转线框立方体，原生容器测量、相机比例、DPR（最高 2/单边上限）、Raycaster 拾取、初始化异常/contextlost 处理及幂等资源清理。未实现模型加载、加解密、其他引擎或正式批量引擎选择。
- 新增 --three-smoke，向已有 --screen 的官方 Vue/React TS/JS 应用安装 three 0.186.1、@types/three 0.186.0 并生成独立页面。保留正式入口/Vite 配置及已有大屏源码；安装前后校验输出与父目录，拒绝链接、覆盖、已有其他依赖版本。包管理器可更新应用 package.json 和工作区 catalog/锁文件；失败保留现场。
- 四种应用实际补装：adui-batch-demo/apps/admin（Vue TS）、apps/portal（React JS）、starter-vue-js、starter-react-p3（React TS）。全部检查与原首页构建通过。实测修复 React TS 的按钮 PointerEvent 目标类型，不用类型断言或禁用规则绕过。
- 混合工作区根 ready 8/8 成功（1 项已有缓存）：87 文件格式正确、50 文件无 lint/type 警告错误，utils 1 项测试通过；官方 utils 仍提示 TypeScript 7 API 实验性，未升级其依赖。专项构建产物最初被全仓格式扫描发现，已移出工作区后重跑成功，不新增忽略规则掩盖。
- Vue/React 另用临时 mergeConfig 将 three-smoke.html 设为真实生产构建入口，两项成功，输出约 598/755 kB，保留默认 500 kB 分块提醒。显式导入所需 Three 类型，避免传递整个引擎命名空间造成额外包体。临时配置已移除，初次构建产物保存至 D:/Workspace/adui-studio/three-build-verification-20261027/vue 与 react，最终构建产物位于样例应用忽略的 dist/three-verification；未修改正式 Vite 配置。默认首页构建不视为 Three 页面专项构建。
- Chrome 两框架真实旋转渲染、DPR 2、中心拾取变色、四模式/容器切换均实测；contain 半尺寸示例逻辑视口 956×501，实际 canvas 缓冲 1912×1002。卸载后 disposed=true、canvas 数量 0；重挂后一个新 canvas，中心点击 picks=1/selected=true，最终控制台 warn/error 为空。GPU 清理调用由受控测试验证，未进行驱动堆内存分析；OS 实体跨屏 DPR 变化未实测。
- 已补齐 P5 原生全屏成功路径：后台请求仍可 not granted，激活 Chrome 标签后普通用户手势成功进入，两框架 :fullscreen 分别为 ad-screen/ad-screen（含空白类名差异）；HUD/原生浮层保留，canvas 缓冲随全屏扩展，退出恢复原容器。只切到前台并使用正常浏览器输入，未修改安全设置或绕过权限。
- 98/98 Node 测试、文档检查、根 vp check 通过；冻结锁文件离线安装成功，仅新增 three 锁定条目。pnpm peers check 仍报告已有 vite npm alias（版本显示 1.4.0）与 Vitest 5 的 vite semver 提示；相关原有版本/锁条目未改，不将其称为无 peer 警告。
- 本轮继续采用 git-commit/gitmoji，按用户新要求提交标题不再附加无 CI 后缀；仍不添加流水线，不发布 npm/Release。下一步：将已验证 Three 能力接入正式按应用引擎选项与批量配置，设计按需加载/分块，再逐步扩展其他引擎。

## 2026-10-27 Three.js 第二期：正式应用选项与按需分块

- 新增 --engine none|three；默认不引入引擎，新建 Three 应用要求显式 --screen，已有大屏应用可用 --engine three --apply-existing；根不接受统一引擎。严格拒绝未知值、错误类型（含 null）及独立 smoke/repair 混用，不替换官方首页、App/main 或 Vite 配置。
- 批量 JSON 每应用增加 engine，Three 须同时 screen，应用阶段复用 CLI 完成集成，UI Smoke 独立阶段不重复传引擎/大屏。dry-run 列出引擎文件与固定依赖，不写文件。组合补装在 UI 安装和大屏写入前校验 Three 目标与已有依赖版本；已有输出及旧快照拒绝覆盖，不做隐式迁移。
- 新增 createLazyScene，只有 start 才 import 引擎/创建 WebGL；并发 start 复用请求，失败可重试，加载期间 DPR 更新有效。卸载阻止晚到模块创建资源/通知失效组件，构造回调同步卸载也清理刚创建对象。不能取消 import 下载本身；受控测试覆盖这些生命周期边界。
- 完整执行 examples/three.batch.json，生成 D:/Workspace/adui-studio/adui-three-options-demo（官方根 + Vue TS vue-dashboard + React JS react-dashboard），3 阶段完成。根仅有官方工具链直接依赖，无 Three/UI/CSS 直接依赖，官方 website/utils 保留，无 .github/workflows。
- 新工作区根 ready 8/8 成功（本轮首次无缓存），83 文件格式正确、48 文件无 lint/type 警告错误，utils 1 项测试通过；官方 TypeScript 7 API 实验性提醒仍在。后续对最终源码再次根 check 成功。另从官方入口实际创建 three-option-react-ts 与 three-option-vue-js，均检查与原首页构建通过，覆盖完整四种框架/语言。
- 两框架专项双入口构建：临时 mergeConfig 同时指定 index.html/three-smoke.html，保留原配置，完成后移除临时配置，产物位于各应用忽略的 dist/three-options。最终验收入口约 10.26/10.74 kB，共享框架约 64.40/219.44 kB，引擎独立分块均为 adui-three-CLYS0v9R.js，525.76 kB、gzip 131.15 kB，manifest 标记 isDynamicEntry。入口大小不含共享框架，不当作完整首屏大小；引擎仍有默认 500 kB 提醒，未隐藏。
- Chrome 生产预览网络捕获：两页面初始均无引擎请求、canvas=0；点击加载后分别请求独立引擎分块并出现真实 canvas，中心拾取变色。卸载 canvas=0/disposed=true；重挂后仍无 canvas，需再次点击创建新实例，两框架控制台 warn/error 均为空。最终 React 重载复验新构建及拾取通过；加载前截图已保存。加载失败/晚到导入由受控测试覆盖，未通过破坏真实网络制造失败。
- 最终 106/106 Node 测试、文档静态校验、仓库 vp check 及冻结锁文件离线安装均通过；未修改依赖版本或锁文件。旧样例未自动覆盖升级。
- 按中文 emoji 格式分步提交并推送，不附加额外后缀，不创建流水线或发布。下一步：接入 GLB 模型加载与错误/资源回收验证，再逐步扩展模型授权及加解密边界；其他引擎与多选仍未实现。

## 2026-10-28 GLB 本地加载与 DamagedHelmet 实机验收

- 接入自包含 GLB 2.0：本地文件读取、GLTFLoader 动态导入、PBR 内嵌贴图、程序化环境光、模型居中/归一化/相机适配、替换/清除与回收。首期仅内嵌资源，32 MiB 上限；外部 URI 与未配置的压缩解码器拒绝。授权/加解密仍未实现，不把格式检查称为安全加载完成。
- 用户模型 C:/Users/ADui/Downloads/DamagedHelmet.glb，3,773,916 字节，一个 mesh、五张内嵌 JPEG，前后 SHA-256 均为 a1e3b04de97b11de564ce6e53b95f02954a297f0008183ac63a4f5974f6b32d8。仅通过文件选择进入本地浏览器解析，原文件未修改，模型二进制未纳入 Git，也不硬编码进生成模板。
- 新增请求代次与独占资产清理：晚到结果不覆盖新模型或挂入已卸载视图；失败保留旧模型，清除释放已返回模型的几何、材质、纹理、骨架并关闭位图，共享引用去重；环境/renderer 在查看器卸载时回收。未测 GPU 驱动堆内存，未宣称追踪加载器拒绝前未返回的全部内部对象。
- 上轮界面工具受权限/URL 确认限制而暂停；本轮文件选择成功。Chrome Vue TS 与 React TS 均实测原文件贴图完整显示、model=ready/modelMeshes=1、初次中心拾取 selected=true、坏文件提示且保留旧模型、重新选择恢复、清除后重载、容器变化与 DPR 2；卸载后 canvas=0/disposed=true，重挂后可再次选择加载，控制台 warn/error 均为空。
- 实测发现包围半径漏计归一化比例，头盔下部裁切；已按缩放后包围球半径修正并留边距，增加边界回归测试，最终截图保留完整头盔。模型文件输入在读取前检查大小，异步读完核对实例，避免卸载后的文件读取更新失效组件。
- 四种官方应用：独立 helmet-vue-ts、helmet-react-ts，已有官方工作区 adui-three-options-demo 内新增 JS 成员 helmet-vue、helmet-react。应用检查/原首页构建通过；Monorepo 根 ready 最终 10/10 成功（1 项已有缓存），148 文件格式、92 文件 lint/type 无错误警告，utils 1 测试通过。官方 TypeScript 7 API 实验性提示保留。
- Monorepo 初次根检查暴露多 Vue 应用的 *.vue 声明合并导致 duplicate component。生成器仅在新 Vue JS 成员无 tsconfig/jsconfig 时补充独立配置范围；不改官方 env 声明、不覆盖已有配置、不设置 skipLibCheck/checkJs、不禁用规则。实机作用域修复及不覆盖回归测试通过。
- Vue/React TS 均完成专项双入口（index + three-smoke）构建，临时配置已移除，产物在各样例忽略的 dist/glb-verify；GLTFLoader 分块约 45.19 kB、gzip 13.47 kB，引擎约 577 kB，保留默认 500 kB 提醒；不以默认首页构建替代该结果。
- 最终 113/113 Node 测试、文档检查、仓库 vp check 与冻结离线安装通过，未升级依赖或修改锁文件。功能与实机记录分步提交推送，不附加额外后缀；无流水线或发布。下一步：设计 AES-GCM 模型封装、解密加载与授权接口契约，继续保持授权/解密/引擎边界分离。

## 2026-10-28 .adui 模型加密首期

- 按用户指定固定 .adui 后缀，新增 packages/model-security 独立源码核心和 Node keygen/encrypt 工具；未新增应用依赖或发布包。AES-256-GCM 使用随机 12 字节 IV、128 bit tag、完整头作 AAD，modelId/keyId/format 元数据可读且经认证，密钥不随模型保存。32 MiB 自包含 GLB，严格版本/flags/长度/字段校验。
- CLI 保留原 GLB，输出 wx、路径含祖先拒绝链接/junction、输入读取受大小约束，不回显密钥或错误 JSON 内容；密钥和 .adui 仅在仓库外生成。Windows ACL 未修改，不把 POSIX mode 当作 Windows 私有权限已落实。
- 浏览器 authorize 回调返回不可导出、decrypt-only AES-256 CryptoKey 和 expiresAt；解密前后检查有效期和取消。lazy 请求代次使晚到授权/解密失效，运行时 invalidate 丢弃晚到解析资产；失败保留已有模型，临时明文最终清零，不声称擦除 Web Crypto/JS/GPU 全部副本。
- Vue/React TS/JS 验收页支持 .glb/.adui 和独立本地验收密钥文件，内存 grant 10 分钟；清除授权同时清除模型，卸载清除引用。生产授权接口、响应/失败/撤销约定写入 MODEL_SECURITY，生产服务与 HTTP 适配仍未实现，浏览器解密不等同 DRM。
- 真实生成 C:/Users/ADui/Downloads/DamagedHelmet.adui，3,774,024 字节；独立演示密钥 C:/Users/ADui/Downloads/helmet-demo.key.json，仅本地验收。解密 3,773,916 字节，SHA-256 与未改动原件均为 a1e3b04de97b11de564ce6e53b95f02954a297f0008183ac63a4f5974f6b32d8。两应用专项构建 JS 未包含该演示密钥文本；密钥和模型未纳入 Git。
- Chrome Vue TS/React TS 均完成原 .adui 认证解密、完整头盔及贴图渲染；未授权拒绝、篡改 tag 拒绝且保留旧模型、React 同 keyId 错误密钥拒绝、有效密钥恢复、Vue 清除授权后再次拒绝。两框架卸载 canvas=0/disposed=true，重挂重新授权可恢复；React 重挂后不继承授权。共享源码更新后完整刷新复验最终版本，最终 model=ready/modelMeshes=1，控制台 warn/error 为空。
- 通过官方入口生成独立 adui-encrypted-vue-ts、adui-encrypted-react-ts；既有官方 Monorepo 新增 JS encrypted-vue/encrypted-react，旧成员源码未覆盖。初检发现 React unbound-method 警告，改为显式函数回调转发，未禁用规则。最终两 TS check 无警告，Vue 42 文件/27 代码文件，React 40/25；原首页构建通过。
- 工作区 ready 首次 12/12 成功（1 缓存），最终源码再次 12/12 成功（10 缓存）；最终根检查 221 格式文件、144 lint/type 文件无错误警告，utils 一项测试沿用缓存。官方 TypeScript 7 API 实验性提示保留。
- 两 TS 应用完成 index + three-smoke 双入口专项生产构建，临时配置删除，产物位于忽略的 dist/adui-verify；GLTFLoader 45.19 kB，引擎约 577 kB，默认 500 kB 提醒保留。根 122/122 Node 测试（包括原生 Node crypto 互操作、头/IV/密文/tag 篡改、过期/拒绝/取消/快照/晚到、真实 CLI）、文档检查和 vp check 通过，未改依赖版本或锁文件。
- 按中文 emoji 分步提交推送，无流水线或发布。下一步：实现可接真实服务的 HTTP 授权适配器，校验模型/密钥响应绑定、同源传输、到期与失败关闭，再提供受控本地服务联调示例；不将演示密钥 provider 迁入生产。

## 2026-10-28 无服务端模型自动构建

- 用户最终确认目标为防直接复用、提高寻找密钥的成本，不要求不可破解。默认 embedded 模式：env 配置、模型自动扫描/加密、浏览器自动解密；保留 external 独立解锁模式。不再推进生产授权服务。参考 zhgk-web-v3 的 env/脚本/CustomModel 加载方式，只读取实现与变量名/长度，未回显、复制或修改业务密钥/工程。
- 新增 aduiModels Vite 插件、增量安装器和四组合 model-smoke 独立页；只支持当前版本官方 Three 应用。安装器 wx 备份 Vite 原配置并保留其他字段；正式首页/App/main、大屏及既有 Three 快照不覆盖，旧快照拒绝自动升级。JS 无 tsconfig/jsconfig 时补独立 jsconfig，解决 Monorepo 虚拟模块默认导出 models 声明冲突，不关闭类型检查。
- Node 读取 ADUI_MODEL_KEY/Base64 与 KEY_ID，可指定 envFile；embedded 支持参考变量 VITE_ADUI_AES_KEY 的 UTF-8 32 字节形式，但不使用固定 VITE_ADUI_AES_IV。继续采用自包含 GLB + .adui v1 AES-256-GCM/随机 IV，旧 CBC/Base64 文件须从原 GLB 重新生成，不混称兼容。
- buildStart 自动扫描并输出全部 GLB 密文，即使正式首页没有导入虚拟目录也输出 .adui。虚拟模型目录提供哈希 URL；原 GLB 不作为资产复制。密钥在运行时代码中采用随机掩码拆分，产物无原始 Base64/hex/二进制密钥字面量，但浏览器会重建，明确可逆向。可选 hostname 限制在生产模式生效，不能称为强授权。
- 开发 middleware 拒绝原模型与 env/密钥直访，返回内存密文；监听变更与新增删除，密钥轮换同时使目录及密钥模块缓存失效。构建前检查 public，generateBundle/writeBundle 检查已知明文、Base64 副本与原始密钥。失败可能保留输出，不部署失败产物；未知第三方自定义编码不在完整识别承诺内。
- 新增 keygen-env、export-unlock 和同源/限长流式下载；运行时共享取消/晚到保护与模型清理。无服务端、无新增依赖版本/锁文件修改、无流水线或发布。
- 四种官方样例：独立 adui-model-vue-ts/external、adui-model-react-ts/embedded；既有工作区新 JS model-vue/external、model-react/embedded。生成独立测试 env，未复用业务密钥；将用户 DamagedHelmet 复制到样例受保护目录，未纳入本仓库。两 TS check 分别 55 格式/38 代码与 53/36，通过原首页构建。
- 四组合 index + model-smoke 专项构建全部通过，临时配置移除；TS 专项产物在 dist/model-verify，JS 专项之后的根 ready 重建为默认 dist（专项之前已验证）。专项开启 sourcemap 检查，未设为业务默认。GLTFLoader 约 45.23 kB、引擎约 577 kB，500 kB 提醒保留。
- 工作区 ready 初次修复后 14/14 成功（1 缓存），最终 14/14 成功（10 缓存）；根 321 格式文件/218 lint/type 文件无错误警告，官方 utils 一项测试仍通过，TypeScript 7 API 实验性提醒保留。四份最终产物各有一个 .adui，无 GLB/完整明文/Base64 副本或原始密钥字面量，分别解密后 SHA-256 均与原件 a1e3b04de97b11de564ce6e53b95f02954a297f0008183ac63a4f5974f6b32d8 一致，原件未改动。
- Chrome 实测 React 生产与开发自动加载原头盔，model=ready/modelMeshes=1、贴图完整、最终 warn/error 为空；生产 127.0.0.1 被允许，localhost 被同一份产物拒绝且 canvas=0。Vue external 初始锁定，导入独立解锁文件后生产页 ready；刷新重锁。截图保存在会话输出目录。
- 真实 verify-model-build 脚本在受控临时目录测试两模式 build/decrypt、HTTP 明文/密钥 403、密文 200、模型变更加密、env 自定义文件轮换失效。曾因写 .env.local 触发 Vite 自身自动重启导致测试旧随机端口断连，已改用插件管理的私有 env 文件进行轮换验证；没有跳过检查。
- 最终 131/131 Node 测试、文档校验、根 vp check（96 文件格式/66 代码无 lint 警告错误）及真实构建回归全部通过。功能和实机记录按中文 emoji 分步提交推送，不附加额外后缀。下一步：将模型构建插件接入创建器交互及批量 JSON，生成时自动选择并配置，继续保留官方模板与无覆盖边界。

## 2026-10-28 创建器模型保护与 KEY 脚本

- 创建器 CLI 新增 --model-protection embedded/external/none，Three 默认 embedded，可关闭，非 Three 不允许启用，工作区根拒绝统一设置。完整非交互参数不多问；交互增加大屏/引擎/模型保护，确认摘要含选择。严格 JSON 每应用 modelProtection，同步 dry-run 模式/文件/脚本/执行时生成标记，不生成或回显 KEY；UI Smoke 阶段不重复传保护参数。
- 新增 model-protection 集成层：官方模板与 UI/大屏/Three 后复用安全安装器，自动创建 src/models 空目录、MODEL_GUIDE 和项目专属 .env.local。预检 env、模型脚本、目录/链接及 Vite 配置形态；补装仍先验证 Three 兼容版本，再验证模型输出占用，均在 UI/配置写入前完成。none 不创建模型插件/env/独立模型页/KEY 脚本；既有引擎基础源码保留。
- 按用户新增要求，在生成项目 package.json 提供 models:keygen 与 models:keyrotate。project-key.mjs 复制为 adui-model-build/keygen.mjs：缺失时生成 256 位 KEY，已有 KEY 不覆盖；rotate 先 wx 备份，再更新 KEY/标识，保留其他 env 配置（含多行值与注释）。不回显密钥值，拒绝链接和读取期间变化。IV 仍按每个 GCM 模型独立随机生成写入文件头，不复用全局 env IV。
- 安装器增量合并 package 脚本与 Git 忽略规则，Vite/package/已有 .gitignore 分别保留 .before-adui-models 原件，脚本冲突拒绝。新增 .env.local* 覆盖轮换备份，*.key.json 覆盖独立解锁文件；不覆盖已有其他脚本、正式首页、App/main 或旧快照。失败保留现场，不宣称事务回滚或抵御恶意并发文件系统替换。
- 完整执行 examples/models.batch.json，生成 D:/Workspace/adui-studio/adui-models-create-demo：官方根及五个应用，四个启用保护成员覆盖 Vue TS / React JS 默认 embedded、Vue JS / React TS external，plain 显式 none。六个生成阶段成功，四份初始 KEY 各不相同；关闭成员确实无模型插件/env/模型页/KEY 脚本，官方 website/utils 保留。
- 新工作区 ready 首次 12/12 全部执行成功，269 格式文件、187 lint/type 文件无警告错误，utils 一项测试通过。实际调用 vue-auto 的 models:keygen 时按预期拒绝覆盖；models:keyrotate 成功，Git check-ignore 确认 .env.local 与备份被忽略。react-auto 将本轮自建 env 重命名为受忽略测试备份后，models:keygen 实际创建新 KEY。轮换后 ready 再次 12/12 成功（7 缓存），Vite+ 明确因 .env.local 变化使构建缓存失效，新密文可用当前 KEY 解密；官方 TypeScript 7 API 实验性提醒保留。
- 四组合完成 index + model-smoke 专项构建，临时配置移除，产物在各成员忽略的 dist/models-verify。专项启用 sourcemap 做泄漏检查，正式默认配置未改；引擎约 577 kB 默认 500 kB 提醒保留。四份产物各有一个 .adui，无原 GLB、完整明文/Base64 副本或原始 KEY 二进制/Base64/hex 字面量；用各自当前 KEY 解密后的 SHA-256 均与原 DamagedHelmet 的 a1e3b04de97b11de564ce6e53b95f02954a297f0008183ac63a4f5974f6b32d8 一致，四个 IV 不同，原件未修改。
- Chrome 新创建器生成的 Vue TS 与 React JS 生产页面均自动加载完整头盔，model=ready/modelMeshes=1，最终控制台 warn/error 为空；已保存 Vue 截图。真实 Windows PTY 预填名称/框架/语言/UI/CSS 后，交互选择 Application/大屏/Three/默认 embedded，再选 N 取消，进程成功结束且目标目录不存在。
- 最终 138/138 Node 测试、文档检查、根 vp check（101 格式文件、70 代码文件无 lint 警告错误）及真实 verify-model-build 回归通过。新增测试覆盖模式/错误类型/交互确认/批量隔离/dry-run无密钥、独立 KEY 与原件保护、脚本生成/备份轮换/多行 env 保留/链接拒绝。未改仓库依赖或锁文件，不增加流水线，不发布。按中文 emoji 分步提交推送。下一步：完善模型查看器的加载进度、旋转缩放与视角复位，继续保持模型保护和渲染边界分离。

## 2026-10-28 生成器主线核对与文件保护补验

- 用户指出模型查看器体验与项目主线的关系，已修正上一节下一步建议：本项目是 Vite+ 项目生成器，验收页用于证明集成，当前不开发旋转缩放、视角复位。新增 GENERATOR_STATUS，逐项核对需求、已实现能力和未覆盖范围，清理架构文档中的旧计划表述。
- safe-paths 统一检查目标与全部祖先，拒绝符号链接/junction 和悬空目标；CLI、UI/CSS、UI Smoke、大屏和 Three 复用。安装前后复查入口、Vite 配置和新输出，拒绝安装期间的文件冲突、用户改动及目录链接替换，保留现场，不承诺事务回滚或恶意并发替换下的原子性。
- UI/CSS 格式化改为只处理本次输出、修改配置与 package.json。真实 React TS 补装前创建带非标准空白的独立文档，补装后逐字节一致；之后只移除本轮创建的验收文档，再执行项目检查。
- 新增 verify-generator-matrix，只读验证 210 个有效计划：60 UI Smoke、168 大屏、126 Three、84 模型保护；核对官方模板、框架依赖隔离、语言、原配置/入口字段保留、输出路径及无密钥计划。此命令实际创建/构建数量为 0，不称全部 210 组合构建或渲染通过。
- 仓库外通过官方入口新建 audit-element-vue-js（Vue JS / Element Plus / Tailwind）、audit-antd-vue-ts（Vue TS / Ant Design Vue / UnoCSS）、audit-tdesign-react-js（React JS / TDesign / UnoCSS）和 audit-preserve-react-ts（React TS，之后 --apply-existing 补 Ant Design / Tailwind）。四个项目最终 vp check 与 vp run build 全部通过，分别为 13/5、16/6、11/4、14/3 格式/代码文件，检查无警告或错误；本轮只验证配置、依赖与正式首页构建，未声称这些 UI 的浏览器组件渲染通过。
- Ant Design Vue 4.2.6 首次安装因 pnpm 12.15.0 拒绝 core-js 3.51.0 未审查 postinstall 而停止，源码/配置未写入。核对脚本仅为支持信息后，新增精确 allowBuilds/core-js: false 增量规则；保留 catalog、其他规则和已有明确用户选择，复杂配置拒绝自动合并。失败样例通过 --apply-existing 成功重试，不执行该脚本、不放开全局脚本权限。Monorepo 根策略的定向修改和不写成员策略文件有受控测试。
- 本轮真实 verify-model-build 使用原 DamagedHelmet.glb 回归，两模式 build/decrypt、明文/密钥 HTTP 403、密文 200、模型变更加密及 env 轮换均通过，未修改用户模型或业务工程。
- 最终 145/145 Node 测试、210 组合计划、文档校验、根 vp check（108 格式文件、76 代码文件，无警告错误）及 git diff --check 通过。仓库依赖版本/锁文件未修改，未增加流水线或发布；按中文 emoji 分步提交并推送。
- 下一步：接入 FR-006 Cesium 生成预设，先完成逐应用依赖/资源路径/配置与最小场景，再验收 Vue、React 和工作区构建；之后推进 Babylon 和多引擎选择。仍保留官方基础模板，不把查看器体验作为下一阶段主线。

## 2026-10-28 Cesium 逐应用生成预设

- CLI --engine cesium、交互菜单及批量 JSON 已接入，engine.mjs 统一 Three/Cesium 的计划输出；新建要求 screen，已有当前框架/语言大屏应用支持 --apply-existing。Vue/React × TS/JS 仍由官方 vite:application 创建，工作区仍由 vite:monorepo 创建；默认不选引擎，不改正式首页/App/main。
- 新增 packages/cesium 框架无关 lazy、场景、验收 DOM 入口及静态资源插件源码。依赖固定 cesium 1.146.0、vite-plugin-static-copy 4.1.1；最小蓝色椭球/黄色点使用本地椭球地形，关闭在线影像和地形，不需 Token。组件只管理挂载/卸载，放入 AdScreen 原生像素引擎层；点击前不导入引擎，晚到导入不创建已卸载 Viewer，失败可重试，卸载释放 Viewer 和实例 ResizeObserver。
- Cesium 暂不接入模型或 .adui，默认无模型保护/KEY 脚本，embedded/external 明确拒绝；Three 默认 embedded 及原有模型流程不变。暂不实现 Babylon、多引擎多选、Cesium 全屏/DPR 专项或业务查看器体验。
- 安装前后检查输出/祖先路径及配置快照，Vite 原配置 wx 备份后增量插入插件；保留 server/base/官方首页入口，定向格式化，重复/链接/版本冲突拒绝。官方 Monorepo 会将依赖写为 catalog:，已修复为按本应用解析的已安装元数据核对，不执行包入口；旧版直接比较字符串曾导致首个混合工作区中止，修复后补装保留现场，未跳过检查。
- 专项构建发现 static-copy 4 保留 node_modules 目录层级，尽管构建返回成功，Workers 目录仍落点错误。已按 Cesium 资源根显式重建映射，资源冲突报错；新增 verify-cesium-build 真实双入口/四类目录/base 检查。运行时设置 BASE_URL 对应的 CESIUM_BASE_URL 后才动态导入场景与 CSS，不引入 CDN。
- 独立官方样例 adui-cesium-vue-ts 与 adui-cesium-react-js，最终 check 分别 39/24、34/22 格式/代码文件无警告错误，正式首页构建通过。两者 index + cesium-smoke 双入口构建分别验证 /cesium-check/ 和 ./，四类资源目录完整，产物保留在 dist/cesium-verify。场景分块约 4.17 MB / gzip 1.12 MB，保留默认 500 kB 提醒；首页未引用引擎时仍复制资源，不宣称资源已按引用裁剪。
- 首个官方工作区 adui-cesium-workspace 包含 Vue JS globe-vue、React TS globe-react 和官方 website/utils；root ready 最终 8/8 成功，88 格式/52 lint/type 文件无警告错误，utils 一项测试通过；官方 TypeScript 7 API 实验性提示保留。两成员另完成双入口专项构建，随后 root ready 默认构建会清空成员 dist，不将其称为持续保留的专项产物。一次将专项临时配置与 root check 并行导致格式失败，已在专项完成删除临时配置后顺序重跑通过，文档明确不能并行。
- 再以最终生成器从头批量创建独立 adui-cesium-batch-final（示例仅改工作区名称），工作区+两应用三个阶段全部成功；新根 ready 0/8 缓存、8/8 成功，同为 88/52 文件和官方 utils 一项测试。证明完整批量流程已通过，不只依赖首个工作区的手工补装。
- Chrome Vue 子路径生产页、React 相对 base 生产页均点击前 canvas=0，点击后 ready=true 并显示椭球/点；Vue 网络捕获确认场景分块点击后请求，Workers/Assets 走 /cesium-check/adui-cesium/，控制台 warn/error 为空。两框架卸载 canvas=0，重挂回到等待加载；React 重挂再加载成功，浏览器尺寸变化后画布尺寸更新，未称完整 DPR/全屏验收。React 截图保存 D:/Workspace/adui-studio/cesium-react-acceptance.jpg，未纳入 Git。
- 开发服务另验证 HTML、Worker JS、Assets JSON、Widgets CSS 均 HTTP 200 且 MIME 正确；未声称开发浏览器渲染已实测。浏览器后续连接不可用，已有生产渲染证据保留；临时 viewport 已恢复，本轮三个预览/开发服务已停止。
- 最终 153/153 Node 测试、252 个组合计划（新增 42 Cesium，实际构建数仍标 0）、文档校验、根 vp check（123 格式文件、88 代码文件，无警告错误）与 git diff --check 通过。未改仓库依赖版本或锁文件，未新增流水线或发布。按中文 emoji 分功能和验收文档提交并推送。
- 下一步：接入 Babylon 逐应用生成预设，沿用官方模板、按需加载、原配置保护和 Vue/React/Monorepo 本地验收；之后再设计多引擎选择及各引擎模型适配。

## 2026-10-28 Babylon 逐应用生成预设

- CLI --engine babylon、交互菜单及批量 JSON 已接入，engine.mjs 输出独立依赖/文件/页面计划。保持官方 vite:application 的 Vue/React × TS/JS、vite:monorepo 根及逐应用集成；新建要求 screen，已有匹配的大屏应用可 --apply-existing，默认不选引擎。
- 新增 packages/babylon：固定 @babylonjs/core 9.32.1，ES 深路径模块构建本地立方体、相机和光照；无 CDN、在线纹理、额外静态资源插件。只增加源码快照与 /babylon-smoke.html，正式首页、App/main 及 Vite 配置不修改。组件放入 AdScreen 原生像素引擎层，不扩展业务查看器操作。
- lazy 点击后才导入场景，重复加载共用请求，卸载期间导入完成不创建场景；失败允许重试。runtime 管理 Engine/Scene/循环，初始化和渲染异常停止循环并释放已返回对象，lazy 清除画布，卸载断开 ResizeObserver；尺寸变化调用 resize。受控测试覆盖晚到、重试、帧异常、同步初始化错误不误报 ready、幂等销毁；不宣称 GPU 堆测量或清空所有模块缓存。
- 安装前后检查入口/大屏/输出及祖先链接，重复和安装期间文件冲突拒绝，不覆盖现场；固定版本与 catalog 实际安装元数据核对，拒绝缺失元数据或未知版本，不执行依赖入口。不改 Vite 配置所以无需配置备份，格式化只涉及新增文件与 package.json。
- Babylon 首期不接模型加载/保护，不生成 KEY 脚本，显式 embedded/external 拒绝；Three 原默认 embedded 保留。模型适配、多引擎多选及 Babylon DPR/全屏专项仍未实现，不将最小场景称为这些需求已完成。
- 仓库外通过官方入口创建独立 adui-babylon-vue-ts、adui-babylon-react-js；check 分别 38/23、33/21 格式/代码文件，无警告错误，正式首页构建通过。React 一次构建输出插件计时提示，未关闭；依赖下载遇到网络延迟后完成，未更换镜像或全局安装策略。
- 完整执行 examples/babylon.batch.json，创建 adui-babylon-workspace、Vue JS cube-vue、React TS cube-react，三个生成阶段全部成功，官方 website/utils 保留。root ready 0/8 缓存、8/8 成功，86 格式/50 lint/type 文件无警告错误，utils 一项测试通过；保留官方 TypeScript 7 API 实验性提示。
- 四应用均完成 index + babylon-smoke 双入口专项构建，Vue 验证 /babylon-check/，React 验证 ./，产物保留各应用 dist/babylon-verify，临时配置删除；专项在根检查完成后单独执行，未与同一工作区检查并行。场景主分块约 879–910 kB/gzip 205–214 kB，另有按需着色器/内部功能分块，保留默认 500 kB 提醒，不称整个引擎仅此体积。
- Chrome React 相对路径生产页与 Vue 子路径生产页均显示真实蓝色立方体，初始 canvas=0，点击后 ready=true，控制台 warn/error 为空。React 网络捕获显示场景及默认材质着色器只在点击后请求，并走本地 assets；两框架卸载后 canvas=0，重挂回到等待加载，再点击均恢复 ready。只读核对两框架画布缓冲与显示尺寸一致，不扩大为完整 DPR/窗口/全屏验收。
- React 重挂成功截图保存 D:/Workspace/adui-studio/babylon-react-acceptance.jpg，未纳入 Git；本轮两个临时浏览器标签页已关闭、两个生产预览服务已停止。未修改业务工程、模型或生产密钥。
- 最终 161/161 Node 测试、294 个只读组合计划（新增 42 Babylon，实际构建数仍标 0）、文档检查、根 vp check（136 格式文件、98 代码文件，无警告错误）与 git diff --check 通过。仓库依赖和锁文件未改，无流水线或发布；按中文 emoji 分功能与验收文档提交并推送。
- 下一步：设计按应用多引擎选项，兼容现有单引擎 --engine 与 JSON engine，校验依赖/文件/配置组合与应用隔离，再分别推进各引擎模型适配，继续以生成器能力为主线。

## 2026-10-29 CLI/JSON 多引擎编排

- 新增 --engines 逗号列表与应用 engines 数组，和旧 engine 互斥；非空、不重复、仅 three/cesium/babylon，规范排序。旧单选与交互单选保持兼容，交互多选尚未接入。详细命令、批量样例和限制见 [MULTI_ENGINE](MULTI_ENGINE.md)。
- multi-engine 复用单引擎子阶段：基础官方工程/UI/CSS/大屏只在第一阶段执行，后续首次补装；各引擎目录/验收页独立，不创建同页混合运行时。包含 Three 默认 embedded，仅传入 Three 阶段；其余引擎保持 none。计划合并依赖/文件/地址，dry-run 展示模型保护生成标记但不生成 KEY。
- 现有应用统一预检所有引擎的文件、版本和模型保护输出，后续冲突在首阶段写入前拒绝；失败即停并保留现场，不自动回滚、覆盖或跳过续跑。补齐 Three 对官方 catalog 已安装版本的核对，不执行依赖入口。
- 新增五项受控测试：28 个多选输入变体覆盖七种非空子集及四框架语言，幂等规范化/无文件冲突、非法/混用拒绝、后续输出冲突零子阶段执行、失败停止、JSON 应用隔离和 Three catalog。原 294 单引擎计划矩阵仍为单独范围，不混称全部真实创建。
- 实际通过官方入口创建独立 adui-multi-vue-ts（三引擎 + 默认 Three embedded），check 80 格式/58 代码文件通过，首页构建通过；未复制业务 KEY 或模型。官方工具选用的 Node/pnpm 版本来自其当前运行环境，仓库依赖与锁文件未升级。
- 已有官方 adui-babylon-workspace 新增 React JS multi-react（三引擎 + none），旧成员保留；根 ready 0/9 缓存、9/9 成功，148 格式/98 lint/type 文件无错误警告，utils 一项测试通过。保留 TypeScript API 实验性与构建插件计时提示。
- 两应用通过 verify-multi-build 联合构建：Vue 为 index/three/cesium/babylon/model 五入口，React 为四入口；Cesium 四类资源目录完整，临时配置移除，产物保留各自 dist/multi-verify，部署 base=/multi-check/。保留默认 500 kB 提醒。未执行本轮组合产物浏览器渲染，不用历史单引擎截图替代；新 JSON 组合有计划验证，未从头执行整个批量样例。
- 最终 166/166 Node 测试、文档校验、根 vp check（141 格式文件/101 代码文件）与 git diff --check 通过。未添加流水线或发布。中文 emoji 分功能与验收文档提交推送。
- 下一步：接入交互多选，并对组合产物做浏览器隔离/按需加载验收；之后推进 Cesium/Babylon 模型适配。

## 2026-10-29 交互多选与联合产物浏览器验收

- 交互菜单支持数字/名称逗号多选，单选继续返回 engine，多选返回规范 engines；None 混用、别名重复和未知值拒绝，包含 Three 才询问保护。确认摘要列出全部引擎；确认后 CLI 分派同一多引擎编排器。显式参数完整时仍不额外询问。
- 新增两项测试覆盖默认、单选、多选顺序、非法值、摘要、Three 提示与取消。Windows 真 PTY 输入 4,2,3、关闭保护、N 取消，摘要 three,cesium,babylon 正确，目标 interactive-multi-cancel 不存在；未通过真实创建验证这次 TTY 的 Y 分支。
- 实测上轮两份联合产物发现 Babylon 点击会牵连 Cesium 分块：共享辅助模块归属和分块捕获使默认自动分块不能保证引擎隔离。专项工具改用按库显式分组、includeDependenciesRecursively=false、strictExecutionOrder=true；增加 HTML 初始静态依赖递归检查，禁止首屏静态依赖引擎分块。普通生成配置不自动改写，业务自定义联合入口需采用同样策略。分组增加包装与单块体积，不宣称体积优化。
- 两应用重新联合构建通过，Vue index/three/cesium/babylon/model 五入口，React 四入口，Cesium 四类资源保留，临时配置移除。保留默认体积提醒；产物仍在 dist/multi-verify，本轮未重新安装依赖或修改仓库锁文件。
- Chrome 对 Vue TS、React JS 各三种引擎页面检查：初始 canvas=0，点击后初始化成功且只请求本引擎命名分块，控制台 warn/error 为空，卸载 canvas=0。Vue Babylon 点击前网络无引擎分块、点击后仅 Babylon 分块；静态图检查补充覆盖所有入口。React Three 在加载中卸载后重挂再次加载成功，截图可见实际线框场景；不扩大为模型加载、全屏/DPR 专项或同页多引擎运行验收。
- 截图 D:/Workspace/adui-studio/multi-engine-react-acceptance.jpg 未纳入 Git。临时标签页和 4301/4302 预览服务已关闭。没有修改业务文件、模型或生产 KEY。
- 最终 168/168 Node 测试、文档校验、vp check（142 格式文件/102 代码文件无警告错误）和 diff 检查通过。按中文 emoji 分步提交推送，无流水线或发布。
- 下一步：接入 Babylon GLB 与 .adui 模型适配，复用共享解密和取消/晚到边界，再推进 Cesium 模型适配；继续围绕生成器预设开发。

## 2026-10-29 Babylon GLB/.adui 模型适配

- Babylon 生成预设新增同版 @babylonjs/loaders 9.32.1，仍只增强官方应用并保留 App/main/正式首页及 Vite 配置。生成器按应用核对 core/loaders 的固定版本及 catalog 已安装元数据；不更新未知依赖，不覆盖旧源码快照。
- GLB 纯校验移入 model-security/src/glb.mjs，Three 保留原导出，Three 生成器及自动构建源码一并复制。Babylon 先授权/认证和校验，再动态导入官方 glTF loader，以内存 Uint8Array 加载 AssetContainer；32 MiB、自包含资源及扩展限制保持明确，不请求远端解码器。
- 模型控制器处理替换失败保留旧资产、成功释放旧资产、取消与卸载丢弃/释放晚到容器。加载器获得独立字节副本，临时解密缓冲最终清零，不声称清除加载器或 GPU 全部副本。scene 只做包围边界、归一化及占位网格显隐，没有增加旋转缩放、视角复位等查看器工具。
- 验收入口支持本地 .glb/.adui、独立验收密钥及清除授权；文件不上传，provider 有效期 10 分钟。清除授权清除模型，异步文件读取/密钥导入状态按请求代次隔离。Babylon 仍拒绝 embedded/external，不生成 KEY 脚本；本轮没有完成 Babylon env 自动构建保护。
- 对已有官方 audit-element-vue-js（Vue JS）与 audit-preserve-react-ts（React TS）补装大屏/Babylon；最终 vp check 分别 43/30、44/28 格式/代码文件无警告错误，正式首页构建通过。只更新本轮新建 Babylon 快照，不修改原业务/首页文件。
- 在官方 adui-babylon-workspace 新增 model-vue（Vue TS）与 model-react（React JS），保留原成员。根 ready 首次 0/12 缓存、12/12 成功；最终复验 9/12 缓存、12/12 成功，229 格式、156 lint/type 文件无警告错误，官方 utils 测试通过，保留 TypeScript API 实验性提示。
- 四应用均通过 index + babylon-smoke 双入口专项构建：Vue 子路径 /babylon-check/、React 相对 ./，产物保留各 dist/babylon-verify，临时配置清除；未与同一工作区检查并行。场景主块约 417–447 kB、loader 主块约 745–748 kB，另有共享/着色器块，保留默认 500 kB 提醒，不称为引擎总大小。
- Chrome Vue JS/React TS 生产页均加载原 DamagedHelmet.glb 与已有 .adui：Vue 无密钥拒绝、导入匹配验收密钥后成功；两框架均显示模型已加载，warn/error 为空。清除授权时模型状态 empty，卸载 canvas=0；React 重挂可再次初始化，最终构建重新加载 GLB/.adui 通过。未扩展为其他框架语言的浏览器验收或 Babylon 全屏/DPR 专项。
- 最终 React 加密模型截图 D:/Workspace/adui-studio/babylon-model-react-final.png，Vue 初次截图 D:/Workspace/adui-studio/babylon-helmet-acceptance.jpg，均不纳入 Git。原 GLB SHA256 仍为 a1e3b04de97b11de564ce6e53b95f02954a297f0008183ac63a4f5974f6b32d8；未修改用户模型或生产密钥。两个临时标签页及 4311/4312 预览服务已清理。
- Three 自动构建专项使用同一原模型回归，external/embedded 构建与解密、明文/密钥 HTTP 403、密文 200、模型变更重新加密及 env 轮换通过。最终 173/173 Node 测试、294 组合只读计划（实际构建计数仍为 0）、文档校验、根 vp check（146 格式/106 代码文件）与 diff 检查通过。仓库依赖锁文件未改，无流水线或发布，按中文 emoji 分步提交推送。
- 下一步：接入 Babylon 的 env 自动加密与构建目录加载，复用逐应用 KEY/轮换和仅输出 .adui 的产物校验；之后推进 Cesium 模型适配。继续以生成器预设为主线。

## 2026-10-29 Babylon env 自动模型打包

- Babylon 默认启用 embedded，CLI/交互/逐应用 JSON 支持 external/none；Cesium 单选仍不启用。modelEngine 统一选择模型适配器，多引擎优先 Three，否则 Babylon，只在所属阶段安装一套插件、model-smoke 页面、目录与 KEY。受控测试覆盖 Cesium+Babylon 与 Three+Babylon 的阶段参数，未把它称为本轮新组合真实创建验收。
- setupModelPlugin 复用原模型构建插件、KEY/轮换、备份、忽略和输出保护，增加 engine 参数；独立 setup CLI 可 --engine babylon，Three 保持默认。模型页模板按引擎选择导入/类型/回调，正式首页/App/main 保留。旧快照缺少 loadBundledModel 时拒绝安装，不自动覆盖引擎源码；格式化 runner 改为 await，异步检查失败不提前报告完成。
- Babylon lazy 新增同源限长密文下载，下载完成才初始化并进入认证/GLB 校验/AssetContainer；清除、卸载、后发请求及外部 AbortSignal 使旧请求失效。模型状态与错误回传验收页。共享加解密算法、随机 IV 和客户端密钥可逆向的边界不变；不引入服务端或查看器操作工具。
- 扩展只读矩阵至 378 个有效组合：108 UI Smoke、336 大屏、126 Three、42 Cesium、126 Babylon、168 模型保护计划。Babylon 的 none/embedded/external 均覆盖；该命令实际创建/构建计数仍为 0。
- 官方入口新建独立 babylon-auto-vue-ts（Vue TS / embedded）、babylon-auto-react-js（React JS / external）；分别 vp check 61/43、57/41 格式/代码文件无警告错误，正式首页构建通过。原 DamagedHelmet.glb 以新文件方式复制到本轮样例 src/models，不修改原件。新建样例生成后的模型页 CSS补充画布尺寸，仅更新本轮自产快照，不触碰旧项目。
- 在已有官方 adui-babylon-workspace 添加 auto-vue（Vue JS / external）、auto-react（React TS / embedded）。原成员保留，根 ready 0/15 缓存、15/15 成功，343 格式、240 lint/type 文件无警告错误，官方 utils 测试通过；保留 TypeScript API 实验性提示。
- 新增 verify-model-app：真实生成应用的 index + model-smoke 双入口、部署 base、密文数量、解密与原模型一致性及无原 GLB/明文/原始 KEY 字面量检查。四种框架语言均通过，Vue 使用 /model-check/，React 使用 ./，产物保留各 dist/model-verify，临时配置删除；未与工作区检查并行。保留默认 500 kB 体积提醒，未声称所有引擎/模型被压缩到阈值内。
- Chrome Vue TS embedded 生产页无需手工解锁即显示头盔并 ready，warn/error 为空。React JS external 初始 canvas=0 且加载禁用；选择本轮样例的独立解锁文件后 ready，warn/error 为空；锁定后模型状态 empty、加载按钮禁用。解锁文件位于网站目录外，仅用于本轮验收，结束移除；没有上传或读取业务生产密钥。
- 真实生成 Vue 开发服务核对 src/models/helmet.glb 与 .env.local 为 HTTP 403、model-smoke.html 与加密目录 .adui 为 200。models:keygen 拒绝覆盖已有 KEY，models:keyrotate 成功更新 KEY 并备份，Git check-ignore 确认 env 与备份均忽略；重新构建解密一致，生产浏览器刷新后自动 ready。原模型 SHA256 未变。
- 原共享 verify-model-build 也以同一原模型回归：两模式 build/decrypt、明文/KEY 403、密文 200、模型变更重新加密及 env 轮换均通过。最终 176/176 Node 测试、文档校验、根 vp check（147 格式/107 代码文件）和 diff 检查通过；仓库依赖版本/锁文件未改，不创建流水线或发布。
- 截图 D:/Workspace/adui-studio/babylon-auto-model-acceptance.png 记录 KEY 轮换后的 Vue 自动解密渲染，不纳入 Git；本轮临时浏览器标签页、4321/4322 预览及自建 4331 开发进程已清理。
- 下一步：接入 Cesium 的自包含 GLB/.adui 模型适配，先完成授权解密与实例生命周期，再接入同一套 env 自动构建；继续以生成器预设为主线。

## 2026-10-29 Cesium GLB/.adui 模型适配

- Cesium 预设新增共享 glb/adui/local-grant 源码与模型控制器、文件/授权验收入口；不增加依赖或改变官方基础模板。保留正式首页/App/main 和原有静态资源配置方式，仍为 Cesium 1.146.0/static-copy 4.1.1。旧快照不覆盖升级。
- 先快照、授权认证与自包含 GLB/扩展检查，再使用受控 Blob URL 调用公开 Model.fromGltfAsync。候选模型隐藏加入场景，使用 readyEvent/errorEvent、加载期间帧请求和 30 秒超时等待 GPU/纹理就绪，有限包围球聚焦后再替换旧模型。示例位置 116.4°E、39.9°N、高度 100 米，不将其称为业务配准能力或新增查看器操作工具。
- 创建失败、错误/超时、取消、清除及卸载均解除等待监听，移除/销毁候选并撤销 URL；晚到创建返回后立即清理，不提交失效实例。失败保留旧资产。Blob 明文副本随资产生命周期保留，临时解密缓冲最终清零，不声称清除全部引擎缓存或 GPU 副本。
- 新增六项模型测试，覆盖先校验再创建 Blob、成功替换与失败保留、创建失败重试、晚到与等待中卸载、ready/error/超时/请求帧异常监听清理、.adui 认证/篡改/晚到授权取消；原 Cesium lazy 生命周期测试保留。扩展检查同时覆盖声明和实际扩展映射，遗漏声明的 Draco 也在 Blob 前拒绝；忽略业务 extras 元数据。生成器四组合计划同时核对新模型/共享源码路径及导入重写。
- 官方入口创建独立 cesium-model-vue-ts（Vue TS）与 cesium-model-react-js（React JS），vp check 分别 45/30、40/28 格式/代码文件无警告错误，正式首页构建通过。Vue 构建保留静态复制插件耗时提示，没有关闭构建检查。首批官方模板依赖安装约 100 秒，后续完成，未更换镜像或全局权限策略。
- 在既有官方 adui-cesium-workspace 新增 models-vue（Vue JS）、models-react（React TS），保留旧成员。根 ready 首次 1/11 缓存、最终 8/11 缓存，两次均 11/11 成功，170 格式、110 lint/type 文件无警告错误，官方 utils 一项测试通过，TypeScript API 实验性提示保留。最终销毁增加 finally 保证 Viewer 清理后，仅刷新本轮四份自产场景快照并复验，没有修改旧引擎快照。
- 四应用通过 index + cesium-smoke 双入口专项构建及四类资源检查，Vue 使用 /cesium-check/、React 使用 ./；临时配置结束删除，产物保留各 dist/cesium-verify。专项未与同一工作区全局检查并行。场景主块约 4.17 MB/gzip 1.12 MB，保留默认 500 kB 提醒，不宣称引擎资源已裁剪。
- Chrome Vue TS 子路径与 React JS 相对路径生产页均加载原 DamagedHelmet.glb 并显示贴图；Vue 无密钥选择 .adui 被拒绝，导入既有独立验收密钥后成功。两框架均完成 .adui 资源就绪与实际渲染，warn/error 为空；清除授权时模型状态 empty，卸载 canvas=0，React 重挂可再次初始化。未扩大为其他框架语言的浏览器验收或 Cesium 全屏/DPR 专项。
- Vue 加密头盔截图保存 D:/Workspace/adui-studio/cesium-helmet-acceptance.png，不纳入 Git；原 GLB SHA256 仍为 a1e3b04de97b11de564ce6e53b95f02954a297f0008183ac63a4f5974f6b32d8，没有修改用户模型、既有 .adui 或验收密钥。临时浏览器标签页与 4341/4342 预览服务已清理。
- 本轮未开放 Cesium embedded/external，也未生成 env/KEY 脚本，Three/Babylon 自动保护行为不变。最终 182/182 Node 测试、378 只读组合计划（实际创建/构建计数仍为 0）、文档校验、根 vp check（149 格式/109 代码文件）与 diff 检查通过；仓库依赖/锁文件未改，不创建流水线或发布，按中文 emoji 分步提交推送。
- 下一步：将 Cesium 模型适配接入共用 env 自动加密与构建目录加载，复用 KEY/轮换及仅输出 .adui 的产物检查，再验收多引擎下的一套模型配置。

## 2026-10-29 Cesium env 自动模型打包

- Cesium 默认启用 embedded，CLI/交互/逐应用 JSON 同步支持 external/none。复用原 env 加密插件、KEY/轮换、忽略与备份，setup CLI 可 --engine cesium；模型页面导入 createLazyGlobe/GlobeHandle。三引擎仍由官方 Application/Monorepo 入口创建，没有新增框架模板、依赖版本或流水线。
- lazy 新增同源限长目录下载与外部取消，下载后初始化再进入原认证/GLB/就绪流程；默认 loader 在导入 Cesium 前设置部署 base。清除、后发请求、卸载及外部 signal 失效旧下载和模型。none 不生成 env、模型构建插件或 KEY 脚本，旧快照缺少 loadBundledModel 时拒绝保护安装；原 Three/Babylon 行为保留。
- 模型适配器优先级固定 Three → Babylon → Cesium，多引擎只向一个阶段传递保护。两项新增测试覆盖 Cesium 插件/配置备份保留、两模式/关闭/旧快照，以及目录下载取消/初始化/卸载；已有交互、批量、多引擎阶段测试更新。只读矩阵扩展至 462 组合：132 UI Smoke、420 大屏、三引擎各 126、252 模型保护；实际创建/构建计数仍为 0。
- 官方入口新建 cesium-auto-vue-ts（Vue TS / embedded）、cesium-auto-react-js（React JS / external）。vp check 分别 61/43、57/41 格式/代码文件无警告错误，正式首页构建通过。各将原 DamagedHelmet.glb 以 wx 新文件复制到本轮 src/models，没有修改原件或旧项目快照。
- 在既有官方 adui-cesium-workspace 新增 auto-model-vue（Vue JS / external）、auto-model-react（React TS / embedded）及 mixed-models（React JS / Three+Cesium+Babylon 默认保护）。根 ready 0/15 缓存、15/15 成功，381 格式、273 lint/type 文件无警告错误，官方 utils 测试通过，保留官方 TypeScript API 实验性提示。混合应用完整创建成功，原成员保留。
- mixed-models 的 Vite 模型插件调用与 env KEY 字段分别只有一处，model-smoke 保留 Three 入口；Cesium/Babylon 源码与页面各自独立。混合应用额外完成 index/three/cesium/babylon/model 五入口联合构建，显式分组检查通过；本轮没有声称三引擎同页运行或新增混合页浏览器验收。
- 四个 Cesium 组合及混合应用均通过 verify-model-app，核对双入口/base、密文数量、解密等于原 GLB、无原模型/明文/KEY 字面量。工具新增 Cesium 四类资源检查，五应用均通过。Vue 使用 /model-check/，React 使用 ./，产物保留各 dist/model-verify；混合另有 dist/multi-verify，临时配置均删除。专项与工作区检查串行，保留默认 500 kB 提醒。
- Chrome Vue TS embedded 页面无需手工解锁即显示原头盔并 ready，warn/error 为空；React JS external 初始 canvas=0、加载禁用，选择网站目录外的临时解锁 JSON 后显示头盔并 ready，warn/error 为空；锁定后模型状态 empty、加载禁用。临时解锁文件结束移除，未使用生产密钥。
- 真实 Vue 开发服务确认原 GLB/env HTTP 403、模型页/Widgets CSS/密文 HTTP 200。models:keygen 拒绝覆盖，models:keyrotate 更新 KEY 并备份，env/备份由 Git 忽略。轮换后重新执行普通首页与专项构建，浏览器刷新自动 ready；五应用普通首页构建的 dist/models 密文均能用当前项目 KEY 解密为原 GLB。
- 共用 verify-model-build 以同一原模型回归：external/embedded build/decrypt、明文/KEY 403、密文 200、模型变更重新加密及 env 轮换均通过。最终 184/184 Node 测试、文档校验、根 vp check（149 格式/109 代码文件）和 diff 检查通过，仓库锁文件未改，不发布 npm/Release，按中文 emoji 分功能、验收工具、文档提交推送。
- KEY 轮换后 Vue 截图 D:/Workspace/adui-studio/cesium-auto-model-acceptance.png 不纳入 Git；原 GLB SHA256 仍为 a1e3b04de97b11de564ce6e53b95f02954a297f0008183ac63a4f5974f6b32d8。临时标签页、自建 4361/4362 预览与 4363 开发服务已清理。
- 下一步：补齐 Cesium/Babylon 在 AdScreen 中的窗口缩放、DPR 与全屏专项验收，继续完善生成器跨组合覆盖，不扩展业务查看器工具。

## 2026-10-29：Cesium/Babylon 大屏适配与部分实机验收

- 两引擎统一最高 2 倍 DPR / 最长边 8192 绘图策略；增加容器、窗口、全屏、DPR 变化监听与无事件 DPR 逐帧兜底，卸载清理。独立验收页新增四模式、半宽、原生全屏控件，正式 App/main 保留。
- 新官方独立样例 screen-engines-vue-ts（Vue TS）：vp check 75 文件格式、58 文件无警告/类型错误，官方 build 及 index/cesium/babylon 联合构建通过。
- 新官方 Monorepo 子应用 adui-cesium-workspace/apps/screen-engines-react-js（React JS）：vp check 68 文件格式、56 文件无警告/类型错误，官方 build 及 index/cesium/babylon 联合构建通过；最初 4 处 unbound-method 警告已用闭包修复并复验。
- Vue Babylon 浏览器确认半宽和 contain/cover/stretch/none；CSS 1250×703 不变时 DPR 1→2→3，对应缓冲区 1250×703→2500×1406→2500×1406，engine 无 transform。发现 Chrome 仿真不发 DPR 事件后补了逐帧兜底并验证。
- 限制：全屏请求 TypeError: not granted；前台操作被电脑工具因无法确认页面地址终止。本轮新 Cesium/React 交互及全屏尚未实测，不能称该专项全部验收完成。
- 下一步优先完成 Vue/React 两引擎原生全屏、Cesium DPR 和卸载/重挂的浏览器补验，然后再推进其余兼容矩阵。

本轮最终本地检查：node --test 189/189；文档静态校验通过；根 vp check 格式 155 文件、lint 115 文件通过。只读生成矩阵 462 个计划（actualBuilds=0，不等同于真实构建）；上述两套新样例单独执行真实构建。Monorepo 根 vp run ready 16/16 成功，随后 vp check 格式 449 文件、lint/类型 329 文件通过。临时预览服务已关闭。

## 2026-10-29：大屏遗留浏览器验收收尾，转回 UI 生成主线

- 复用 screen-engines-vue-ts（Vue TS 独立）与 adui-cesium-workspace/apps/screen-engines-react-js（React JS Monorepo），没有创建新应用或修改源码、依赖、密钥。React 的 index/cesium/babylon 联合构建重新通过，默认体积警告保留。
- Cesium 两框架确认 DPR 1→2→3 的 CSS 尺寸保持 1250×703，缓冲区从 1250×703 增为 2500×1406，DPR 3 保持 2 倍上限。半宽 625×352、cover/stretch 625×811 的引擎缓冲区随之更新；none 的 HUD 单位变换，engine transform=none。React Babylon 补验相同全宽 DPR 数据与半宽更新；Vue Babylon 沿用前轮已验证数据。
- 四个页面均实际点击进入/退出原生全屏；通过 :fullscreen 选择器确认 ad-screen，内部 4 个非缩放覆盖层按钮仍可用，退出后匹配为空并恢复容器尺寸。先清除仿真并将标签页置前台解决上轮后台请求拒绝，未禁用浏览器安全限制。
- 四页面卸载后 canvas=0，重挂后等待点击、重新加载进入 ready；四页 warn/error 为空。不称为 GPU 堆完全回收测量或全部跨显示器环境通过。
- 全屏证据位于 D:/Workspace/adui-studio/screen-cesium-vue-fullscreen-20261029.png、screen-cesium-react-fullscreen-20261029.png、screen-babylon-vue-fullscreen-20261029.png、screen-babylon-react-fullscreen-20261029.png，均不纳入 Git。临时仿真已清除，两个验收标签页已关闭。
- 本轮只收尾既有验收，不扩展模型查看器功能。下一步实现 Element Plus、Ant Design Vue、React TDesign 的 UI Smoke 生成及真实组件渲染，然后回到生成失败恢复与 Monorepo 管理。大屏专项不再作为阻塞 UI 主线的未完成项。

本轮本地复验：node --test 189/189、文档静态校验通过、根 vp check 格式 155 文件及 lint 115 文件通过。复用样例未改源码，未重复创建应用或安装依赖；本轮自建 4372/4373 预览服务均已停止。

## 2026-10-29：UI 生成主线——补齐三个组件库的验收入口

- --ui-smoke 扩展到 Vue Element Plus/Ant Design Vue/TDesign 和 React Ant Design/TDesign，TS/JS、三种 CSS；对应依赖及 Vue resolver 预检共用预设表。CLI/JSON 批量沿用逐应用入口，没有修改大屏、3D 或模型功能。
- 复用官方 audit-element-vue-js（Element Plus/Tailwind）、audit-antd-vue-ts（Ant Design Vue/UnoCSS）、audit-tdesign-react-js（TDesign/UnoCSS）补装独立页。App/main/配置/package.json/锁文件共 15 项 SHA256 一致，不重装依赖。
- 官方 vite:application 在既有 adui-cesium-workspace 新建 ui-tdesign-react-ts（React TS/TDesign/UnoCSS），再生成独立页；完整 tsc -b + build、双入口构建及 vp check 通过，检查为 15 格式/6 代码文件。三个已有样例检查分别 46/32、19/9、14/6 文件无警告/错误。
- verify-ui-build 新增本地双入口工具，专用 wx 临时配置、dist/ui-verify 产物；四套样例保留正式首页并构建验收页。Vue 使用 /ui-check/，React JS 使用 ./，React TS 工作区使用 /ui-check/。UnoCSS 多入口重复虚拟 CSS 提示保留，不修改正式样式入口来消除提示。
- Chrome 四页具备 el-button / ant-btn / t-button 真实样式，点击 0→1；UnoCSS 绿色背景 rgb(209,250,229)、深绿色文字及 16px 内边距，Tailwind 对应 oklch 色值与 16px 内边距正常。四页 warn/error 为空。截图 ui-element-plus-acceptance.png、ui-ant-vue-acceptance.png、ui-tdesign-react-acceptance.png、ui-tdesign-workspace-ts-acceptance.png 在 D:/Workspace/adui-studio，不纳入 Git。
- 本轮 Node 测试 193/193、文档校验及根 vp check（156 格式、116 代码文件）通过。30 个基础 UI 页面计划覆盖五种 UI × 两种语言 × 三种 CSS；只读矩阵 UI Smoke 从 132 增至 330，总计划 462，actualBuilds=0，不能替代真实构建计数。下一步进入生成失败后的明确恢复流程与 Monorepo 管理，不扩展演示功能。

## 2026-10-29：生成失败后的阶段报告与人工指引

- 本轮仅推进生成器可靠性，不修改 UI、大屏、引擎或模型预设。CLI 为官方模板、工作区准备/整理、UI/CSS、预设与验收页动作增加阶段上下文；失败输出目标、已完成阶段和现场检查说明。官方子进程非零退出码保留，信号失败按非零处理。
- 批量仍重新规划预检、失败即停；error.recovery.pending 与终端输出增加尚未执行步骤的独立 argv、cwd、PowerShell 命令。失败阶段可能部分完成，不生成盲目重试命令；待执行验收页仍要求相关应用先恢复完整。所有命令均人工确认现场后运行，不自动执行或写状态文件。
- 受控测试覆盖错误原因/退出码传递、失败动作只执行一次、PowerShell 引号与元字符、根生成/后预检/后续应用失败边界。真实 CLI 在临时 Vite+ 应用缺少 UI 依赖时退出 1，打印 UI 验收页阶段和目标，保留原文件且无新增验收文件；未破坏实际项目来制造失败。
- 后续主线：已有 Monorepo 的只读状态检查与恢复前预检。尚未实现自动断点续跑、自定义布局或覆盖式恢复，不把人工指引称为自动恢复完成。

本轮验证：node --test 196/196、文档静态校验通过、根 vp check 格式 158 文件及 lint 118 文件通过。测试使用可控执行器及真实 CLI 临时目录，未执行网络安装、破坏性失败演练或业务工程修改。预设源码与生成产物未变化，本轮不新增组件/引擎浏览器验收声明。

## 2026-10-29：已有 Monorepo 的只读检查与恢复前预检

- 新增 --inspect-workspace <路径>，可配 --config <原批量 JSON>；不混用创建/补装/dry-run。检查官方根、成员清单与重复包名；可对照预期应用的框架/语言入口、配置数量、UI/CSS/引擎依赖声明及选择的预设文件。输出只读 JSON，缺失/阻塞退出 1，未发现问题退出 0。
- 状态 not-created / blocked / present 明确区分缺失、阻塞和结构存在。不会执行配置、安装、格式化、写入状态或恢复文件；不读取 env 内容，不输出清单脚本。present 不能称为构建成功或可无条件续跑；旧快照与新计划差异需人工核对。
- 真实 CLI 对既有 adui-cesium-workspace 检查出 11 个成员；使用临时预期 JSON 检查 ui-tdesign-react-ts（React TS/TDesign/UnoCSS/UI Smoke），退出 0、应用 present、无结构问题。检查前后根清单/YAML/锁/Vite 配置与应用清单/入口/配置共 33 项 SHA256 一致。临时 JSON 在工作区外创建并已移除。
- 受控测试覆盖只读清单、未执行配置及秘密不输出、预设缺失与新增预设后状态变化、未创建应用、重复包名/损坏清单、语言/配置冲突、junction/遍历、CLI JSON/退出码及禁止写入参数。Node 测试 200/200，根 vp check 格式 160 文件、lint 120 文件通过，文档校验通过。
- 下一步：在此只读预检基础上生成逐应用恢复操作计划，明确哪些步骤需要人工处理、哪些仅允许新建；继续保持原有拒绝覆盖策略，不直接实现自动续跑或自定义工作区布局。

## 2026-10-29：只读逐应用恢复操作计划

- 新增 --plan-recovery <已有根> --config <原 JSON>，只读返回 manual-plan；不混用创建或写入模式。缺失且预检通过的应用为 create-missing，已有结构完整应用为 validate-existing，部分完成/冲突为 manual-review。存在根或成员清单问题时全局阻塞；局部预设缺失只阻塞对应应用。
- 缺失应用再次检查目录、作用域包名、peer 和声明合并条件后生成条件新建 argv；UI Smoke 步骤要求前一步完成并重新检查冲突。已有应用只建议 vp check 与 vp run build，不生成 --apply-existing 或覆盖命令。计划完全不执行；ok=true 不表示已恢复或构建通过。
- 原 batch 的应用 argv 构造抽入共用 application-invocations，保持参数与官方入口不变。恢复计划仅读取原配置一次，使用同一份校验数据进行检查及规划；不创建恢复状态文件或存储密钥。
- 真实 CLI 在既有 adui-cesium-workspace 上检查 ui-tdesign-react-ts，并仅规划 recovery-planned-vue（Vue TS/TDesign/UnoCSS）、recovery-planned-react（React JS/Ant Design/Tailwind）。已有应用给出两项验证步骤，两个未创建应用各给出新建和 UI 验收步骤。退出 0；33 项文件 SHA256 和应用目录清单一致，没有实际创建应用、安装或运行验证命令。临时配置已移除。
- 本轮 204/204 Node 测试通过，文档校验通过，根 vp check 格式 163 文件、lint 123 文件通过；受控用例覆盖局部/全局阻塞、作用域包冲突、参数完整转发、禁止混写与无配置、junction 及无目标写入。未修改 UI/大屏/引擎预设或新增浏览器验收声明。
- 下一步：显式执行计划中允许新建的缺失应用，每一步执行前重新预检、遇阻即停；已有和部分完成应用继续人工处理。自动覆盖式续跑与自定义布局仍不在本阶段范围。

## 2026-10-29：显式执行缺失应用新建

- 新增 --execute-recovery <已有根> --config <原 JSON>。执行时重新规划；初始存在人工阻塞零执行，固定初始缺失应用名单，按序重检后调用原 CLI/官方模板。已有应用仅跳过，不执行其检查、构建或补装。创建后核对结构，UI Smoke 额外预检依赖/配置/冲突并在写入后再核对结构。
- 提取 preflightUiSmoke 为纯预检入口，原 addUiSmoke 写入保护保持不变。执行器使用重新构造的 argv，不读取保存的计划或执行 PowerShell 文本。不删除、回滚、补写部分应用或写入恢复状态；子进程成功记录与构建验收分开。
- 208/208 Node 测试通过；受控用例覆盖新建→验收页顺序、重复执行跳过、已有应用不改、失败部分文件保留与后续停止、目录/验收页竞争冲突、子进程虚假成功但结构缺失、CLI 无配置与混合模式拒绝。根 vp check 格式 165 文件、lint 125 文件通过，文档校验通过。
- 使用既有官方 adui-cesium-workspace 真实执行：跳过 ui-tdesign-react-ts，新建 recovery-exec-vue-js（Vue JS/TDesign/UnoCSS）与 recovery-exec-react-ts（React TS/Ant Design/Tailwind），分别生成 UI 验收页。四个子进程均成功并通过结构检查；全程继续委托官方模板，没有修改模板来源。
- 同配置再次执行 completed=[]，三个应用全部 skipped。创建前后 38 项既有应用清单/入口/首页/Vite 配置 SHA256 一致。原工作区共享锁文件/catalog 按新应用安装规则更新，不将它们称为完全不变。
- 两个新应用均通过完整 build、verify-ui-build 双入口构建及 vp check；Vue 子路径 /ui-check/，React 相对 ./。检查文件数分别 15 格式/8 代码、15 格式/5 代码，无警告或类型错误；保留 UnoCSS 多入口重复虚拟 CSS 及构建性能提示。未新增浏览器渲染声明。
- 临时执行 JSON 与哈希记录位于工作区外，验证结束后清理。下一步进入 V1 收尾：统一 CLI 帮助、示例配置与端到端验收清单，核对功能状态及未覆盖范围；不继续扩展演示功能或自动发布。

## 2026-10-29：V1 帮助、示例与验收入口收尾

- 本轮不新增预设/恢复模式/演示功能。CLI 帮助补上三个已有工作区入口的可复制示例及五种 UI Smoke 范围；README 修正“规划功能”和服务端授权旧说明，并加入检查/计划/显式执行导航。需求正文与状态表同步已有五种 UI、三引擎和恢复能力，保留历史实测记录。
- 新增 examples/README.md、ui-libraries.batch.json、docs/V1_ACCEPTANCE.md；清单明确仓库检查→真实创建→完整类型/构建→专项独立页→浏览器→恢复与文件保护的分层验证，并列出平台、组合、模型格式和覆盖式恢复的未实现范围。不把 V1 候选清单称为发布完成。
- 新增 verify-examples，真实 CLI dry-run 验证 8 个示例、20 个应用计划，临时目录没有输出，actualBuilds=0；加入 Node 测试。文档校验扩大至 docs 全部 Markdown 和示例索引，现有链接检查通过。新三应用 UI 示例未在本轮整体创建，相关组合的历史独立代表验收不能替代该工作区的端到端证据。
- 本轮 209/209 Node 测试、示例校验、文档校验与根 vp check 通过。没有安装/升级依赖、生成业务工程或重新声明全部浏览器验收完成。
- 下一步按集中清单对新三应用 UI 示例做一次完整端到端验收，确认正式创建、根 ready、类型/构建、组件渲染和文件保护；只修复实测发现的问题，不增加功能范围或发布流程。

## 2026-10-29：三应用 UI 示例完整验收及实测修复

- 实际使用 ui-libraries.batch.json 创建 D:/Workspace/adui-studio/adui-ui-libraries，官方根与 Element Plus 应用/验收页成功后，Ant Design Vue 应用在 UI/CSS 格式化阶段失败；未执行的验收页和 React 应用按既有批量保护停止。错误为 vp fmt 拒绝含 .. 的 PATH，不能称为首轮批量全阶段成功。
- 修复 integrations 对共享 pnpm-workspace.yaml 的处理：应用文件和根策略分别在自身 cwd 定向格式化，不再传 ../../ 路径，增加对应回归。保留失败现场，没有重新覆盖安装；显式完成已有文件的定向格式化、Vue 声明忽略配置整理，再按原阶段参数生成 ant-vue 验收页、td-react 应用及验收页。
- 另新建 adui-ant-vue-format-regression（同版官方根+Vue TS/Ant Design Vue/UnoCSS），直接使用修复后的生成器，根/应用/验收页三阶段一次通过，vp check 35 格式/14 代码文件无警告错误；确认修复作用于首次安装，而非依靠原现场已有策略跳过问题。
- 主工作区保留 website/utils，ready 0/9 缓存、9/9 成功，包含 utils 测试、类型及完整构建；最终 vp check 62 格式/28 代码文件无警告错误。三个应用分别通过首页+ui-smoke 双入口构建：Vue 两页 /ui-check/、React ./。保留 TypeScript 7 API 实验性、UnoCSS 重复虚拟 CSS 和性能提示。
- Chrome 三页均是 BUTTON 元素并带 el-button / ant-btn / t-button 对应类，点击 0→1；UnoCSS 背景 rgb(209,250,229)、深绿色文字、16px 内边距，Tailwind 对应 oklch 色值正确。三页控制台 warn/error 为空。本地截图 ui-libraries-element-e2e.jpg、ui-libraries-ant-vue-e2e.jpg、ui-libraries-td-react-e2e.jpg 在 D:/Workspace/adui-studio，不纳入 Git。
- 根无 UI/CSS/框架直接依赖，官方默认成员 19 个文件哈希保持。inspect 识别 5 成员和三个 present，plan 三个 validate-existing，execute completed=[]、skipped=3。重复 batch 与重复三页 UI Smoke 均安全拒绝，29 项根/应用保护文件 SHA256 一致。
- 三个临时标签页和 4391/4392/4393 服务已关闭；工作区外临时哈希与回归 JSON 已清理。验证工作区和独立构建产物保留。修正文档中 glob 被 Markdown 误识别的显示，不改功能范围。
- 下一步验证声明的 Node 22 最低版本兼容性，按 V1 剩余清单处理实测阻塞；不增加演示功能或发布流程。

本轮最终仓库检查：node --test 210/210，文档静态校验通过，vp check 格式 170 文件、lint 127 文件通过。没有修改仓库依赖声明或锁文件；实际验证工程的安装变化仅保留于仓库外的测试工作区。

## 2026-10-30：Node 22 最低版本兼容复验

- 本轮仅处理 V1 运行时兼容性，没有新增预设、查看器功能或恢复模式。发现原 >=22 声明比锁定 Vite+ 1.4.0 的范围宽，根与 create 包改为 ^22.18.0 || ^24.11.0 || >=26.0.0；README、Harness、模型工具说明、需求与设计同步。依赖版本和锁文件未升级。
- 使用 vp env install 22.18.0 安装独立托管缓存，不更改系统 Node、全局默认或项目 pin。Node 22.18.0 与系统 Node 24.18.0 分别通过 210/210 测试；Node 22 的文档检查、8 个 JSON/20 个应用预览、462 个组合计划及根 vp check 通过。计划 actualBuilds 仍为 0。
- 实际创建 D:/Workspace/adui-studio/adui-node22-acceptance：官方根、Vue TS/Ant Design Vue/UnoCSS、React JS/Ant Design/Tailwind、Vue JS/none、React TS/none 与两个 UI Smoke，共七阶段成功。官方日志及 CLI/工具进程路径确认 22.18.0，pnpm 12.16.1；保留 website/utils 结构。
- 首轮 UI 安装发现系统 pnpm.cmd 用 Node 24 的 Corepack 转发，不将其误记为全链路 Node 22。后续临时 PATH 前置官方 shim，确认 node/pnpm 来源与实际 22.18.0 路径后完成离线冻结安装，锁文件哈希一致；另显式以 Node 22 执行同一 Corepack 分发器，冻结安装也通过。已在 Harness 补充进程环境和 PATH 恢复方法。
- 验收命令首轮将 --no-cache 放在任务名后，被转发给构建器并报错；改为 vp run --no-cache ready 后 11/11 无缓存通过。包含 utils 测试、四应用完整构建、Vue/React TS 类型检查和官方默认成员构建，未改源码或检查规则来规避错误。
- Vue 使用 /ui-check/、React 使用 ./ 完成两个 UI 双入口构建，临时配置移除，产物保留 dist/ui-verify。最终工作区 vp check 69 格式/28 代码文件通过；保留 TypeScript 7 API 实验性、UnoCSS 多入口与性能提示。没有重复声明浏览器渲染通过。
- Node 22 真实 inspect 识别六成员、四应用 present；plan 全部 validate-existing；execute completed=[]、skipped=4。入口执行前后 48 项根/应用源文件哈希一致，官方 website/utils 的 19 项原文件从添加应用前到验证结束保持一致。根无框架/UI/CSS 直接依赖，未修改业务工程。
- 以用户原 DamagedHelmet 运行共享 verify-model-build，Node 22 两模式构建/解密、明文/密钥 HTTP 403、密文 HTTP 200、模型变更重加密和 env 轮换均通过。原 GLB SHA256 仍为 a1e3b04de97b11de564ce6e53b95f02954a297f0008183ac63a4f5974f6b32d8；工具临时目录与测试密钥清理，不把此项称为全部引擎/浏览器已验收。
- 临时批量 JSON、默认成员哈希记录清理；验证工作区保留。未改变系统默认运行时，未新增依赖、CI/CD 或发布操作。
- 下一步检测可用 Linux 验证环境，按同一 V1 清单补齐跨平台证据；不扩大预设或查看器功能。没有 Linux 实测前仍保留平台未覆盖声明。

## 2026-10-30：按用户要求限定 Windows 交付范围

- 用户明确“不需要 linux，Windows 就行”，本阶段只验收 Windows。上一条记录中的 Linux 后续计划取消，Linux/macOS 不列为当前验收或交付阻塞项，保留未验证声明。
- 本轮检查时 WSL 仅有 Docker Desktop 内部发行版；Docker 引擎启动未成功，未运行 Linux 容器或测试。本轮启动的 Docker 进程已退出，没有重置环境、改动 Secrets Engine 文件或安装发行版，不继续推进该方向。
- 需求、能力表、Harness 与 V1 清单同步 Windows 范围。继续在仓库外含中文及空格路径中实测官方创建、缺失应用恢复、重复执行跳过、文件保护和完整构建；此处为进行中的验收方向，不称为已通过。

## 2026-10-30：Windows 中文、空格路径与恢复实测完成

- 在 D:/Workspace/adui-studio/Windows 路径验收 20261030 下创建独立工作区 adui-windows-paths，使用初始 配置.json 与恢复 配置.json。父目录、配置路径均含中文及空格，项目/应用 name 仍保持原安全规则。官方 shim PATH 与 VP_NODE_VERSION 同时选择 22.18.0，日志及环境报告确认 Node 22.18.0、pnpm 12.16.1。
- 从独立父目录对初始配置 dry-run 三阶段且目标不存在，随后官方根、Vue TS/Ant Design Vue/UnoCSS 的 admin 与 UI Smoke 三阶段通过。没有绕过 Vite+ 官方 Application/Monorepo 入口；正式 App/main 与默认 website/utils 保留。
- 恢复配置增加 React JS/Ant Design/Tailwind 的 portal。inspect 退出 1，正确区分 admin present、portal not-created；plan 退出 0，分别 validate-existing、create-missing，工作目录和 argv 路径完整。execute 跳过 admin，只完成 portal 官方创建及 UI 验收页两个子进程，结构检查通过。
- 根 vp run --no-cache ready 8/8 无缓存成功，含官方 utils 测试/构建、website 类型/构建、Vue TS 类型及两应用完整构建。Vue /ui-check/ 与 React ./ 的双入口构建通过，最终 vp check 47 格式/20 代码文件通过；保留 TypeScript 7 API 实验性与 UnoCSS 多入口提示。本轮没有新增浏览器或引擎路径验收声明。
- 完成后 inspect 四成员、两个 present，plan 两个 validate-existing。重复 execute completed=[]、skipped=2；重复 batch 与重复两页生成均拒绝。维护及拒绝期间 33 项根/应用文件哈希一致，恢复前保存的 14 项 admin 文件和 19 项官方默认成员原文件直至验证结束未变。共享锁/catalog 按添加应用规则更新，根无框架/UI/CSS 直接依赖。
- 补充 Harness 的 PowerShell 路径变量、LiteralPath、当前目录决定批量输出等操作说明。批量文档同步五种 UI Smoke 和三引擎模型保护现状，修正新建 config 与已有工作区检查/规划/恢复模式的描述；未增加功能或修改生成器源码。
- 测试工作区、两个 JSON 和专项 dist/ui-verify 保留，临时构建配置与两份仓库外哈希记录清理。原仓库依赖版本与锁文件不变，不创建 CI/CD 或发布。
- 下一步按 Windows 范围核对 V1 最终交付清单与常用操作说明，收尾现有能力；不推进 Linux/macOS，不新增预设或业务查看器功能。

## 2026-10-30：Windows V1 本地候选交付说明收尾

- 新增 docs/WINDOWS_GUIDE.md，集中说明准备环境、单应用、UI 独立页、Monorepo、逐应用添加、检查/规划/显式恢复及模型 KEY 管理。PowerShell 路径变量和执行目录分开，独立页构建与正式首页构建分开；模型 KEY 缺失生成与备份轮换按场景选择。
- README、SDD 和代码索引纠正旧的“其他引擎未实现”“UI 仅两个组合”“3D 待完成”与全目录格式化等描述；架构同步三引擎默认保护，需求增加操作文档入口。没有为文档收尾增加预设、查看器功能或修改生成器运行逻辑。
- V1 清单按官方模板、UI/CSS、大屏/引擎、模型、工作区恢复、Windows 路径和本地检查核对已有证据。只称 Windows 本地候选范围，不称所有组合完成或 npm/Release 发布；版本仍为 0.0.0/private。历史项目的完整构建和浏览器证据保留，不重复计成本轮新验收。
- Node 22.18.0 在含中文、空格的受控临时目录对指南涉及的八类 CLI 参数做真实 dry-run，涵盖单应用、UI/CSS、模型保护、官方根、JSON 批量及已有工作区添加；输出目录为空，actualBuilds=0。README 与指南共 19 个 PowerShell 代码块通过语法解析，不将其等同于全部命令实际执行。
- 复查既有 Windows 路径验收工作区：两个应用 present，计划均为 validate-existing；重复执行 completed=[]、skipped=2，33 项根/应用文件哈希一致。临时预览目录已清理，没有新建应用、重装依赖、运行普通/专项构建或打开浏览器。
- 文档静态检查将 Windows 指南列为必要文件。最终 210/210 Node 测试、文档检查、8 个 JSON/20 个应用计划、462 组合计划和根 vp check（171 格式/127 代码文件）通过；示例与组合工具 actualBuilds 均为 0。仓库依赖声明与锁文件、已有验证工程及业务工程未改。
- Windows V1 现有范围的本地交付文档已齐备。下一步进入实际 Windows 项目试用并按反馈修复；不自动创建业务工程、增加演示功能或推进其他系统、CI/CD、部署及发布。真实项目的目标和配置由用户明确后再落地。

## 2026-10-30：用户指定 test-vue 默认 Vue TS 试用

- 用户回复试用项目名 test-vue。确认 D:/Workspace/adui-studio/test-vue 不存在后，以默认 Vue TypeScript、UI/CSS none 创建独立 Application；未自行选择组件库、大屏、引擎或模型预设。先 dry-run 确认官方 vite:application 和 vue-ts，再由原 CLI 实际创建。
- 外层系统 Node 24.18.0；官方创建使用托管 Node 26.13.0、pnpm 12.16.1 和 Vite+ 1.4.0，依赖安装成功，未切换全局默认。试用工程保留官方 App/main、Git hooks 与目录结构。
- 完整 vp run build 执行 vue-tsc -b 及 vp build，2/2 成功；vp check 15 格式/5 代码文件无警告或类型错误。官方模板没有测试文件，vp test --passWithNoTests 退出 0，不称为应用单测通过，也没有为绿色结果添加镜像测试。
- Chrome 分别在开发 4395 和生产预览 4396 验证官方首页，Count is 0 点击为 Count is 1，两页 warn/error 为空。未编辑源码或声明 HMR 编辑测试。原生截图首轮后台捕获超时，将自建预览页置前台后保存成功；没有调整安全或隐私设置。
- 原清单、锁文件、Vite 配置、首页和 src 等 16 项文件 SHA256 在构建、检查与提交 hooks 后一致，没有额外 UI/CSS 依赖。生产截图 D:/Workspace/adui-studio/test-vue-acceptance-20261030.jpg 在仓库外；试用工程和 dist 保留，临时哈希、两个浏览器标签及本轮服务清理。
- test-vue 本地初始化提交 c3d9194（中文 emoji），官方 vp check --fix hook 正常执行，工作区干净。新工程无远程仓库，不替用户创建远程或把试用源码推到生成器仓库；生成器只记录本次真实试用证据，没有运行逻辑修改。
- 生成器另执行 210/210 Node 测试；文档与根检查按本轮修改完成。当前试用基线可用，下一步由 test-vue 的实际需求确定 UI/CSS 等选项，再验证已有工程的首次补装；未明确前保持当前默认配置，不扩展业务页面或模型查看器。

## 2026-10-30：按用户要求默认导入本地 normalize.css

- 用户明确 Vue/React 都默认导入指定 URL 的静态 normalize.css，不使用 npm 包。保存 8.0.1 固定快照、MIT 许可与来源/SHA256，CSS 仅统一排版；创建和浏览器不下载远端 CSS，没有新增依赖或改锁文件。
- 新增 base-styles 计划/预检/写入模块，覆盖 Vue/React TS/JS 的正式 main。官方生成后复制 src/styles/normalize.css 与 normalize.LICENSE.txt，UI/CSS 写入之后整理到其他样式之前，保留原入口内容、App、配置和依赖。根工作区及旧成员不自动改写，独立验收页沿用原有入口规则。
- 单应用、逐应用、批量和多引擎共用原 CLI；计划展示 baseStyles，矩阵纳入静态路径冲突验证。--apply-existing 可在无 UI/CSS 选择时单独补齐，已知匹配文件重复跳过；未知同名文件、被修改/部分输出与链接拒绝覆盖，失败保留现场。
- 七项新增测试覆盖四入口、许可与无远程 CSS 引用、原文件保留、后续 UI/CSS 导入顺序、重复写入、冲突/链接和 BOM/hashbang/注释。最低 Node 22.18.0 已通过 217/217 测试，实际创建与浏览器证据将在本轮验收记录补齐。

## 2026-10-30：默认 normalize.css 实机验收与 test-vue 补齐

- test-vue 使用无 UI/CSS 参数的 --apply-existing 补齐本地 CSS、许可和 main.ts 首条样式导入；完整 build 2/2、vp check 16 格式/5 代码文件通过。package、锁、Vite 配置、App、原样式、HelloWorld 共 6 项文件哈希保持，重复调用三个目标文件的内容及 mtime 不变。工程本地提交 e318c84，官方 hook 通过，无远程仓库。
- 新建官方 adui-normalize-validation-20261030，包含 Vue/React × TS/JS 四个无可选 UI/CSS 框架应用。Node 22.18.0、pnpm 12.16.1、Vite+ 1.4.0 下根+四应用共五阶段全部成功，四种正式入口与本地静态快照/许可均生成，manifest 与锁文件没有 normalize.css npm 包。
- 根 vp run --no-cache ready 11/11 成功，包含四应用完整类型/首页构建及官方默认成员测试/构建；最终 check 65 格式/22 代码文件通过。四份生产 CSS 都包含先于原应用样式的 normalize 规则，默认 website/utils 未强制加入应用基础样式；保留 TypeScript 7 API 实验性提示。
- Chrome 检查 test-vue 与新 React JS 开发页面的真实 style 标签，normalize 来自各自 src/styles 本地文件且位于原样式之前；两页点击计数 0→1，warn/error 为空。截图 D:/Workspace/adui-studio/test-vue-normalize-20261030.jpg 保留在仓库外；没有新增生产浏览器或全部增强组合验收声明。
- 更新需求 FR-012、架构/SDD、ADR、索引、README、Windows/批量说明与验收范围，明确静态快照、CSS none 语义、优先顺序、幂等与拒绝覆盖。生成器主功能提交 2b12d60；库版本和锁文件未改变，无新增依赖、CI/CD 或发布。
- 本轮 217 项 Node 测试、文档检查、8 示例/20 应用及 462 组合计划、根 vp check 175 格式/129 代码文件通过；计划 actualBuilds 均为 0。验证工程和产物保留，临时哈希、JSON、测试日志与两项浏览器服务已清理。
- 下一步仍按 test-vue 的实际需求选择 UI/CSS，使用首次补装并确认基础样式仍优先；未选择前保持无额外框架，不扩展业务页面或查看器。

## 2026-10-30：test-vue 按用户选择首次补装 Element Plus/Tailwind

- 用户明确选用 Element Plus + Tailwind CSS。对既有 Vue TS 工程执行 --apply-existing，随后 --ui-smoke 生成独立页；没有重建官方模板或修改原首页。进程选择 Node 22.18.0 与官方 shim，pnpm 12.16.1 安装 Element Plus 2.14.7、Tailwind/@tailwindcss/vite 4.3.3 和 unplugin-vue-components 32.1.0，原 Vue/TypeScript/Vite+ 版本保留。
- lazyPlugins 增量加入 resolver/Tailwind，main.ts 的 normalize 导入仍优先。App、HelloWorld、原 style 与 normalize/许可共 5 项 SHA256 保持；重复补装和验收页生成均预检拒绝，30 项文件内容及 mtime 保持。没有 normalize npm 包，生成器依赖及锁文件未变。
- 完整类型/首页构建 2/2、/ui-check/ 首页+验收页构建、最终 check 20 格式/8 代码文件均通过，保留构建性能提示。Chrome 开发首页本地样式顺序正确；生产验收页为真实 Element Plus 主按钮，计数 0→1，Tailwind 绿色区域、8px 圆角与 16px 内边距正确，两页 warn/error 为空。
- 截图 D:/Workspace/adui-studio/test-vue-element-plus-20261030.jpg 在仓库外；临时配置、两个标签与本轮服务已清理，工程和产物保留。test-vue 本地分步提交 a664ce1、0325b9c，默认 hooks 通过，工作区干净，无远程仓库；生成器只同步实测文档。
- 本轮生成器 217/217 Node 测试、文档校验与根 vp check（175 格式/129 代码文件）通过。下一步补验本地 normalize.css 与 UI/CSS 在官方 Monorepo 子应用中的联用和隔离，保持根及兄弟应用不受影响；继续生成器兼容性验收，不扩展业务功能。

## 2026-10-30：Monorepo 基础样式与 UI/CSS 联用隔离验收

- 在既有官方 adui-normalize-validation-20261030 新增 Vue TS/Element Plus/Tailwind 的 vue-element-ts、React JS/Ant Design/UnoCSS 的 react-antd-js，分别通过官方 Application 创建和 UI Smoke 生成。使用 Node 22.18.0、pnpm 12.16.1、Vite+ 1.4.0；没有修改 test-vue 或原四个无可选 UI/CSS 的应用。
- 原 103 项文件中，仅共享锁、YAML catalog/peer 与根 Vue 声明排除配置按规则变化；其余 100 项文件的 SHA256 和 mtime 保持。根无框架/UI/CSS 直接依赖，两新应用各自依赖隔离；本地 normalize/许可匹配快照并优先导入，两组正式 App/原样式保持官方内容。
- 根无缓存 ready 14/14、Vue /ui-check/ 与 React ./ 双入口构建、最终 check 96 格式/36 代码文件通过。保留官方 TypeScript 7 API、UnoCSS 多入口及构建性能提示，没有关闭检查规则。
- Chrome 两开发首页确认本地 normalize 在组件库/CSS 及原样式之前，原计数正常；两生产组件页真实主按钮点击 0→1，绿色 CSS 区域、8px 圆角及 16px 内边距正确，四次页面观察 warn/error 为空。两份原生截图位于 D:/Workspace/adui-studio/monorepo-vue-normalize-ui-20261030.jpg 与 monorepo-react-normalize-ui-20261030.jpg，验收标签及本轮 4395–4398 服务已关闭。
- 两组重复创建/验收页均拒绝，重复补齐已存在基础样式均跳过写入，六次调用前后 149 项文件内容与 mtime 保持。原验证工作区未提交文件及构建产物保留，临时哈希记录清理。生成器未改源码、依赖或锁文件，只更新需求、状态、验收证据与 Monorepo 说明；本轮 Node 测试 217/217、文档校验和根 check（175 格式/129 代码文件）通过。
- 本地 normalize 与 UI/CSS 的独立应用、官方工作区代表路径已补齐。下一步进入 Windows V1 实际使用反馈与问题修复；已有能力按 Windows 指南使用，不为继续开发重复扩张组合或新增业务演示功能。

## 2026-10-30：统一 Windows 保留名称校验

- 核对实际输入路径发现，批量 JSON 的 portableName 已拒绝 Windows 保留名，但公共 validateProjectName 只校验字符/长度，单应用、逐应用与交互存在不一致。修复前命令构造仍接受 con、nul、com1、lpt9；本轮修复这一具体问题，没有增加生成预设。
- 将既有保留名规则移入 options.mjs 的公共函数，批量根与应用改为复用。con/prn/aux/nul、com1–com9、lpt1–lpt9 共 22 个完整名称统一拒绝；console、con-app、com1-app 等普通名称保持允许，不改变官方模板参数或重命名既有工程。
- 新增三项回归测试，覆盖全部保留名和相似合法名、交互报错后重试、真实 CLI 创建/预览/维护及工作区参数的提前失败；扩展原批量用例验证根和子应用规则一致。CLI 子进程清空其 PATH，防止校验回归时启动已安装的官方工具；七次非法调用与一次合法 dry-run 均不写临时目标，临时目录由测试清理。
- Node 22.18.0 下定向 36/36、全量 220/220 测试，文档校验及根 vp check（175 格式/129 代码文件）通过。更新需求、设计、索引和 Windows 名称说明，同时纠正本文件顶部过时的下一步，避免把已完成专项或排除范围误当作当前计划。
- 本轮没有安装依赖、创建实际应用、重跑应用构建或浏览器验收，test-vue、既有工作区及锁文件未改。下一步核对生成完成和失败提示中的检查/构建命令，确保引导执行包含类型检查的完整应用脚本；新需求明确后再扩展功能。

## 2026-10-30：修正完整构建与后续操作提示

- 核对本地 Vite+ 文档和应用 scripts：vp build 为内置构建，vp run build 才运行 package.json 的完整脚本。恢复计划的实际 argv 已正确，但旧配置修复、补装及 UI/CSS 完成提示仍推荐 vp build，现统一为应用目录的 vp check/vp run build；新建结束补充按 Application/Monorepo 区分的提示。
- 失败指引要求先核对 Git diff、修复现场，再在已完整生成的应用执行检查与完整构建；官方根使用 vp run ready。显式恢复的 validation 继续只声明结构检查，并给出对应命令。UI/Three 独立页仍用 vp dev 与浏览器验收，UI 页地址改为以终端地址为准；专项 vp build --config 和用户 scripts 未改变。
- README、Harness 的当前操作步骤同步为完整脚本，保留历史 vp build 验收记录。同步需求、SDD 和索引；没有为提示文本新增镜像测试，也没有引入命令自动执行或依赖升级。
- 在 test-vue 实际运行已知基础样式的重复补齐（成功）和重复 UI 页（拒绝），两种输出均包含完整构建指引，30 项 Git 可见文件内容及 mtime 一致。既有 normalize 官方工作区的 vue-ts/react-ts 分别执行 vp check、vp run build，各 2/2 成功，日志明确执行 vue-tsc -b/tsc -b；149 项 Git 可见源文件/配置内容及 mtime 保持，普通构建产物按原脚本更新。
- Node 22.18.0 下 220/220 测试、文档校验及根 check（175 格式/129 代码文件）通过。本轮未新建实际应用、安装依赖、修改锁文件或做浏览器验收。下一步核对已有工程补装前的预检和报错定位，继续优先修复实际使用问题，不扩展预设或演示功能。

## 2026-10-30：工作区补装先预检再修改共享配置

- 在隔离临时工作区复现：应用 Vite plugins 为不支持的调用形式时，--apply-existing 最终拒绝，但此前已写根 YAML 的插件 peer 配置。临时复现目录已清理，没有改动真实项目来制造失败。
- 提取 integrations.mjs 的只读 preflightIntegrations，复用现有依赖计划、语言入口/配置识别、配置生成和输出占用检查。CLI 在“补装预检”中先校验基础样式、UI/CSS 和所选预设，再准备工作区 peer；未知 Vite 结构和输出冲突不再提前修改根文件。applyIntegrations 本身仍重新预检，安装后原有内容/路径/输出复查保留。
- 补装清单校验复用基础样式预检，移除提前裸 JSON.parse；错误包含阶段、目标和原因。新增三项测试，覆盖四入口合法只读预检、Vue/React × TS/JS 的两类工作区失败（共八次真实 CLI）、坏/空/数组清单的安全报错及 BOM 清单继续预检。失败前后文件内容与 mtime 一致，测试子进程不查找已安装工具，临时目录按原测试生命周期清理。
- 实际 test-vue 与既有 normalize 工作区分别复查已知基础样式跳过及重复 Element Plus/Tailwind 拒绝；四次调用前后 30 项、149 项 Git 可见文件内容与 mtime 保持。没有安装依赖、新建实际应用、运行应用构建或浏览器验收，原源码和仓库锁文件保留。
- Node 22.18.0 下定向 27/27、全量 223/223 测试，文档校验及根 check（175 格式/129 代码文件）通过。同步需求、SDD、索引与 Windows 说明；此修复不承诺依赖安装或其他后续失败的事务回滚。
- 下一步核对仅选择 UI、CSS 为 none 时的重复补装保护，继续处理生成器的文件保护和实际使用问题，不扩展业务功能。

## 2026-10-30：无 CSS 的 UI 重复补装保护

- 复现 css=none 的重复生成缺口：React/Ant Design 再次插入 reset.css，Vue/Element Plus 再次插入 Components 导入；没有独立 CSS 输出文件可触发旧占用检查，继续安装会造成重复引用或配置错误。
- generateIntegration 在非旧版修复模式识别已选择 UI 所需的现有普通静态导入，插件/样式引用或部分引用存在时拒绝。沿用只读补装预检，拒绝发生在工作区修改、安装、格式化及文件写入前；注释、示例字符串忽略，别名/多行导入可识别。这是针对已有生成格式的保护，不是通用 JS/TS 解析或任意配置迁移。
- 新增三项回归测试：五种 UI × TS/JS 的首次无 CSS 补装与重复拒绝（安装/格式化使用受控回调）、已有 UI 后以 ui=none 追加 UnoCSS、别名/多行/部分引用/注释边界，以及 Vue TS/React JS 工作区真实 CLI 拒绝后根配置和文件保持，定向 33/33 通过。
- 实际 test-vue 与 normalize 工作区 react-antd-js 分别执行 css=none 的重复 UI 补装拒绝及基础样式补齐跳过；30 项、149 项 Git 可见文件内容及 mtime 保持。没有安装真实依赖、新建实际应用、运行应用构建或浏览器验收，仓库依赖/锁文件未改。
- Node 22.18.0 下全量 226/226 测试、462 组合计划、文档校验和根 check（175 格式/129 代码文件）通过。计划 actualBuilds=0，不扩大真实渲染声明；同步需求、SDD、索引与 Windows 说明，保留已知旧版修复和基础样式幂等路径。
- 下一步核对 CSS 配置文件缺失但插件/样式引用仍存在时的部分补装保护，继续沿实际使用和文件保护主线处理问题。

## 2026-10-30：CSS 部分配置残留拒绝补装

- 复现 UnoCSS/Tailwind 配置文件缺失后，原生成逻辑仍会再次插入插件导入。扩展既有引用检测：选择 CSS 时，已知插件/入口静态导入或默认 UnoCSS()/tailwindcss() 调用存在即在预检拒绝，避免把文件缺失当成尚未集成；另一 CSS 框架的残留也不会被自动替换。
- 检测器继续屏蔽注释和示例字符串，已知调用仅在配置代码中识别。css=none 的仅新增 UI、基础样式幂等与已知旧版 repair=true 迁移保留原路径；不支持任意手写别名调用或动态配置迁移。
- 新增三项回归测试，覆盖 Vue/React × TS/JS × UnoCSS/Tailwind 的首次集成、缺文件后的插件/样式/调用三种残留及跨 CSS 拒绝（依赖安装/格式化均为受控回调）；补验注释、导入别名、仅新增 UI 和旧版修复，并以四次真实工作区 CLI 验证预检拒绝且文件内容/mtime 保持，定向 37/37 通过。
- 真实 test-vue 与 normalize 工作区 react-antd-js 分别复查 CSS 重复拒绝和基础样式跳过，30 项、149 项 Git 可见文件内容及 mtime 保持。只在临时测试夹具中模拟文件丢失，没有删除真实项目配置、安装真实依赖、新建应用、运行应用构建或浏览器验收，仓库依赖与锁文件未改。
- Node 22.18.0 下 229/229 测试、462 组合计划、文档校验和根 check（175 格式/129 代码文件）通过；计划 actualBuilds=0。同步需求、SDD、索引及 Windows 部分配置处理说明。
- 下一步核对 Ant Design Vue 构建策略冲突是否同样在工作区写入前拒绝，继续处理生成器的实际使用和文件保护问题。

## 2026-10-30：Ant Design Vue 构建策略先预检再写入

- 隔离复现 allowBuilds 使用不支持的内联映射时，补装虽拒绝，但根 YAML 此前已追加 peer 配置。临时复现目录已清理，未修改真实项目制造失败。
- build-policy.mjs 提取只读 preflightUiBuildPolicy，定位策略普通文件并计算合并结果；preflightIntegrations 在补装预检调用，策略冲突在根 peer 写入、安装、格式化之前报错，包含具体 pnpm-workspace.yaml 路径。prepareUiBuildPolicy 显式重新读取和复查后才写入，保留中间正常追加的 peer 配置和原有定向格式化行为。
- 新增三项测试：只读预检与显式增量准备、已有明确选择/重复调用及策略目录/链接保护；TS/JS × 五种 allowBuilds 冲突共十次真实工作区 CLI 验证“补装预检”拒绝、已完成为无、根和应用文件内容及 mtime 保持。非 Ant Design Vue 不读取策略，已有 core-js:true/false 不改写；依赖安装仍使用受控测试回调，没有放宽策略。
- 实际 audit-antd-vue-ts 和 adui-node22-acceptance/apps/vue-ts 的正常策略只读复查均无需更新，分别四项、六项策略/清单/配置/入口文件内容及 mtime 保持。没有安装真实依赖、新建实际应用、运行应用构建或浏览器验收，仓库依赖和锁文件未改。
- Node 22.18.0 下全量 232/232 测试、文档校验及根 check（175 格式/129 代码文件）通过，相关需求、SDD、索引和 Windows 指引同步。仍不承诺任意 YAML 转换或依赖安装失败的事务回滚。
- 下一步核对已有 --repair-existing 修复入口的预检和失败保护，继续以 Windows 实际使用和原文件保留为主线，不增加预设或业务演示。

## 2026-10-30：旧版修复入口预检与失败报告

- 在隔离临时目录复现旧入口裸 JSON.parse 的两个问题：损坏清单报错包含原文片段，正常 UTF-8 BOM 清单被拒绝。清单读取原先发生在修复阶段之外；现移入 repairExistingIntegrations，先校验路径和普通文件，再解析 JSON 对象并核对框架，错误只报告原因与文件路径。
- 配置和旧插件同样要求普通文件，未知旧格式及已有备份在写入前拒绝。异步格式化现在等待完成并向上传播失败，已生成的原插件备份保留；没有添加事务回滚，也没有扩展为任意旧工程迁移或安装依赖。
- 新增三项测试：Vue/React TS 正常迁移与 BOM、十四种真实 CLI 预检失败、异步格式化失败。坏/空/数组清单、缺失/目录/符号链接、框架不符、备份占用、未知格式和 JS 入口拒绝后，临时文件内容及 mtime 保持；正常迁移保留清单、正式入口与 App，重复调用不覆盖备份。
- Node 22.18.0 下定向 23/23、全量 235/235 测试与文档校验通过；清理调整后遗留的一处未使用导入后，完整检查再次通过，根 vp check 检查 176 个格式文件、130 个代码文件，无格式、Lint 错误或警告。
- 本轮只使用隔离测试夹具，未修改 test-vue 或既有工作区，未安装依赖、新建实际应用、运行应用构建或浏览器验收，仓库依赖和锁文件未变。相关需求、设计、索引和 Windows 故障处理说明已同步。
- 下一步核对旧插件中的 UI/CSS 与 --repair-existing 参数的一致性，避免错误选择导致生成不匹配的配置；先复现再决定修复范围，继续沿 Windows 生成器兼容性与文件保护主线。

## 2026-10-30：旧版修复参数与原 UI/CSS 一致性

- 先用隔离测试复现：旧插件实际为 Tailwind，却传入 TDesign/UnoCSS，原实现仍成功替换配置。新增回归在修复前因未拒绝而失败，确认不是仅补文档或扩大验证范围。
- 新增 legacy-integrations.mjs，按历史 23184ed 的完整 TS 插件结构核对选择，兼容已知排版和注释变化；自定义选项、别名或额外代码保守拒绝，不执行旧插件。正式入口的已知样式与清单中的所需直接依赖也须匹配，React UI 从入口样式确认。所有检查发生在配置写入和备份前，未增加安装或切换预设能力。
- fixtures/legacy-integrations.mjs 保存历史纯生成函数，仅用于隔离测试，不用于创建实际应用。十七种有效 Vue/React TS 旧插件组合通过迁移，清单、正式入口、App 和 CSS 文件内容及 mtime 保持，旧插件备份原文保留；涵盖双引号、CRLF、注释、分号与尾逗号变化。
- 新增二十次真实 CLI 拒绝验证，覆盖 Vue/React UI、CSS、none 参数不符、运行/开发依赖缺失、入口缺失/目录/链接、样式仅在注释/字符串中、其他库样式、自定义代码/选项/别名、空函数/注释伪装及 return 换行。拒绝后所有夹具文件内容与 mtime 保持，原有十四种失败检查继续通过。
- Node 22.18.0 下定向 29/29、全量 238/238 测试、文档校验及根 vp check（178 格式/132 代码文件）通过，无 Lint 警告。更新需求、SDD、索引、Harness 与 Windows 指南；只使用隔离夹具，未修改实际应用、安装依赖、运行应用构建或浏览器验收，依赖和锁文件未变。
- 下一步按 Windows V1 验收清单复核实际使用入口与剩余阻塞项，明确现有能力的交付边界；继续优先解决已复现问题，不新增预设或业务演示。

## 2026-10-30：Windows V1 实际入口与阻塞复核

- 对照需求、架构、CLI、Windows 指南及 V1 证据清单复核，没有在本轮覆盖范围发现新的交付阻塞。已实现能力、历史实际构建与渲染、隔离夹具及计划验证继续分别记录；没有为继续开发追加预设、业务功能或恢复模式。
- --help、8 个批量 JSON/20 个应用预览和 462 个组合计划通过，actualBuilds=0。现有 normalize 工作区检查找到八个成员，临时配置对照原四个无 UI 的 Vue/React TS/JS 应用及两个 UI 应用，六项均 present；只读恢复计划均为 validate-existing，argv 为 vp check、vp run build，未执行恢复或创建新应用。
- test-vue 单独基础样式补齐成功但不写文件，重复 Element Plus/Tailwind 补装在“补装预检”拒绝、重复 UI 页在“UI 验收页”拒绝。基础样式成功沿用通用“补装完成”提示，是否写入以文件内容及 mtime 对照确认。
- 实际调用前后，normalize 工作区 149 项和 test-vue 30 项 Git 可见文件 SHA256 与 mtime 一致，临时预期 JSON 已清理。没有安装依赖、运行实际应用构建或浏览器验收；原应用、未提交文件、依赖与锁文件保留。
- Node 22.18.0 下全量 238/238 测试、文档校验和根 vp check（178 格式/132 代码文件）通过。更新 V1 集中复核与能力表，并将旧修复入口的“备份后修复”改为“修复已知旧配置，保留旧插件备份”，与实际顺序一致；没有源码或模块设计变更。
- 下一步进入实际 Windows 项目使用与反馈处理，按已有指南创建或补装；有可复现问题再修复生成器。当前边界内没有需要自动扩展功能来解除的阻塞，未覆盖组合、其他平台、发布与部署维持原限制。

## 2026-10-30：批量创建祖先清单的 BOM 与错误保护

- 沿 Windows 输入兼容性主线补查批量目标预检，先通过两个失败回归复现：普通父级 BOM package.json 被拒绝，损坏清单的 JSON.parse 错误回显内容片段且缺少对应路径。复现仅使用隔离临时目录，没有修改真实父目录清单。
- batch.mjs 的 checkDestination 复用 inspectPath，要求 cwd/祖先清单为不超过 1 MiB 的普通文件，去 BOM 后校验 JSON 对象；目录、链接、超限或坏清单拒绝，错误仅报告原因和文件路径。pnpm/workspace 嵌套保护与已有目标拒绝保留，执行前重建计划同样重新检查，未添加安装、覆盖或恢复能力。
- 新增三项测试：两级普通 BOM 清单及恰好 1 MiB 的合法边界、九类非法清单的预览/执行拒绝、预览后祖先改为坏 JSON 或 workspace 清单的执行重检。共二十次真实 CLI 调用，路径包含中文、空格和 &；拒绝前后文件内容及 mtime 一致，受控 runner 未调用官方工具，临时目录按受限路径清理。
- Node 22.18.0 下定向 14/14、全量 241/241 测试，文档校验及根 vp check（179 格式/133 代码文件）通过。同步需求、SDD、代码索引和批量操作指引；没有安装依赖、创建实际应用、运行应用构建或浏览器验收，真实工程、依赖与锁文件未变。
- 下一步继续实际 Windows 批量使用与反馈处理；对新的可复现失败按同一预检和原文件保护原则修复，不扩展预设、业务演示、其他平台或发布流程。

## 2026-10-30：批量失败退出码向外传递

- 继续核对批量执行与失败定位。配置读取已有 BOM/坏 JSON 处理，本轮未改其路径策略；两个新回归先复现批量错误包装丢失有效退出码，Windows 根命令返回 7 时最外层 CLI 实际变成 1。
- runWorkspaceVp 和批量 runStep 保留子进程 status，executeBatch 包装错误时复制有效正整数 exitCode，复用原 CLI 错误出口。信号退出和无法提供有效码的异常继续按失败处理；不改变阶段顺序、人工恢复指引、失败即停和部分文件保留行为。
- 新增两项测试：受控 runner 验证有效码、无效值过滤和原始 cause；Windows 原生 CLI 通过隔离 vp.cmd 替身分别复验根失败 7 和应用失败 9。替身调用记录确认无后续应用执行，部分文件与配置原文保留；没有启动真实官方工具或安装依赖，不计为实际项目生成或构建。
- Node 22.18.0 下定向 28/28、全量 243/243 测试（无跳过）、文档校验和根 vp check（180 格式/134 代码文件）通过，无 Lint 警告。同步需求、SDD、代码索引和批量说明；真实应用、依赖和锁文件未修改，没有重跑应用构建或浏览器验收。
- 下一步核对 --execute-recovery 的子进程退出码传递是否一致，继续修复现有 Windows 创建/恢复路径，不增加新恢复模式或业务功能。

## 2026-10-30：显式恢复保留子进程失败退出码

- 按上一轮计划复核 --execute-recovery，两个新回归先复现有效退出码丢失：受控错误的 exitCode 未保留，Windows 子进程返回 13 时最外层恢复 CLI 返回 1。
- workspace-recovery-execute 的 run 保留子进程 status，外层错误包装只复制有效正整数 exitCode，复用原 CLI 失败出口；failed/completed/skipped 和原始 cause 保留。没有改变初始/逐应用重检、成功后的结构核对及仅新建缺失应用的范围，也没有增加自动续跑或覆盖能力。
- 新增两项测试：创建与 UI 阶段有效码、五种无效值及错误上下文；Windows CLI 通过隔离 vp.cmd 替身复验 13 向外传递、部分文件保留、已有应用不被重建。再次执行因部分应用而初始阻塞、返回 1，调用日志保持；原配置、根文件与已有应用共八项文件的内容及 mtime 保持。
- Node 22.18.0 下定向 15/15、全量 245/245 测试（无跳过）、文档校验和根 vp check（180 格式/134 代码文件）通过。需求、SDD、索引、Monorepo 与 Windows 指南已同步；替身只用于隔离回归，没有启动真实官方生成/安装、修改实际项目或重跑应用构建与浏览器验收，依赖及锁文件未变。
- 下一步核对检查、规划与执行三种入口对工作区 BOM 清单的处理是否一致，继续处理 Windows 输入兼容性和现有恢复路径，不扩展预设或业务演示。

## 2026-10-30：工作区 JSON 清单统一 BOM 读取

- 两个新回归先复现入口不一致：检查能读取根 BOM 清单，但缺失应用的规划转为人工处理；BOM 成员在作用域重名检查前也因裸 JSON.parse 失败。错误包含原文片段，未通过忽略清单来绕开问题。
- 提取 workspace-inspect 原有读取器为 workspace-json.mjs，供检查、预期配置及 resolveWorkspaceApplication 的根/成员读取复用：普通文件、1 MiB、BOM、JSON 对象和路径保护规则一致，错误只含路径。根 private/Vite+、scope 和重名规则继续由原调用方校验，不重写清单，不扩展恢复范围。
- 新增三项测试：根/成员 BOM 与恰好 1 MiB 边界、检查/规划/受控创建及重复跳过，BOM 成员重名保护，以及根/成员六种坏清单的 CLI/API 拒绝和内容不回显。共十六次真实 CLI 调用，已有文件内容与 mtime 保持；恢复新建由受控 runner 写最小结构夹具，不计为实际应用生成或构建。
- 既有 normalize 工作区的 vue-element-ts、react-antd-js 各执行一次真实 CLI dry-run，模板、cwd 和 target 正确，前后 149 项 Git 可见文件 SHA256 与 mtime 一致。没有改动真实清单来制造 BOM，也没有运行安装、应用构建或浏览器验收，依赖与锁文件未变。
- Node 22.18.0 下定向 30/30、全量 248/248 测试（无跳过）、文档校验和根 vp check（182 格式/136 代码文件）通过。需求、SDD、代码索引和 Monorepo 说明已同步。
- 下一步核对 pnpm-workspace.yaml 的 BOM 输入是否也影响既有工作区预检，继续以 Windows 文件兼容性和原文件保护为主线，不新增预设或业务功能。

## 2026-10-30：工作区 YAML BOM 识别与增量合并

- 两个失败回归复现：首行 BOM packages 无法被识别；首行 BOM allowBuilds 会漏掉已有规则并追加重复块，已有 core-js:true 因而被错误追加 false。问题仅在隔离字符串与夹具中复现，没有改动真实策略制造失败。
- validateWorkspacePackages 在分析前跳过文件头 BOM，peer 与构建策略规划将 BOM/正文分开处理，再将 BOM 加回结果。原合并逻辑、明确规则保留、未知语法拒绝、写入前复查和定向格式化保持；不引入通用 YAML 转换，也不修改构建权限选择。
- 新增三项测试：首行 packages/peer/allowBuilds、LF/CRLF 无改动路径、补充及幂等、已有 true/false、冲突 peer/内联策略/合并键/多文档拒绝。五次真实 CLI 覆盖检查、规划、全部跳过的恢复、逐应用预览和缺失应用规划；受控恢复回调确认进入新建步骤，未启动官方工具。显式 peer/策略准备保留 BOM、catalog 和注释，其他文件内容及 mtime 保持，冲突拒绝不写入。
- Node 22.18.0 下定向 21/21、全量 251/251 测试（无跳过）、文档校验和根 vp check（183 格式/137 代码文件）通过。需求、SDD、索引和 Monorepo 说明已同步；未安装依赖、修改实际工程、运行应用构建或浏览器验收，依赖与锁文件未变。
- 下一步在隔离 Windows 工作区复验 BOM 配置下的官方创建与完整检查/构建，补充真实工具链证据；不将本轮预检与合并回归当作实际生成或构建通过，不扩大预设或业务功能。
