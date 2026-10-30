# ADui Vite+ Starter

项目定位、需求完成度和计划/构建/浏览器验收的区别见 [生成器能力与验收范围](docs/GENERATOR_STATUS.md)。

当前交付验收平台为 **Windows**，处于本地候选阶段，尚未发布。常用命令按执行目录整理在 [Windows V1 操作指南](docs/WINDOWS_GUIDE.md)，实际证据与限制见 [V1 清单](docs/V1_ACCEPTANCE.md)。

Vue/React 的 TS/JS 应用默认包含本地 normalize.css 8.0.1，入口优先导入 `./styles/normalize.css`，保留官方 App 与原样式；不安装 normalize.css npm 包。CSS 选择 none 时也会加入。已有应用可用 --apply-existing 单独补齐，静态快照及许可来源见 [说明](packages/create/assets/normalize.SOURCE.md)。

Cesium 预设已接入 --engine cesium，提供本地椭球、GLB/.adui 授权加载、按需场景与资源配置；默认支持 env 自动加密构建。创建和批量用法见 [Cesium 指南](docs/CESIUM.md)。

Babylon 预设使用 --engine babylon，提供本地场景、GLB/.adui 和默认 env 自动构建保护，支持四种框架/语言及工作区；用法见 [Babylon 指南](docs/BABYLON.md)。

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

