# CLI 本地打包与直接启动

GitHub 来源的 `vp create github:adui-dev/viteplus-starter` 下载工具仓库，再由 `vp run create` 启动向导。要直接进入 UI/CSS、大屏和引擎选择，使用本地 CLI 安装包入口。

当前包为 `@viteplus-starter/create@0.0.0`，命令名 `viteplus-starter`，仍为 private，尚未发布到 npm/Release。无需为分发入口新建仓库或重写生成器。运行环境为 Windows、已安装的 `vp` 和受支持 Node；基础工程仍委托 Vite+ 官方模板。

## 构建本地包

在生成器仓库根目录执行：

```powershell
$bundle = npm --silent run cli:pack | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'CLI 打包失败' }
$bundle.tarball
```

脚本将运行时暂存到独立临时目录，保留 `packages/create`、screen、three、cesium、babylon、model-security 的源码相对布局，使用 npm pack 生成 `dist/cli/pack-*/viteplus-starter-create-0.0.0.tgz`。每次使用新产物目录，不覆盖旧包；暂存目录成功或失败均清理。JSON 包含绝对路径、文件数量和 npm integrity。

请使用 npm 运行打包脚本，由 npm 提供自身的 JS 入口；执行不经 shell 拼接、不运行包生命周期脚本、不安装依赖。生成包只有运行时源码、本地 normalize.css/MIT 许可和说明，没有仓库测试、node_modules、锁文件、环境密钥或测试模型，也没有安装生命周期脚本。

## 一条命令进入向导

切换到希望存放新项目的父目录，再使用包路径运行：

```powershell
Set-Location ..
vp dlx -- $bundle.tarball
```

若把 tgz 交给另一台已安装 Vite+ 的 Windows 电脑，也可以直接运行：

```powershell
vp dlx -- 'C:\Downloads\viteplus-starter-create-0.0.0.tgz'
```

不需要先下载生成器仓库。无参数进入已有向导，选择项目类型、Vue/React、TS/JS、UI、CSS、大屏、引擎和模型保护，确认后创建；最后选择 n 则取消。目标位置依据调用目录，和 dlx 缓存或包安装目录无关。

帮助和预览参数直接跟在包路径后；`dlx --` 将后面的帮助等参数交给包：

```powershell
vp dlx -- $bundle.tarball --help
vp dlx -- $bundle.tarball --name demo-vue --type application --framework vue --ui element-plus --css tailwindcss --screen --dry-run
```

也可通过 npm 运行同一个包：

```powershell
npm exec --yes --package $bundle.tarball -- viteplus-starter
```

参数模式和 GitHub 下载后的 CLI 使用同一套校验、官方模板与集成流程；创建时仍需取得官方模板及所选依赖。dry-run、取消向导和安装 CLI 本身不代表项目构建或组件渲染已通过。

## 本地验收

自动回归覆盖暂存资源、隔离包的 Vue/React 多引擎与 JSON 批量预览、中文空格及元字符目录、调用目录计算、已有输出/junction 拒绝、打包调用上下文错误。真实 tgz 安装、vp dlx、TTY 选择/取消和代表创建结果见 [项目状态](PROJECT_CONTEXT.md)。

后续正式 npm 包名、版本及首次发布需单独确定；本入口不会自动发布或创建流水线。

## 2026-11-02 本地包实测

- Node 22.18.0、npm 10.9.3、Vite+ 1.4.0 下打包包含 85 个文件。独立临时前缀离线安装只添加 CLI 包；安装后的 Windows cmd shim 帮助正常，npm exec 使用新离线缓存完成 React JS/Ant Design/UnoCSS/三引擎预览，目标位于中文、空格及 & 调用目录，未创建目标。
- 实际安装命令的 Vue TS/Element Plus/Tailwind/大屏/三引擎/embedded 完整选择，以及 vp dlx 的 React JS/Ant Design/UnoCSS/大屏/Three+Babylon/external 完整选择均到达确认提示；两次选择 n，退出 0、无目标生成。
- 从同一本地 tgz 经 vp dlx 新建临时官方 Vue TS 应用，安装 Element Plus 2.14.7、Tailwind 4.3.3 并生成 AdScreen；该应用由官方选择 pnpm 11.22.0。安装期间一次 lodash registry 超时后由包管理器重试完成，未更改 registry 或依赖策略；官方前置的非 Vite+ 目录提示保留，不视为生成器失败。
- 应用首次 check 为 29 格式/14 代码文件通过，完整 build 的 vue-tsc -b 与首页构建 2/2 成功。再由 tgz 的同一入口生成 UI Smoke，使用 /ui-check/ 首页+UI 双入口构建通过；最终 check 为 32 格式/17 代码文件、无 lint/类型警告错误。normalize.css 保持正式入口首条导入。未执行浏览器渲染或独立大屏生产入口构建，不扩大为所有预设已实测。
- 临时安装目录、两份 npm 验证缓存、实际应用及产物全部清理，CLI tgz 作为交付产物保留在仓库忽略目录；包管理器自己的全局 dlx 缓存保持默认行为。用户下载的 test-starter 和其他工程未改动。生成器回归与提交状态见 [项目状态](PROJECT_CONTEXT.md)。
