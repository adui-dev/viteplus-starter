# 项目上下文

更新日期：2026-10-26。

## 项目定位与约束

- 仓库：`adui-dev/viteplus-starter`。Vite+ 官方 `vite:application` / `vite:monorepo` 是唯一基础工程来源，Vue/React Application 显式选 `vue-ts` / `react-ts`。
- 已实现：基础 CLI 交互与参数模式、Application UI/CSS 集成、旧项目补装及 `--repair-existing`、基础单元测试与文档检查。
- 规划中：Monorepo 多应用隔离与框架增强、其余 UI/CSS 兼容矩阵、大屏、Three.js/CesiumJS/Babylon.js、3D 模型安全加载。
- 严格要求：**不得添加任何 CI/CD、自动发布或部署工作流**；仅人工本地测试。

## 用户 Windows 实机验收（已确认）

- 运行环境：Node 24.22.1、pnpm 12.15.0、Vite+ 1.4.0。
- Vue + TDesign + UnoCSS：`--repair-existing` 成功，原 `./starter.plugins` TS2307 消失；`vp check` 首次仅提示自动生成 `src/components.d.ts` 格式差异，`vp check --fix` 后通过；`vp build` 通过。
- React + Ant Design + Tailwind CSS：`--repair-existing` 成功；`vp check` 直接通过；`vp build` 通过。
- 以上验证了依赖安装、配置、类型检查及生产构建。**尚未实际验证组件在页面中渲染和交互，也未覆盖所有 UI/CSS 组合。**

## 本轮修复

- 针对 Vue 自动导入组件的 `src/components.d.ts`：保留 `unplugin-vue-components` 的 `dts` 输出，通过 Vite+ `fmt.ignorePatterns` 排除该自动生成文件的格式检查；不关闭 TypeScript 类型检查。
- 新生成的 Vue + UI 项目将自动加入配置，且保留已有 `fmt` 字段及忽略规则。React 不加入此 Vue 专属配置。
- 独立 Node 测试覆盖默认配置、已有 fmt 配置、已有 ignorePatterns、幂等与异常结构。**尚未在 Windows 实际新建项目验证该修复**。

## 下一步

1. 用户运行本地 `node --test`、`node scripts/validate-docs.mjs`，并在新创建的 Vue + TDesign + UnoCSS 项目上验证 `vp check`、`vp build`；必要时复查自动生成声明的格式行为。
2. 验证真实组件渲染，以及 Vue/React 的其余 UI/CSS 组合。
3. 独立验证 Monorepo 创建，再逐步进入大屏适配及 3D 模型安全加载开发。
