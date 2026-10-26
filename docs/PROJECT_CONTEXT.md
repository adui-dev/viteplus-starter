# 项目上下文

更新日期：2026-10-26。

## 项目定位与约束

- 仓库：`adui-dev/viteplus-starter`。Vite+ 官方 `vite:application` / `vite:monorepo` 是唯一基础工程来源，Vue/React Application 按语言选 `vue` / `vue-ts` / `react` / `react-ts`。
- 已实现：基础 CLI 交互与参数模式、Application UI/CSS 集成、旧项目补装及 `--repair-existing`、基础单元测试与文档检查。
- 规划中：Monorepo 多应用隔离与框架增强、其余 UI/CSS 兼容矩阵、大屏、Three.js/CesiumJS/Babylon.js、3D 模型安全加载。
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
3. 独立验证 Monorepo 创建，再逐步进入大屏适配及 3D 模型安全加载开发。
