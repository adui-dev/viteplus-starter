# ADui Vite+ Starter

基于 Vite+ 官方模板的交互式项目生成器，为 Vue、React 和 Monorepo 按需集成 UI、CSS、大屏适配、3D 引擎与模型保护。

[快速开始](#快速开始) · [常用操作](#常用操作) · [项目结构](#项目结构) · [文档](#文档) · [MIT](LICENSE)

> [!NOTE]
> 当前面向 Windows，CLI 包名为 `@adui/viteplus-starter`，首发版本为 `0.1.0`，尚未发布到 npm。现在可通过 GitHub 下载或本地 CLI 包使用。

## 功能

| 能力       | 支持范围                                                       |
| ---------- | -------------------------------------------------------------- |
| 项目形态   | 独立 Application、Monorepo、工作区逐应用添加、JSON 批量创建    |
| 框架与语言 | Vue 3 / React，TypeScript / JavaScript，默认 TypeScript        |
| Vue UI     | Element Plus、Ant Design Vue、TDesign，或不启用                |
| React UI   | Ant Design、TDesign，或不启用                                  |
| 样式       | UnoCSS、Tailwind CSS，或不启用；默认导入本地静态 normalize.css |
| 大屏适配   | AdScreen，支持 contain / cover / stretch / none 布局           |
| 3D 引擎    | Three.js、CesiumJS、Babylon.js，可按应用多选、按需加载         |
| 模型保护   | 自包含 GLB 自动加密为 `.adui`，支持内置或外置密钥模式          |
| 已有项目   | 增量补装、独立验收页、工作区检查与缺失应用恢复                 |

基础工程始终由 Vite+ 官方 `vite:application` / `vite:monorepo` 创建。UI、CSS 和引擎配置按应用独立管理，保留官方工具链与配置结构。

## 快速开始

### 环境要求

- Windows 和 PowerShell。
- Node.js `^22.18.0 || ^24.11.0 || >=26.0.0`。
- 已安装 Vite+，可运行 `vp`，并具有可用的 pnpm 环境。
- 创建项目时需要网络或完整的模板、依赖缓存。

### 安装 npm 包并使用

以下 npm 包名命令适用于正式发布后；当前未发布时，使用下文的 GitHub 或本地 tgz 入口。

全局安装后，在希望存放新项目的父目录运行命令，即可进入配置向导：

```powershell
npm install --global @adui/viteplus-starter
viteplus-starter
```

如果选择安装到当前项目的开发依赖，则通过 npm exec 调用本地命令：

```powershell
npm install --save-dev @adui/viteplus-starter
npm exec -- viteplus-starter
```

也可以免全局安装，直接运行：

```powershell
npm exec --yes --package @adui/viteplus-starter -- viteplus-starter
# 已使用 Vite+ 时也可运行
vp dlx @adui/viteplus-starter
```

全局安装后可直接传参数创建应用，或先用 `--dry-run` 查看计划：

```powershell
viteplus-starter --help
viteplus-starter --name my-vue-app --type application --framework vue --ui element-plus --css tailwindcss --dry-run
# 确认计划后去掉 --dry-run 创建
viteplus-starter --name my-vue-app --type application --framework vue --ui element-plus --css tailwindcss
Set-Location -LiteralPath .\my-vue-app
vp check
vp run build
vp dev
```

npm 包命令将项目生成在**当前调用目录**下。包名是 `@adui/viteplus-starter`，安装后的命令名是 `viteplus-starter`；它是项目生成工具，不需要在业务代码中 import。生成应用的日常开发继续使用 `vp`。

### 从 GitHub 下载并启动向导

在希望存放项目的父目录执行，目标 `viteplus-starter` 目录须不存在：

```powershell
vp create github:adui-dev/viteplus-starter
Set-Location -LiteralPath viteplus-starter
vp run create
```

也可将第一条命令替换为：

```powershell
vp create https://github.com/adui-dev/viteplus-starter
```

`vp create github:...` 下载的是生成器仓库；进入工具目录运行 `vp run create` 才会启动配置向导。新项目生成在工具仓库的父目录，与工具目录并列。

向导依次选择名称、项目形态、框架、语言、UI、CSS、大屏、引擎及模型保护。方向键移动，回车确认；引擎使用空格多选，Ctrl+C 取消。

创建完成后，进入实际应用目录：

```powershell
Set-Location -LiteralPath ..\my-app  # 替换为向导中填写的项目名
vp check
vp run build
vp dev
```

Monorepo 在工作区根运行 `vp run ready`；应用启动方式和入口详见 [Windows 操作指南](docs/WINDOWS_GUIDE.md)。

### 使用本地 CLI 包

已有源码与依赖时，在生成器仓库根目录打包，再切换到项目父目录启动：

```powershell
$bundle = npm --silent run cli:pack | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'CLI 打包失败' }
Set-Location ..
vp dlx -- $bundle.tarball
```

得到的 tgz 包包含生成器及所需预设源码，可交给其他已安装 Vite+ 的 Windows 环境使用。包路径后的参数会传入 CLI，详见 [CLI 分发说明](docs/CLI_DISTRIBUTION.md)。

## 常用操作

以下命令在生成器根目录执行；`vp run create` 将目标解析到工具父目录。项目名使用小写字母、数字和中划线，以字母开头；新建目标目录须不存在，补装使用已有应用目录。

### 按参数创建应用

```powershell
# Vue + TypeScript + Element Plus + Tailwind CSS
vp run create --name my-vue-app --type application --framework vue --ui element-plus --css tailwindcss

# React + JavaScript + Ant Design + UnoCSS
vp run create --name my-react-app --type application --framework react --language js --ui antd --css unocss

# 大屏 + Three.js，默认启用模型自动加密加载
vp run create --name my-screen --type application --framework vue --screen --engine three
```

添加 `--dry-run` 可只查看计划，`--help` 查看全部参数。新建应用直接从正式 main/App 接入所选插件；默认不生成额外验收页，需要时添加 `--smoke-pages`。

### 创建 Monorepo 并添加应用

```powershell
vp run create --name my-workspace --type monorepo
vp run create --workspace ./my-workspace --name admin --type application --framework vue --ui tdesign --css unocss
vp run create --workspace ./my-workspace --name portal --type application --framework react --language js --ui antd --css tailwindcss
```

保留官方 `apps/website` 和 `packages/utils`，新增应用位于 `apps/<name>`。每个应用独立选择语言与插件，根不指定统一框架或语言。详见 [Monorepo 指南](docs/MONOREPO.md)。

### JSON 批量创建

```powershell
vp run create --config ./viteplus-starter/examples/monorepo.batch.json --dry-run
vp run create --config ./viteplus-starter/examples/monorepo.batch.json
```

此处配置路径相对于工具父目录，假设工具目录名为 `viteplus-starter`；重命名后须同步调整，也可传配置的绝对路径。示例创建 Vue TS 与 React JS 混合工作区。配置格式见 [批量配置](docs/BATCH_CONFIG.md) 和 [示例索引](examples/README.md)。

### 为已有应用补装

```powershell
vp run create --name existing-vue --type application --framework vue --ui element-plus --css tailwindcss --apply-existing
```

示例目标是工具父目录下的 `existing-vue`，须与已有应用的实际框架、语言一致。补装归档本次新增插件，保留业务 App、挂载逻辑和配置原件备份；UI/CSS 与基础样式按已知规则增量导入。已有插件不自动迁移，冲突时停止并保留现场。接入方式见 [项目结构说明](docs/PROJECT_LAYOUT.md)。

## 项目结构

新建应用按所选功能生成对应目录，下面以 Vue TypeScript 应用为例：

```text
src/
  plugins/          # UI、大屏和所选引擎运行时
  components/       # 页面组件与按需场景入口
  styles/           # 本地 normalize.css、许可与首页样式
  models/           # 启用模型保护时存放自包含 GLB
  App.vue           # 使用所选插件的正式首页
  main.ts           # 应用挂载、插件注册与样式入口
build/
  plugins/          # 模型加密、Cesium 资源等构建增强
```

React 使用对应的 `App.tsx` / `main.tsx`，JavaScript 项目使用 JS / JSX 入口。Vue 从 main 注册插件、在 App 使用组件；React 保留 createRoot，在 App 组合组件。引擎点击后才加载，多引擎安装不会同时启动多个渲染器。

normalize.css 使用随生成器携带的静态文件，不安装 npm 包，也不在运行时依赖远程 CSS。模型保护默认在构建时将 GLB 转为 `.adui`，生成项目提供 `models:keygen` / `models:keyrotate`；客户端内置密钥用于提高直接复用门槛，不保证无法逆向提取。详见 [模型构建指南](docs/MODEL_BUILD.md)。

## 文档

| 主题           | 入口                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 使用与配置     | [Windows 操作](docs/WINDOWS_GUIDE.md)、[项目结构](docs/PROJECT_LAYOUT.md)、[CLI 分发](docs/CLI_DISTRIBUTION.md)                                   |
| 工作区         | [Monorepo](docs/MONOREPO.md)、[JSON 批量配置](docs/BATCH_CONFIG.md)、[配置示例](examples/README.md)                                               |
| 大屏与引擎     | [AdScreen](docs/SCREEN.md)、[Three.js](docs/THREE_SMOKE.md)、[Cesium](docs/CESIUM.md)、[Babylon](docs/BABYLON.md)、[多引擎](docs/MULTI_ENGINE.md) |
| 模型与页面验收 | [模型构建](docs/MODEL_BUILD.md)、[模型加密](docs/MODEL_SECURITY.md)、[UI 验收](docs/UI_SMOKE.md)                                                  |
| 能力与边界     | [当前能力](docs/GENERATOR_STATUS.md)、[验收范围](docs/V1_ACCEPTANCE.md)、[首发准备](docs/NPM_RELEASE.md)                                          |
| 开发维护       | [协作规范](AGENTS.md)、[架构](docs/ARCHITECTURE.md)、[代码索引](docs/CODEBASE_MAP.md)、[本地验证](docs/HARNESS.md)                                |

当前验证覆盖 Windows 下的代表组合，完整构建、浏览器验收和未覆盖范围以验收文档为准。

## 本地开发

```powershell
git clone https://github.com/adui-dev/viteplus-starter.git
Set-Location -LiteralPath viteplus-starter
vp install --frozen-lockfile
node packages/create/bin/cli.mjs --help
node --test --test-concurrency=1
node scripts/validate-docs.mjs
vp check
```

直接运行 `node packages/create/bin/cli.mjs` 时，输出相对于当前调用目录；需要在仓库外创建应用时，使用前文的 `vp run create` 或切换目录后调用 CLI 绝对路径。
