# ADui Vite+ Starter

基于 **Vite+ 官方模板**的多框架项目初始化与可选功能集成工具。

> 当前状态：**初始化骨架，尚未发布**。已实现初步 CLI 命令委托、参数校验、基础测试和文档校验；Vue / React 自动选择、UI/CSS/3D 集成和 npm 发布均未实现。

## 快速开始（开发者）

环境：Node.js 22+、pnpm，以及可运行的 `vp` 命令。

```powershell
git clone https://github.com/adui-dev/viteplus-starter.git
cd viteplus-starter
pnpm install
node packages/create/bin/cli.mjs --help
node packages/create/bin/cli.mjs --name demo-app --type application --dry-run
node packages/create/bin/cli.mjs --name demo-app --type application
```

当前 CLI 使用 Vite+ 内置 `vite:application` 或 `vite:monorepo` 模板；框架由官方交互选择。**请勿把初始化 CLI 误认为已完成的多选项生成器。**

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
