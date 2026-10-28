# ADui Vite+ Starter

## JSON 批量新建 Monorepo

一份配置可以按顺序创建官方工作区、不同框架的应用和可选 UI 验收页：

```powershell
# 在生成器仓库上级目录执行，目标 adui-batch-demo 必须不存在
node ./viteplus-starter/packages/create/bin/cli.mjs --config ./viteplus-starter/examples/monorepo.batch.json --dry-run
node ./viteplus-starter/packages/create/bin/cli.mjs --config ./viteplus-starter/examples/monorepo.batch.json
```

示例生成 Vue TS/TDesign/UnoCSS 的 `apps/admin` 和 React JS/Ant Design/Tailwind 的 `apps/portal`，保留官方 website/utils。执行前统一检查全部选项与名称；失败立即停止，报告已完成/未执行的阶段并保留现场。配置路径相对于当前目录，输出为当前目录下的配置 `name`。详见 [批量配置说明](docs/BATCH_CONFIG.md)。

## Monorepo 多应用（P4）

先由官方模板创建工作区，再用 `--workspace` 逐个添加应用。每个应用独立选择 Vue/React、TS/JS、UI 与 CSS；默认 TypeScript。

```powershell
# 在生成器仓库执行；示例工作区位于仓库外
cd ..
node ./viteplus-starter/packages/create/bin/cli.mjs --name my-workspace --type monorepo
node ./viteplus-starter/packages/create/bin/cli.mjs --workspace ./my-workspace --name admin --type application --framework vue --ui tdesign --css unocss
node ./viteplus-starter/packages/create/bin/cli.mjs --workspace ./my-workspace --name portal --type application --framework react --language js --ui antd --css tailwindcss
```

保留官方默认的 `apps/website` 和 `packages/utils`；新应用位于 `apps/admin`、`apps/portal`。不接受已有同名目标、跨目录名称或 junction。当前支持官方 pnpm 工作区列表，不自动改写自定义 workspace glob。详细步骤、限制和验证结果见 [Monorepo 说明](docs/MONOREPO.md)。

## UI 组件独立验收页（新增）

可以为已创建的 Vue/TDesign 或 React/Ant Design Application 添加本地 UI Smoke 页面，**不修改正式应用首页**：

```powershell
# 在 D:\Workspace\adui-studio 执行
node .\viteplus-starter\packages\create\bin\cli.mjs --name starter-vue-js --type application --framework vue --language js --ui tdesign --css unocss --ui-smoke
node .\viteplus-starter\packages\create\bin\cli.mjs --name starter-react-js --type application --framework react --language js --ui antd --css tailwindcss --ui-smoke
```

在各应用中运行 `vp dev`，访问 `/ui-smoke.html`，核实按钮呈现、点击计数和浅绿色原子 CSS 区域。仅新增 `ui-smoke.html` 与 `src/ui-smoke/`，不会修改 `App.*` 或正式入口。详情：[UI Smoke 验收说明](docs/UI_SMOKE.md)。2026-10-27 已验证两个独立 JavaScript 代表组合的真实浏览器效果。

## Vue / React：TypeScript 与 JavaScript

默认使用 TypeScript，可用 `--language js` 选择 JavaScript；全部通过 Vite+ 官方 `vite:application` 生成，**不自行复制或维护框架模板**。

| 框架  | `--language ts`（默认） | `--language js` |
| ----- | ----------------------- | --------------- |
| Vue 3 | `vue-ts`                | `vue`           |
| React | `react-ts`              | `react`         |

```powershell
node packages/create/bin/cli.mjs --name vue-js-demo --type application --framework vue --language js
node packages/create/bin/cli.mjs --name react-js-demo --type application --framework react --language js --ui antd --css tailwindcss
node packages/create/bin/cli.mjs --name vue-ts-demo --type application --framework vue --language ts --ui tdesign --css unocss
```

交互式创建会在框架选择后询问开发语言，默认 TypeScript。JS 生成器将按照官方工程实际配置处理 `vite.config.js` / `.ts` 等格式，并写入 `src/main.js` 或 `src/main.jsx`；UnoCSS 对应 `uno.config.js`。JavaScript 的 Vue 项目不会生成 TypeScript 专用的组件类型声明。Monorepo 根目录不接受 `--language`，各子应用独立选择。

