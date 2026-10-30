# Windows V1 操作指南

本指南用于当前仓库的本地使用：新建官方项目、添加应用、生成独立验收页和处理缺失应用。当前是 Windows 本地候选交付，仓库版本仍为 0.0.0/private，未发布 npm/Release。已验证范围与剩余限制见 [V1 清单](V1_ACCEPTANCE.md)，历史实测见 [项目状态](PROJECT_CONTEXT.md)。

## 准备生成器

需要 Git、pnpm、可运行的 Vite+ `vp`，Node 范围为 `^22.18.0 || ^24.11.0 || >=26.0.0`。Node 22 最低为 22.18.0；指定该运行时并核对子进程的方法见 [Harness](HARNESS.md#node-22-最低版本复验)。

以下假设仓库位于 D:/Workspace/adui-studio/viteplus-starter。在 PowerShell 中设置路径变量，后续在同一终端使用：

```powershell
$starterRoot = 'D:\Workspace\adui-studio\viteplus-starter'
$starterCli = Join-Path $starterRoot 'packages\create\bin\cli.mjs'
$projectsRoot = Split-Path $starterRoot -Parent
Set-Location -LiteralPath $starterRoot
git pull --ff-only
pnpm install --frozen-lockfile
node $starterCli --help
node --test
node scripts/validate-docs.mjs
vp check
```

逐条确认命令退出码；前一步失败先处理原因。已有未提交修改时先查看 git status，不覆盖用户修改。不要用依赖升级代替冻结安装。父目录可以含中文和空格，项目及应用 name 仍须用安全的小写 kebab-case。

## 新建单应用

先切换到生成器仓库外；下面每个目标目录必须不存在。Vue 默认 TypeScript，React 示例显式选择 JavaScript：

```powershell
Set-Location -LiteralPath $projectsRoot
node $starterCli --name my-vue-app --type application --framework vue --ui tdesign --css unocss --dry-run
node $starterCli --name my-vue-app --type application --framework vue --ui tdesign --css unocss
node $starterCli --name my-react-app --type application --framework react --language js --ui antd --css tailwindcss
```

Vue/React 委托官方 vite:application，按框架与语言选择 vue/vue-ts/react/react-ts。预览不安装依赖或写入目标，成功也不能代替实际创建。

Vue 可选 Element Plus、Ant Design Vue、TDesign；React 可选 Ant Design、TDesign。CLI 值分别为 element-plus/antd/tdesign，均可选 none；CSS 为 none/unocss/tailwindcss。进入每个生成应用，执行完整脚本：

```powershell
Set-Location -LiteralPath (Join-Path $projectsRoot 'my-vue-app')
vp run build
vp check
vp dev
```

React 应用在自己的目录执行同样步骤。TS 应用的完整 build 包含类型检查，单独 vp build 不代表该检查已执行。运行页面地址以终端显示为准，结束开发服务使用 Ctrl+C。

## 为已有 UI 应用添加验收页

先结束开发服务，返回项目父目录。参数须与已创建应用一致，单独调用 --ui-smoke：

```powershell
Set-Location -LiteralPath $projectsRoot
node $starterCli --name my-vue-app --type application --framework vue --ui tdesign --css unocss --ui-smoke
node $starterCli --name my-react-app --type application --framework react --language js --ui antd --css tailwindcss --ui-smoke
```

它只添加 ui-smoke.html 与 src/ui-smoke，不安装依赖或替换正式 App/main；已有同名文件拒绝覆盖。该模式不能与 dry-run、apply-existing、repair-existing 混用，也不重复传 screen/engine/engines。在应用目录运行 vp dev，访问 /ui-smoke.html，检查真实按钮、点击 0→1、CSS 区域和控制台；详见 [UI Smoke](UI_SMOKE.md)。

默认生产构建只包含正式首页。若需验证独立 UI 页，结束开发服务后，在生成器仓库运行专项构建，再在应用中运行 check：

```powershell
Set-Location -LiteralPath $starterRoot
node scripts/verify-ui-build.mjs (Join-Path $projectsRoot 'my-vue-app') /ui-check/
node scripts/verify-ui-build.mjs (Join-Path $projectsRoot 'my-react-app') ./
```

专项产物保留在应用的 dist/ui-verify，临时配置自动移除。普通 build 会清理 dist，不要把同一工作区的专项构建与其他检查/构建并行执行。

## 新建 Monorepo 或添加应用

批量模式使用 [monorepo.batch.json](../examples/monorepo.batch.json)，输出为当前目录下的 adui-batch-demo；目标必须不存在，不在已有工作区内嵌套创建：

```powershell
$batchConfig = Join-Path $starterRoot 'examples\monorepo.batch.json'
Set-Location -LiteralPath $projectsRoot
node $starterCli --config $batchConfig --dry-run
node $starterCli --config $batchConfig
$workspacePath = Join-Path $projectsRoot 'adui-batch-demo'
Set-Location -LiteralPath $workspacePath
vp run --no-cache ready
vp check
```

根委托官方 vite:monorepo，不指定语言；默认 website/utils 保留，admin 为 Vue TS/TDesign/UnoCSS，portal 为 React JS/Ant Design/Tailwind，各有 UI 页。run 的选项应放在任务名之前。更多逐应用配置见 [示例索引](../examples/README.md)。

向已有官方工作区添加不存在的应用，可从父目录执行：

```powershell
Set-Location -LiteralPath $projectsRoot
node $starterCli --workspace $workspacePath --name reports --type application --framework vue --language js --dry-run
node $starterCli --workspace $workspacePath --name reports --type application --framework vue --language js
```

应用位于 apps/reports；UI/CSS/引擎按应用选择，根锁文件/catalog 可随安装更新。当前支持官方 pnpm `apps/*`、`packages/*`、`tools/*` 布局，细节见 [Monorepo](MONOREPO.md) 与 [批量配置](BATCH_CONFIG.md)。

## 检查和恢复已有工作区

预期 JSON 应包含希望对照的全部应用；如需 reports 也参与对照，将原 JSON 复制到自己保存的配置文件，在副本追加应用，并把 $batchConfig 指向该副本，不直接修改仓库示例。inspect 缺失或阻塞时退出 1，代表需要处理现场。先检查、再审阅计划：

```powershell
node $starterCli --inspect-workspace $workspacePath --config $batchConfig
node $starterCli --plan-recovery $workspacePath --config $batchConfig
```

| 计划结果          | 后续操作                                           |
| ----------------- | -------------------------------------------------- |
| validate-existing | 已有结构，仅建议自行运行 check/build；不会重新集成 |
| create-missing    | 目标不存在且预检通过，可显式新建                   |
| manual-review     | 根或应用冲突、部分完成，先人工核对，无覆盖式重试   |

确定需要补齐缺失应用时，独立运行下面命令。它使用原配置重新检查，并调用原 CLI/官方模板；不会执行保存的计划或 PowerShell 展示文本：

```powershell
node $starterCli --execute-recovery $workspacePath --config $batchConfig
```

已有应用跳过；部分完成应用阻塞，任一步失败即停并保留现场。重复执行完整配置应 completed=[]，应用列入 skipped。结构通过与子进程成功不代替完整 ready/build 或浏览器验收。不要为重试删除未知文件。

--apply-existing 只用于确认相应预设尚未写入的已有官方应用；--repair-existing 只修已知旧 starter.plugins 引用。二者都不是通用恢复入口，详见 [Harness](HARNESS.md)。

## 按需启用大屏、引擎和模型保护

下面是另一种独立新建选择，目标 my-three-app 须不存在：

```powershell
Set-Location -LiteralPath $projectsRoot
node $starterCli --name my-three-app --type application --framework vue --screen --engine three --model-protection embedded --dry-run
node $starterCli --name my-three-app --type application --framework vue --screen --engine three --model-protection embedded
```

其他引擎选择 cesium/babylon，多引擎使用 --engines；新建引擎应用须同时 --screen。大屏、引擎及模型页都为独立验收入口，正式首页保持官方模板。具体页面、业务加载 API 与专项构建分别见 [大屏](SCREEN.md)、[Three](THREE_SMOKE.md)、[Cesium](CESIUM.md)、[Babylon](BABYLON.md)、[多引擎](MULTI_ENGINE.md)。

三引擎默认启用 embedded：新建时生成项目独立的 .env.local 与 KEY，GLB 放入 src/models；vp dev 访问 /model-smoke.html，构建自动输出 .adui。仅支持 32 MiB 内自包含 GLB。首次自动生成 KEY 后无需再运行生成脚本；KEY 缺失才使用 models:keygen，轮换使用 models:keyrotate，命令在应用目录执行：

```powershell
Set-Location -LiteralPath (Join-Path $projectsRoot 'my-three-app')
```

| 场景     | 命令                    | 行为                            |
| -------- | ----------------------- | ------------------------------- |
| KEY 缺失 | vp run models:keygen    | 生成 KEY；已有 KEY 则拒绝覆盖   |
| 需要轮换 | vp run models:keyrotate | 备份原 env 并轮换，保留其他配置 |

IV 按每个模型独立生成；不配置固定共享 IV。轮换后重新构建并使用配套 JS/.adui。embedded 提高直接复用成本，客户端密钥仍可逆向；external 需要网站文件之外的解锁来源，none 关闭保护。密钥、备份及原模型不作为本仓库交付物；详见 [模型构建指南](MODEL_BUILD.md)。

## 当前交付边界

当前仅验收 Windows；Vue/React 四种模板、五种框架/UI、大屏、三引擎、模型保护、工作区及恢复均有代表证据，未穷举全部组合。462 个组合计划、8 个 JSON/20 个应用预览均不是真实构建计数。完整证据、已知提示和未实现范围以 [V1 清单](V1_ACCEPTANCE.md) 为准。

本阶段不包含其他系统、自定义工作区布局、覆盖式恢复、FBX/OBJ 与压缩解码器，也不创建 CI/CD、自动部署或自动发布。后续按真实 Windows 项目的使用反馈修复生成器；发布 npm/Release 需另行授权。
