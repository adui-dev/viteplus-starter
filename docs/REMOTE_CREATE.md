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

请进入自己选择的下载根目录，确认其中有 scripts/create.mjs。Windows 的 Vite+ 1.4.0 实测中，简写地址下载后把安装目录识别成了 packages/cesium，终端的 Next 提示也指向该子目录；此时仍应进入工具根目录运行 vp run create。根目录可能提示未安装本地 vite-plus，已验证帮助和实际创建可以通过全局 vp 正常执行；不要在 packages/cesium 内运行创建任务。需要开发或检查工具源码时，再在工具根目录执行 vp install。

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

本地已验证参数/退出码转发、中文空格及元字符目录、任意调用 cwd、帮助/预览和 Windows TTY 取消无写入。

截至 2026-11-02，已从推送后的 9233cdc 实际下载并完成以下 Windows 验证，环境为托管 Node 22.18.0、pnpm 12.16.1、Vite+ 1.4.0。两副本的 scripts/create.mjs 与原 CLI SHA256 均和源仓库一致；官方后处理会增量配置工具副本，不将整个目录称为原仓库字节副本。

| 来源                                         | 工具目录（D:/Workspace/adui-studio 下） | 实际结果                                                                                                         |
| -------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| github:adui-dev/viteplus-starter             | adui-remote-shorthand-20261030          | 下载/安装退出 0；在根通过全局 vp 运行帮助，并成功创建旁边的 Vue TS 应用                                          |
| https://github.com/adui-dev/viteplus-starter | adui-remote-url-20261102                | 下载/根安装退出 0；React JS 预览、实际创建、检查和构建通过；TTY 选择 Monorepo 后取消退出 0，两处均未生成取消目标 |

为避免覆盖已有工具，实测用以下非交互参数指定两个全新目录，均从工具父目录运行；普通使用仍可按上面的交互命令操作：

```powershell
vp create github:adui-dev/viteplus-starter --no-interactive --no-agent --no-editor --package-manager pnpm -- adui-remote-shorthand-20261030
vp create https://github.com/adui-dev/viteplus-starter --no-interactive --no-agent --no-editor --package-manager pnpm -- adui-remote-url-20261102
```

在简写地址副本根执行 vp run create --name adui-remote-vue-ts-20261102 --type application --framework vue，官方 vue-ts 创建退出 0。应用位于 D:/Workspace/adui-studio/adui-remote-vue-ts-20261102，未嵌入工具工作区。正式入口首条导入为本地 normalize.css，其 SHA256 与仓库静态文件一致；应用 vp check 的 16 个格式文件、5 个代码文件通过，vp run build 的 vue-tsc -b 与首页构建 2/2 成功，产物保留。构建有插件耗时提示，不影响退出状态。

随后在完整 URL 副本根执行以下命令，官方 react 模板创建退出 0：

```powershell
vp run create --name adui-remote-react-js-20261102 --type application --framework react --language js
Set-Location -LiteralPath ../adui-remote-react-js-20261102
vp check
vp run build
```

React JS 应用与工具并列，UI/CSS none，main.jsx 首条导入本地 normalize.css；CSS 与 MIT 许可文件的 SHA256 均与仓库快照一致，未安装 normalize.css npm 包。应用 check 的 11 个格式文件、3 个代码文件通过，完整 build 脚本执行 vp build 成功并保留 dist。再次从工具根运行相同创建命令，任务未使用缓存，CLI 因目录存在退出 1；前后 20 项 Git 可见文件的内容 SHA256 与修改时间一致。工具启动器 SHA256 与源仓库仍一致。

生成器全量串行回归 254/254（无跳过）；此前默认并行回归中一个真实 CLI 用例触发 10 秒超时，串行复跑未复现，未修改测试超时或忽略失败。本轮 React 补验同样串行全量通过。远程入口尚未实际新建 Monorepo，未新增浏览器验收，不扩大为全部框架/语言或预设验证。后续证据见 [项目状态](PROJECT_CONTEXT.md)。

官方说明：[创建项目](https://viteplus.dev/guide/create)。仓库仍为 private/0.0.0，不执行 npm/Release 发布或新增 CI/CD。
