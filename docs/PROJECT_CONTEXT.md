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
