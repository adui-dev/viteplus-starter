# GitHub 远程下载与生成入口

Vite+ 支持 github:user/repo 和 https://github.com/user/repo。当前 1.4.0 通过下载仓库创建目录，再做安装/配置，不会执行仓库 package.json 的 bin。此仓库按官方流程分发工具，下载后显式启动原 CLI，不在安装生命周期自动创建项目。

## 使用

在已有工作区之外的项目父目录运行，两种命令任选其一：

```powershell
vp create github:adui-dev/viteplus-starter
# 或：vp create https://github.com/adui-dev/viteplus-starter
Set-Location -LiteralPath viteplus-starter
vp run create
```

Vite+ 会提示下载目录，上例假设使用默认 viteplus-starter。已有同名目录时选择不存在的新目录，随后进入实际下载目录。远程命令先取得工具，第二步才选择项目配置。

远程下载不等于 git clone，不能假定下载目录配置了 origin 或可直接 git pull。更新工具时下载到另一个新目录并核对版本，避免覆盖已有工具或项目；Windows 指南中的 git pull 仅用于已有远程的克隆仓库。

例如工具在 D:/Workspace/adui-studio/viteplus-starter，demo-vue 会生成到 D:/Workspace/adui-studio/demo-vue。启动器从自身位置定位工具，不依赖下载目录名称；创建 cwd 固定为工具父目录，避免嵌入生成器自己的 pnpm 工作区。创建任务不缓存。

## 参数模式

```powershell
vp run create --help
vp run create --name demo-vue --type application --framework vue --ui tdesign --css unocss --dry-run
vp run create --name demo-vue --type application --framework vue --ui tdesign --css unocss
vp run create --name demo-react --type application --framework react --language js --ui antd --css tailwindcss
```

任务名后直接写 CLI 参数。--workspace、--config 等相对路径按工具父目录解释，建议使用绝对路径：

```powershell
$starterRoot = (Get-Location).Path
$batchConfig = Join-Path $starterRoot 'examples\monorepo.batch.json'
vp run create --config $batchConfig --dry-run
```

原 node packages/create/bin/cli.mjs 入口保持原 cwd。新入口复用官方 Application/Monorepo 模板和已有文件保护；完整检查、构建及限制见 [Windows 指南](WINDOWS_GUIDE.md)。

## 验证范围

本地已验证参数/退出码转发、中文空格及元字符目录、任意调用 cwd、帮助/预览和 Windows TTY 取消无写入。两种 GitHub 下载命令需在入口推送后实测，当前不将本地启动验证称为远程下载成功。后续证据见 [项目状态](PROJECT_CONTEXT.md)。

官方说明：[创建项目](https://viteplus.dev/guide/create)。仓库仍为 private/0.0.0，不执行 npm/Release 发布或新增 CI/CD。
