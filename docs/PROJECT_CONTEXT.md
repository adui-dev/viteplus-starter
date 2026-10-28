# 项目上下文

更新日期：2026-10-27。

## 项目定位与约束

- 仓库：`adui-dev/viteplus-starter`。Vite+ 官方 `vite:application` / `vite:monorepo` 是唯一基础工程来源，Vue/React Application 按语言选 `vue` / `vue-ts` / `react` / `react-ts`。
- 已实现：基础 CLI 交互与参数模式、Application UI/CSS 集成、旧项目补装及 `--repair-existing`、UI Smoke、通过 `--workspace` 逐个添加及通过 JSON 批量新建 Monorepo 应用、本地单元测试与文档检查。
- 规划中：Monorepo 自定义布局与显式恢复、其余 UI/CSS 兼容矩阵、大屏、Three.js/CesiumJS/Babylon.js、3D 模型安全加载。
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

1. P4 JSON 批量生成及完整混合工作区验收已完成；逐应用和四种代表组合已有实机记录（见文末）。
2. 下一阶段进入大屏适配首期：按应用选择设计尺寸与 contain/cover/stretch，验证 resize、全屏、指针坐标与清理行为。
3. 再推进 3D 引擎、模型安全加载与其余 UI/CSS 组合，不能将代表组合通过视为完整矩阵通过。

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