可以为已创建的 Vue Element Plus/Ant Design Vue/TDesign 或 React Ant Design/TDesign Application 添加本地 UI Smoke 页面，TS/JS 均支持，**不修改正式应用首页**：

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
# 在项目父目录调用；$starterCli 按 Windows 指南设置为 CLI 绝对路径
node $starterCli --name vue-js-demo --type application --framework vue --language js
node $starterCli --name react-js-demo --type application --framework react --language js --ui antd --css tailwindcss
node $starterCli --name vue-ts-demo --type application --framework vue --language ts --ui tdesign --css unocss
```

交互式创建会在框架选择后询问开发语言，默认 TypeScript。JS 生成器将按照官方工程实际配置处理 `vite.config.js` / `.ts` 等格式，并写入 `src/main.js` 或 `src/main.jsx`；UnoCSS 对应 `uno.config.js`。JavaScript 的 Vue 项目不会生成 TypeScript 专用的组件类型声明。Monorepo 根目录不接受 `--language`，各子应用独立选择。

## 2026-10-26：P3 检查修复

Vue/TDesign/UnoCSS 与 React/Ant Design/Tailwind 的 `vp build` 已由用户验证通过，旧版 `vp check` 因 `./starter.plugins` 的 TS2307 失败。新版将所选插件**直接写入 Vite 配置**，安装后只格式化本次修改文件，共享根策略在根目录单独格式化，不再新建 `starter.plugins.ts`。

已经生成并安装好插件的旧项目，在其上级目录运行以下命令修复，不重装依赖：

```powershell
node .\viteplus-starter\packages\create\bin\cli.mjs --name starter-vue-p3 --type application --framework vue --ui tdesign --css unocss --repair-existing
node .\viteplus-starter\packages\create\bin\cli.mjs --name starter-react-p3 --type application --framework react --ui antd --css tailwindcss --repair-existing
```

修复会将旧插件文件备份为 `starter.plugins.ts.bak`，且只格式化 `vite.config.ts`。分别在应用目录执行 `vp check` 和 `vp run build`，后者运行 package.json 的完整构建脚本，包含模板提供的类型检查。**两组旧项目已在 Windows 实机修复并通过构建及类型检查；Vue 首次需格式化自动生成的 `src/components.d.ts`。**

基于 **Vite+ 官方模板**的多框架项目初始化与可选功能集成工具。

> 当前状态：**Windows V1 本地候选、尚未发布**。Vue/React × TypeScript/JavaScript 四种官方模板、五种框架/UI、工作区与恢复、大屏、Three/Cesium/Babylon 和 GLB/.adui 模型保护均有代表验收证据；未穷举全部组合，不把生成计划当成真实构建。当前版本仍为 0.0.0/private，不自动发布。

## 通过 GitHub 下载使用

在项目父目录执行，任选一种写法：

```powershell
vp create github:adui-dev/viteplus-starter
# 或：vp create https://github.com/adui-dev/viteplus-starter
Set-Location -LiteralPath viteplus-starter
vp run create
```

GitHub 入口下载生成器工具仓库，不会直接执行其中的 CLI。下载后运行 vp run create，按提示选择框架、语言和预设；实际项目生成在工具仓库父目录，与工具目录并列。Vue/React 和 Monorepo 继续由官方模板创建，不需要发布 npm 包。参数和路径说明见 [远程使用](docs/REMOTE_CREATE.md)。

## 快速开始（开发者）

环境：Node.js `^22.18.0 || ^24.11.0 || >=26.0.0`、pnpm，以及可运行的 `vp` 命令。版本范围与当前锁定的 Vite+ 1.4.0 一致；Node 22 的最低版本是 22.18.0，复验方法见 [Harness](docs/HARNESS.md#node-22-最低版本复验)。

```powershell
git clone https://github.com/adui-dev/viteplus-starter.git
cd viteplus-starter
pnpm install --frozen-lockfile
node packages/create/bin/cli.mjs --help
$starterRoot = (Get-Location).Path
$starterCli = Join-Path $starterRoot 'packages\create\bin\cli.mjs'
# 项目在生成器仓库外创建；以下目标必须不存在
Set-Location ..
# 无参数交互选择名称、框架、语言、UI/CSS、大屏、引擎与确认
node $starterCli
node $starterCli --name demo-vue --type application --framework vue --dry-run
node $starterCli --name demo-vue --type application --framework vue
node $starterCli --name demo-react --type application --framework react
# UI 与 CSS 按需选择，生成后安装依赖并追加对应配置
node $starterCli --name demo-ui --type application --framework vue --ui tdesign --css unocss
```

当前 CLI 使用 Vite+ 内置 `vite:application` 或 `vite:monorepo`；Application 用 `--framework` 和 `--language` 映射到官方 `vue` / `vue-ts` / `react` / `react-ts` 模板。现已支持 UI 组件库选项（None / Element Plus / Ant Design / TDesign）和 CSS 框架（None / UnoCSS / Tailwind CSS）。React 不提供 Element Plus。选中依赖后由 pnpm 安装并生成 Vite 插件/样式入口；大屏首期已实现（见下文），Three.js 真实场景验收已实现；三种引擎与模型保护已接入，覆盖范围见对应指南。现在支持针对官方 `plugins: [...]`、`plugins: lazyPlugins(() => [...])` 和不包含 `plugins` 属性的 `defineConfig` 进行兼容配置注入。Vue 自动导入的 `src/components.d.ts` 保留类型声明，但会自动加入 Vite+ `fmt.ignorePatterns`，避免其重新生成造成格式漂移。其他组合仍需运行真实 check/build 验证；未知配置结构会明确报错而不强行修改。

在生成器仓库执行本地验证；生成项目的完整 build/ready 与页面验收另见 Windows 指南：

```powershell
Set-Location -LiteralPath $starterRoot
node --test
node scripts/validate-docs.mjs
node scripts/verify-examples.mjs
vp check
```

`vp check` 依赖本地可用的 Vite+ 工具链和已安装依赖。

## 能力范围

Application / Monorepo、Vue / React、Element Plus / Ant Design / TDesign、UnoCSS / Tailwind CSS、Three.js / CesiumJS / Babylon.js、大屏适配和模型安全加载。可选能力必须按应用独立集成。

## 已有工作区检查与恢复

在生成器仓库执行（路径按实际工作区调整）：

```powershell
node packages/create/bin/cli.mjs --inspect-workspace ../adui-batch-demo
node packages/create/bin/cli.mjs --plan-recovery ../adui-batch-demo --config examples/monorepo.batch.json
# 以下命令会安装依赖并新建缺失应用；先审阅计划
node packages/create/bin/cli.mjs --execute-recovery ../adui-batch-demo --config examples/monorepo.batch.json
```

检查和规划只读；显式执行仅新建缺失应用，已有应用跳过，部分完成应用需要人工处理。详见 [工作区操作](docs/MONOREPO.md)。入口选择、完整验证步骤和未覆盖范围集中在 [V1 验收清单](docs/V1_ACCEPTANCE.md)，JSON 用法见 [示例索引](examples/README.md)。

## 工程文档

- [开发协作规范](AGENTS.md)
- [需求与验收](docs/REQUIREMENTS.md)
- [架构](docs/ARCHITECTURE.md)
- [详细设计](docs/SDD.md)
- [状态](docs/PROJECT_CONTEXT.md)
- [代码索引](docs/CODEBASE_MAP.md)
- [Skills 索引](docs/SKILLS.md)
- [本地验证 Harness](docs/HARNESS.md)
- [Windows V1 操作指南](docs/WINDOWS_GUIDE.md)

本仓库明确**不创建或维护任何 CI/CD 工作流**。本地测试不等于 CI。

许可证：[MIT](LICENSE)。

## 大屏适配

已提供分层大屏插件和 --screen 预设，支持 Vue/React、TS/JS、已有项目补装与 Monorepo 应用配置。独立验收页不修改正式首页，详见 [使用与迁移](docs/SCREEN.md)。Three/Cesium/Babylon 最小场景已接入，三种引擎均支持模型保护，详见对应指南。

## Three.js 真实场景

已有大屏应用可单独运行 --three-smoke，验证真实 WebGL、DPR、拾取、全屏与卸载清理，保留正式首页。详见 [Three.js 验收](docs/THREE_SMOKE.md)。已支持 --engine three 和逐应用 JSON engine 字段；Cesium/Babylon 与模型保护的覆盖范围见各指南。

## 本地 GLB

Three 验收页现支持选择自包含 GLB、清除与重新加载；已使用 DamagedHelmet 验证。加载器按需导入，测试模型不打包进仓库。接口与边界见 [GLB 加载说明](docs/THREE_SMOKE.md)；模型授权及加解密见下文。

模型现支持 AES-256-GCM `.adui` 封装和浏览器授权解密，操作与边界见 [模型加密](docs/MODEL_SECURITY.md)。默认模型自动打包无需服务端；外部授权回调可按业务需要接入。

支持无服务端的模型自动加密构建：`.env` 配置、GLB 扫描、`.adui` 输出、密钥拆分与可选域名限制。默认自动加载，以提高直接复用门槛为目标，见 [模型自动打包](docs/MODEL_BUILD.md)。

创建 Three/Babylon/Cesium 项目时现默认启用模型保护，可用 `--model-protection embedded|external|none` 选择；交互创建和批量 JSON 同步支持。生成项目提供 `models:keygen` / `models:keyrotate` 脚本，IV 按模型自动生成。见 [模型构建指南](docs/MODEL_BUILD.md) 和 [五应用示例](examples/models.batch.json)。

多引擎用 --engines three,cesium,babylon，CLI/JSON 用法与限制见 [说明](docs/MULTI_ENGINE.md)。
