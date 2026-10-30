# Monorepo 多应用（P4）

根工作区使用 Vite+ 官方 `vite:monorepo`；每个新增应用仍使用官方 `vite:application`。保留默认 `apps/website` 和 `packages/utils`，没有 CI/CD 配置。

需要一次新建多个应用时，使用 [JSON 批量配置](BATCH_CONFIG.md)；下面的 `--workspace` 继续用于向已有工作区逐个添加应用。

## 创建

在生成器仓库的上级目录执行，目标工作区名称必须尚不存在：

```powershell
node ./viteplus-starter/packages/create/bin/cli.mjs --name my-workspace --type monorepo
node ./viteplus-starter/packages/create/bin/cli.mjs --workspace ./my-workspace --name admin --type application --framework vue --ui tdesign --css unocss
node ./viteplus-starter/packages/create/bin/cli.mjs --workspace ./my-workspace --name portal --type application --framework react --language js --ui antd --css tailwindcss
```

得到 Vue TS 的 `apps/admin` 和 React JS 的 `apps/portal`；可分别指定 `--language ts|js`，默认 TS。UI/CSS 依赖和插件写入各自应用，根共享锁文件和 catalog 由官方流程及 pnpm 管理。Vue TS 自动生成声明的格式排除规则按应用路径合并到根配置。

每个新增 Vue/React 应用默认带本地 `src/styles/normalize.css` 与 MIT 许可，正式入口在 UI/CSS 及原应用样式之前导入；不安装 normalize.css npm 包。根目录、官方默认 website/utils 和既有兄弟应用不批量改写。向已有工作区添加应用时，不要并发执行创建、安装或构建。

生成器会对新应用 Vite 配置运行官方 lint 的定向修复。选用 Vue 自动导入或 UnoCSS 时，还会在根 `packageExtensions` 中补充相应包缺失的 Vite peer 声明，使插件类型解析到所在应用的 Vite 实例；这不会给根添加 UI/CSS 依赖，也不会更改各应用选择的语言版本。已有冲突的扩展配置会明确报错。

## 预览与检查

相同命令追加 `--dry-run` 可查看官方命令、执行 cwd、目标路径及依赖计划，不写文件。

```powershell
cd my-workspace
vp check
cd apps/admin
vp check
vp run build
vp dev
# 结束服务后，进入 ../portal 执行同样的检查和构建
```

使用 `vp run build` 执行官方应用的完整 build 脚本，包含模板提供的 vue-tsc/tsc 等前置检查；`vp build` 单独运行 Vite 构建。根默认 dev 脚本继续指向官方 website；请在需要的应用目录执行 `vp dev`。

Vue 的 Element Plus/Ant Design Vue/TDesign、React 的 Ant Design/TDesign 应用，还可在原生成命令追加 `--ui-smoke`（不要同时添加 dry-run 或 apply-existing），然后访问开发服务器的 `/ui-smoke.html`。独立验收页保持自身入口，不自动沿用正式 main 的 normalize 导入。见 [UI Smoke](UI_SMOKE.md)。

## 保护与限制

- 仅支持已有 private Vite+ pnpm 工作区，packages 使用官方块列表，包含 `apps/*`；列表仅允许 `apps/*`、`packages/*`、`tools/*`。自定义 glob、排除规则、YAML 合并键和其他包管理器明确拒绝，不自动改写。
- 根不指定 framework/language/UI/CSS；每个应用独立指定。`--workspace` 为逐应用命令，批量新建使用独立的 `--config` 入口。
- 应用名只允许安全的小写 kebab-case；已有目标或同名包拒绝创建，拒绝 apps/目标/关键根文件的符号链接或 junction。
- `--workspace` 与 `--repair-existing` 不兼容；首次增强失败可检查现场后显式 `--apply-existing`，同名增强文件仍会拒绝覆盖。
- 失败保留现场，不自动删除或回滚安装；不要并发操作同一个工作区。

## 本轮验证

2026-10-27，当前 CLI 完整生成 `D:\Workspace\adui-studio\adui-p4-final-20261027`：官方默认 website/utils 保留，新增 Vue TS/TDesign/UnoCSS 的 `apps/vue-admin`、React JS/Ant Design/Tailwind 的 `apps/react-portal`。

- 根 `vp run ready` 通过：根检查、utils 1 项测试、四个包完整构建，共 8 项任务全部成功；官方 utils 构建提示 TypeScript 7 API 实验性警告，未修改模板依赖版本。
- 构建后再运行根 `vp check` 通过：46 文件格式正确、19 文件无警告或 lint/type 错误，自动生成声明的格式排除生效。
- Chrome 两页面按钮显示正确、点击计数 0→1、CSS 颜色/圆角/内边距生效，控制台无 warn/error。
- 根无 UI/CSS 直接依赖，应用配置隔离；71 项生成器单元测试、文档校验和定向 lint 通过。生成器仓库本身的根 `vp check` 仍受全仓格式问题阻塞，详见项目状态记录。

尚未穷举 Vue/React × TS/JS × 全部 UI/CSS；通过上述代表组合不等于所有组合均已验收。

## 只读状态检查与恢复前预检

在生成器仓库执行：

```powershell
# 查看已有官方 pnpm 工作区的成员和基础问题
node packages/create/bin/cli.mjs --inspect-workspace D:/Workspace/adui-studio/adui-cesium-workspace
# 使用原批量配置描述预期应用，不重新创建根目录
node packages/create/bin/cli.mjs --inspect-workspace D:/Workspace/adui-studio/adui-cesium-workspace --config ./expected-apps.json
```

