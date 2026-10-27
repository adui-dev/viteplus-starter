# 项目上下文

更新日期：2026-10-27。

## 项目定位与约束

- 仓库：`adui-dev/viteplus-starter`。Vite+ 官方 `vite:application` / `vite:monorepo` 是唯一基础工程来源，Vue/React Application 按语言选 `vue` / `vue-ts` / `react` / `react-ts`。
- 已实现：基础 CLI 交互与参数模式、Application UI/CSS 集成、旧项目补装及 `--repair-existing`、UI Smoke、通过 `--workspace` 逐个添加 Monorepo 应用、本地单元测试与文档检查。
- 规划中：Monorepo 批量配置与自定义布局、其余 UI/CSS 兼容矩阵、大屏、Three.js/CesiumJS/Babylon.js、3D 模型安全加载。
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

1. 继续验证真实组件渲染（TDesign/Ant Design）及其余 UI/CSS 组合；目前通过检查/构建不代表组件使用链路已验收。
2. 在全新 Vue TypeScript + UI 组合中复验 `components.d.ts` 自动生成后的格式行为。
3. Monorepo 首期已于 2026-10-27 验收（见文末）；后续扩展批量配置，再逐步进入大屏适配及 3D 模型安全加载开发。

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

