# ADui Vite+ Starter CLI

新建应用默认将所选 UI、大屏和引擎接入正式 main/App，运行时插件位于 src/plugins，Node 构建插件位于 build/plugins。默认不保留独立 smoke 页面与创建中间备份；新建时添加 --smoke-pages 可保留独立验收页，批量 JSON 对应应用的 smokePages: true。已有工程不会自动迁移或替换首页。

本地验收包提供 `viteplus-starter` 命令。无参数运行可选择项目名称、Application/Monorepo、Vue/React、TS/JS、UI、CSS、大屏、3D 引擎和模型保护；完整基础参数调用按参数模式执行，其他选项采用默认值。

与 Vite+ 使用相同的官方提示组件：方向键选择、回车确认，3D 引擎用空格勾选后回车，不选则不启用；项目名称直接输入。确认页选择 No 或任意步骤按 Ctrl+C 可取消。首次启动由包管理器安装包清单声明的提示组件依赖。

要求 Windows、已安装的 Vite+ `vp` 命令，以及 Node `^22.18.0 || ^24.11.0 || >=26.0.0`。创建应用时仍由 Vite+ 官方 `vite:application` / `vite:monorepo` 提供基础工程，所选 UI/引擎依赖在目标应用安装。

从希望存放新项目的父目录运行命令。无参数进入向导，`--help` 查看参数，`--dry-run` 只输出计划；目标以当前调用目录计算，不使用安装包所在目录。

```powershell
viteplus-starter
viteplus-starter --help
viteplus-starter --name my-vue-app --type application --framework vue --ui element-plus --css tailwindcss --screen --dry-run
```

尚未发布到 npm。仓库开发者在生成器根目录运行 `npm --silent run cli:pack`，获得包含 `tarball` 绝对路径的 JSON；使用本地包启动：

```powershell
vp dlx -- 'C:\path\to\viteplus-starter-create-0.0.0.tgz'
# 或
npm exec --yes --package 'C:\path\to\viteplus-starter-create-0.0.0.tgz' -- viteplus-starter
```

该包包含所需生成器和预设源码，不需要先下载整个工具仓库。GitHub 模板下载方式仍须进入下载根目录执行 `vp run create`；它与此 CLI 包入口是两条使用路径。