## 2026-10-26：P3 检查修复

Vue/TDesign/UnoCSS 与 React/Ant Design/Tailwind 的 `vp build` 已由用户验证通过，旧版 `vp check` 因 `./starter.plugins` 的 TS2307 失败。新版将所选插件**直接写入 `vite.config.ts`**，安装后执行 `vp fmt . --write`，不再新建 `starter.plugins.ts`。

已经生成并安装好插件的旧项目，在其上级目录运行以下命令修复，不重装依赖：

```powershell
node .\viteplus-starter\packages\create\bin\cli.mjs --name starter-vue-p3 --type application --framework vue --ui tdesign --css unocss --repair-existing
node .\viteplus-starter\packages\create\bin\cli.mjs --name starter-react-p3 --type application --framework react --ui antd --css tailwindcss --repair-existing
```

修复会将旧插件文件备份为 `starter.plugins.ts.bak`，且只格式化 `vite.config.ts`。分别在项目目录执行 `vp check` 和 `vp build`。**两组旧项目已在 Windows 实机修复并通过构建及类型检查；Vue 首次需格式化自动生成的 `src/components.d.ts`。**

基于 **Vite+ 官方模板**的多框架项目初始化与可选功能集成工具。

> 当前状态：**开发阶段、尚未发布**。Vue/React × TypeScript/JavaScript 四种官方应用模板已完成真实创建和构建验证。P4 逐应用与 JSON 批量新建 Monorepo 均已通过 Vue TS/TDesign/UnoCSS + React JS/Ant Design/Tailwind 混合工作区的检查、完整构建和浏览器验收。其余 UI/CSS 组合、多屏、3D 和 npm 发布仍待完成。

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
# UI 与 CSS 按需选择，生成后安装依赖并追加对应配置
node packages/create/bin/cli.mjs --name demo-ui --type application --framework vue --ui tdesign --css unocss
# 已创建但此前 UI/CSS 增强失败的项目：显式补装，不重新创建
node packages/create/bin/cli.mjs --name demo-ui --type application --framework vue --ui tdesign --css unocss --apply-existing
```

当前 CLI 使用 Vite+ 内置 `vite:application` 或 `vite:monorepo`；Application 用 `--framework` 和 `--language` 映射到官方 `vue` / `vue-ts` / `react` / `react-ts` 模板。现已支持 UI 组件库选项（None / Element Plus / Ant Design / TDesign）和 CSS 框架（None / UnoCSS / Tailwind CSS）。React 不提供 Element Plus。选中依赖后由 pnpm 安装并生成 Vite 插件/样式入口；大屏首期已实现（见下文），Three.js 真实场景验收已实现；其他引擎与安全模型加载尚未实现。现在支持针对官方 `plugins: [...]`、`plugins: lazyPlugins(() => [...])` 和不包含 `plugins` 属性的 `defineConfig` 进行兼容配置注入。Vue 自动导入的 `src/components.d.ts` 保留类型声明，但会自动加入 Vite+ `fmt.ignorePatterns`，避免其重新生成造成格式漂移。其他组合仍需运行真实 check/build 验证；未知配置结构会明确报错而不强行修改。

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

## 大屏适配

已提供分层大屏插件和 --screen 预设，支持 Vue/React、TS/JS、已有项目补装与 Monorepo 应用配置。独立验收页不修改正式首页，详见 [使用与迁移](docs/SCREEN.md)。Three.js 最小场景已接入，其他引擎与模型安全仍待实现。

## Three.js 真实场景

已有大屏应用可单独运行 --three-smoke，验证真实 WebGL、DPR、拾取、全屏与卸载清理，保留正式首页。详见 [Three.js 验收](docs/THREE_SMOKE.md)。已支持 --engine three 和逐应用 JSON engine 字段；其他引擎和模型安全仍待实现。

## 本地 GLB

Three 验收页现支持选择自包含 GLB、清除与重新加载；已使用 DamagedHelmet 验证。加载器按需导入，测试模型不打包进仓库。接口与边界见 [GLB 加载说明](docs/THREE_SMOKE.md)；模型授权及加解密仍待实现。

模型现支持 AES-256-GCM `.adui` 封装和浏览器授权解密，操作与边界见 [模型加密](docs/MODEL_SECURITY.md)。生产授权服务仍需业务接入。