仅支持当前官方 apps/_、packages/_、tools/* 布局。检查根 private/Vite+ 声明、YAML 列表、apps 目录和唯一根 Vite 配置；枚举成员清单及重复包名。带 --config 时按原批量 JSON 的校验规则检查预期应用的框架、语言入口、Vite 配置、UI/CSS/引擎依赖声明和已选择预设/验收页的文件存在性。额外官方默认成员和其他应用保留，不要求工作区名称与配置 name 相同。

JSON 报告包含 root、readOnly、ok、issues、members、apps 和 limitations。应用状态：

- not-created：预期目录尚未创建。
- blocked：目录被占用、清单/入口/配置或依赖声明缺失等问题需要人工处理。
- present：本次结构检查未发现缺失；仍需 vp check、完整 build 和适用的浏览器验收。

无 --config 时只是成员清单及根结构检查，不推断每个应用原本应有哪些预设。发现问题或预期应用缺失时退出 1，检查无问题时退出 0；不安全路径、损坏根或无效 JSON 参数会报错并退出 1。该模式只能配合 --config，不能混用创建、补装、dry-run 等选项。

不会执行 Vite 配置或清单脚本，不扫描 node_modules，不读取 env 内容，也不会安装、格式化、生成或恢复文件。声明存在不等于依赖已安装；文件存在不证明配置有效或版本兼容。旧生成项目源码快照与当前计划可能不同，缺失文件只提示人工核对，不自动补写。若需继续操作，先修复现场，再用已有逐应用命令重新预检。

工作区根及成员的 JSON 清单支持 UTF-8 BOM，检查、逐应用新增预检和恢复入口使用相同读取规则，不会为去 BOM 重写原文件。清单须为不超过 1 MiB 的普通 JSON 对象文件；损坏、超限、目录或链接在相应预检拒绝，错误不显示清单内容。BOM 不影响作用域包名和重复包名检测，也不代表依赖或构建已验证。

## 逐应用恢复操作计划（只读）

```powershell
node packages/create/bin/cli.mjs --plan-recovery D:/Workspace/adui-studio/adui-cesium-workspace --config ./expected-apps.json
```

必须提供原批量 JSON；不能混用 --inspect-workspace、--dry-run、--apply-existing 或创建参数。报告是人工操作计划，包含 root、readOnly=true、mode=manual-plan、ok、apps 和 limitations；每个应用按原 JSON 顺序归入：

- create-missing：目录不存在，且工作区和同名包、peer/声明配置预检通过。列出独立新建命令；如选择 uiSmoke，追加应用创建和检查后才可执行的验收页命令。
- validate-existing：预期结构存在，只列 vp check 和 vp run build；不生成重新创建或补装命令。构建可能执行现有项目脚本，必须由开发者自行审阅后运行。
- manual-review：基础工作区问题、包名冲突或部分完成的应用等情况，列出原因，steps 为空；不建议删除、覆盖或盲目补装。

存在根问题、重复包名或成员清单问题时，所有应用先进入人工处理；单个应用只是预设/入口缺失时，该应用单独阻塞。发现 manual-review 退出 1，其余计划退出 0；ok=true 仅表示本次计划没有人工阻塞，不表示应用已恢复、依赖已安装或构建通过。

每个步骤给出 cwd、command、args、PowerShell 显示文本；新建步骤另有 requires 条件。生成和消费计划均不在检查命令中执行。运行输出的新建命令仍走原官方模板 CLI，执行时再次拒绝已存在目标；新建后的 UI 验收页也必须重检输出冲突。计划不会写状态文件或自动断点续跑。

## 显式执行缺失应用新建

先审阅 --plan-recovery 输出，再显式运行：

```powershell
node packages/create/bin/cli.mjs --execute-recovery D:/Workspace/adui-studio/adui-cesium-workspace --config ./expected-apps.json
```

该命令会创建应用并安装所选依赖。只接受路径和原批量 JSON，不接受计划 JSON、外部命令、--dry-run 或其他创建/补装选项。读取并校验配置后重新检查整个计划；存在 manual-review 时，在启动任何子进程前退出。原批量新建命令的目标保护保持有效。

- 初次检查为 create-missing 的应用按 JSON 顺序处理。每个应用创建前重新规划并检查目录、包名和工作区；若现场已变化，立即停止。
- 初次检查为 validate-existing 的应用仅记录 skipped，不执行其检查/构建脚本或重新集成。新应用安装过程中，共享锁文件、catalog 和必要根配置仍可能按原工作区集成规则更新。
- 创建步骤通过原 CLI 委托 Vite+ 官方模板。返回成功后核对新应用结构；选择 uiSmoke 时，再预检组件依赖、配置及输出冲突，通过后才创建验收页并核对结构。
- 任一步失败即停，保留部分输出和依赖现场，报告失败阶段与已返回成功的子进程。该记录不等于应用检查/构建通过。失败后重新运行可能被部分应用阻塞，必须先处理现场。

执行结果包含 completed、skipped 和 validation。结构检查不替代 vp check、完整 build 和适用的浏览器验收。全部应用已存在且结构检查通过时，重复调用只返回跳过结果；没有删除、覆盖式补装、自动回滚或恢复状态文件。原 --plan-recovery 仍是只读模式。

恢复子进程失败时，最外层 CLI 保留其有效非零退出码；信号退出、启动异常或没有有效码的失败使用 1，可通过 PowerShell 的 $LASTEXITCODE 查看。若部分创建后再次执行因人工阻塞而返回 1，应按本次失败阶段处理，不视为原失败已解决；命令不会记住旧退出码或自动重试。
