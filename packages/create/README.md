# ADui Vite+ Starter

为 Vue、React 和 Monorepo 提供交互式项目创建与按需插件集成，基础工程由 Vite+ 官方模板生成。

包名：`@adui/viteplus-starter` · 命令：`viteplus-starter` · [源码与文档](https://github.com/adui-dev/viteplus-starter) · [问题反馈](https://github.com/adui-dev/viteplus-starter/issues)

> [!NOTE]
> 首发版本为 `0.1.0`，当前仍为 private 本地候选包，尚未发布到 npm。下文按包名安装的命令适用于正式发布后；当前请使用本地 tgz。

## 环境要求

Windows、可运行的 Vite+ `vp` 命令，以及 Node.js `^22.18.0 || ^24.11.0 || >=26.0.0`。首次启动和项目创建需要可用的依赖缓存或网络。

## 快速开始

### 安装 npm 包

全局安装后，在希望存放新项目的父目录启动配置向导：

```powershell
npm install --global @adui/viteplus-starter
viteplus-starter
```

如果安装为当前项目的开发依赖，使用本地命令：

```powershell
npm install --save-dev @adui/viteplus-starter
npm exec -- viteplus-starter
```

也可免全局安装运行：

```powershell
npm exec --yes --package @adui/viteplus-starter -- viteplus-starter
# 或使用 Vite+
vp dlx @adui/viteplus-starter
```

包名为 `@adui/viteplus-starter`，命令名为 `viteplus-starter`。这是项目生成工具，无需在 Vue/React 业务代码中 import。

### 使用本地 tgz

从希望存放新项目的父目录运行，将路径替换为实际收到的 tgz：

```powershell
vp dlx -- 'C:\Downloads\adui-viteplus-starter-0.1.0.tgz'
```

也可使用 npm：

```powershell
npm exec --yes --package 'C:\Downloads\adui-viteplus-starter-0.1.0.tgz' -- viteplus-starter
```

无参数进入向导：选择项目形态、Vue/React、TS/JS、UI、CSS、大屏、3D 引擎与模型保护。方向键移动，回车确认；引擎用空格多选，Ctrl+C 取消。项目生成在当前调用目录下，不使用 CLI 安装目录。

例如在向导中创建了 `my-app`，完成后执行：

```powershell
Set-Location -LiteralPath .\my-app
vp check
vp run build
vp dev
```

生成应用的日常开发继续使用 `vp`；Monorepo 在根目录运行 `vp run ready`。

## 参数用法

```powershell
# 全局安装后
viteplus-starter --help
viteplus-starter --name my-vue-app --type application --framework vue --ui element-plus --css tailwindcss --screen --dry-run
# 去掉 --dry-run 即实际创建项目
viteplus-starter --name my-vue-app --type application --framework vue --ui element-plus --css tailwindcss --screen
```

免全局安装或本地 tgz 方式，将同样的参数追加到命令末尾：

```powershell
npm exec --yes --package @adui/viteplus-starter -- viteplus-starter --help
vp dlx -- 'C:\Downloads\adui-viteplus-starter-0.1.0.tgz' --help
```

`--dry-run` 只输出计划；去掉后创建项目。项目名使用小写字母、数字和中划线，以字母开头；目标目录须不存在。

| 选项                     | 可用值或用途                                                      |
| ------------------------ | ----------------------------------------------------------------- |
| `--type`                 | `application` / `monorepo`                                        |
| `--framework`            | 应用选择 `vue` / `react`                                          |
| `--language`             | `ts` / `js`，默认 TypeScript                                      |
| `--ui`                   | `none` / `element-plus` / `antd` / `tdesign`；Element Plus 仅 Vue |
| `--css`                  | `none` / `unocss` / `tailwindcss`                                 |
| `--screen`               | 启用 AdScreen 大屏适配                                            |
| `--engine` / `--engines` | 单个引擎，或逗号分隔的 `three,cesium,babylon` 多选；两个选项互斥  |
| `--model-protection`     | `embedded` / `external` / `none`，选择引擎后默认 `embedded`       |
| `--workspace`            | 在已有官方工作区中添加应用                                        |
| `--config`               | 使用严格 JSON 批量创建工作区                                      |
| `--apply-existing`       | 为已有匹配框架、语言的应用增量补装                                |
| `--smoke-pages`          | 额外保留本次预设独立验收页                                        |

Monorepo 根不指定框架、语言或插件，各应用独立配置。更多参数以 `--help` 为准。

## 生成结果

- 新建应用将 UI、大屏与引擎运行时集中到 `src/plugins`，构建增强集中到 `build/plugins`，并接入正式 main/App；引擎按需启动。
- 所有 Vue/React TS/JS 应用默认导入本地静态 normalize.css，不安装 normalize.css npm 包。
- 默认不保留独立预设验收页与创建中间备份；可用 `--smoke-pages` 额外保留页面。
- 已有应用补装仅归档本次新增插件，保留业务首页、自定义注册逻辑与配置原件备份；样式按已知规则增量导入，历史插件不自动搬迁。
- 模型保护将自包含 GLB 转为 `.adui`，提供 KEY 生成与轮换脚本；客户端内置密钥用于提高直接复用门槛，不保证无法逆向提取。

## 文档

[使用指南](https://github.com/adui-dev/viteplus-starter/blob/main/docs/WINDOWS_GUIDE.md) · [项目结构与补装接入](https://github.com/adui-dev/viteplus-starter/blob/main/docs/PROJECT_LAYOUT.md) · [批量配置](https://github.com/adui-dev/viteplus-starter/blob/main/docs/BATCH_CONFIG.md) · [模型构建](https://github.com/adui-dev/viteplus-starter/blob/main/docs/MODEL_BUILD.md) · [验收范围](https://github.com/adui-dev/viteplus-starter/blob/main/docs/V1_ACCEPTANCE.md)

## 从源码打包

在生成器仓库根目录安装依赖后运行：

```powershell
$bundle = npm --silent run cli:pack | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'CLI 打包失败' }
$bundle.tarball
```

打包结果提供 tgz 绝对路径与独立内容清单。该包包含生成器和预设源码、MIT LICENSE 与 normalize.css 原许可。源码更新后须重新打包；GitHub 下载模式则在工具目录运行 `vp run create`。详见 [CLI 分发说明](https://github.com/adui-dev/viteplus-starter/blob/main/docs/CLI_DISTRIBUTION.md)。
