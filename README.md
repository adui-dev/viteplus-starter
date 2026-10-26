# ADui Vite+ Starter

基于 **Vite+ 官方模板**的多框架项目初始化与可选功能集成工具。

> 当前状态：**初始化骨架，尚未发布**。已实现基础交互式 CLI、官方 Vue / React TypeScript 模板参数、单元测试及文档校验；UI/CSS/3D 集成和 npm 发布仍未实现。

## 快速开始（开发者）

环境：Node.js 22+、pnpm，以及可运行的 `vp` 命令。

```powershell
git clone https://github.com/adui-dev/viteplus-starter.git
cd viteplus-starter
pnpm install
node packages/create/bin/cli.mjs --help
# 无参数交互创建（名称、类型、框架、确认）
node packages/create/bin/cli.mjs
node packages/create/bin/cli.mjs --name demo-vue --type application --framework vue --dry-run
node packages/create/bin/cli.mjs --name demo-vue --type application --framework vue
node packages/create/bin/cli.mjs --name demo-react --type application --framework react
```

当前 CLI 使用 Vite+ 内置 `vite:application` 或 `vite:monorepo`；Application 用 `--framework` 将框架映射到官方 `vue-ts` / `react-ts` 模板。现已提供基础交互式创建流程，但 **UI、CSS、大屏、3D 插件尚未实现**，不会出现这些未生效的选择项。

本地验证：

```powershell
node --test
node scripts/validate-docs.mjs
```

`vp check` 依赖本地可用的 Vite+ 工具链和已安装依赖。

## 规划功能

Application / Monorepo、Vue / React、Element Plus / Ant Design / TDesign、UnoCSS / Tailwind CSS、Three.js / CesiumJS / Babylon.js、大屏适配和模型安全加载。可选能力必须按应用独立集成。

## 工程文档

- [开发协作规范](AGENTS.md)
- [需求与验收](docs/REQUIREMENTS.md)
- [架构](docs/ARCHITECTURE.md)
- [详细设计](docs/SDD.md)
- [状态](docs/PROJECT_CONTEXT.md)
- [代码索引](docs/CODEBASE_MAP.md)
- [Skills 索引](docs/SKILLS.md)
- [本地验证 Harness](docs/HARNESS.md)

本仓库明确**不创建或维护任何 CI/CD 工作流**。本地测试不等于 CI。

许可证：[MIT](LICENSE)。
