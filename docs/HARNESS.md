# 本地开发 Harness

## P3 TS2307 修复后验证

在 `D:\Workspace\adui-studio` 执行（旧项目已成功安装 UI/CSS 时）：

```powershell
node .\viteplus-starter\packages\create\bin\cli.mjs --name starter-vue-p3 --type application --framework vue --ui tdesign --css unocss --repair-existing
node .\viteplus-starter\packages\create\bin\cli.mjs --name starter-react-p3 --type application --framework react --ui antd --css tailwindcss --repair-existing
```

上述命令不重新安装依赖，备份旧插件文件为 `starter.plugins.ts.bak`，仅对 `vite.config.ts` 执行 `vp fmt vite.config.ts --write`。再分别在两个应用执行 `vp check` 和 `vp run build`。用户已在 Windows 完成旧项目修复：React `vp check` 直接通过、Vue `vp check --fix` 处理 `src/components.d.ts` 后通过，两组 `vp build` 均通过。

当前应用构建一律按 package.json 的完整 build 脚本验证，即 vp run build，TS 模板会执行 vue-tsc/tsc；vp build 是 Vite 内置构建，不能代替脚本中的类型检查。官方工作区根使用 vp run ready。失败提示里的命令须在修复现场后于对应目录执行；专项 vp build --config 验收保留专用入口，并另跑应用完整脚本。

本项目**不使用 CI/CD**。所有检查由开发者本地手动执行。

自有文件统一使用根 `vite.config.ts` 中的 Vite+ 格式配置。第三方 `git-commit`、`gitmoji` Skill 原文仅从格式化范围排除以保持安装哈希；自有 Skill、源码、测试和文档继续参与全仓检查。2026-10-27 已建立通过 `vp check` 的格式基线。

## P4 Monorepo 混合应用

批量模式见 [JSON 批量配置](BATCH_CONFIG.md)：在仓库外用示例 JSON 先 dry-run，再实际生成全新根。运行根 `vp run ready`、构建后 `vp check`，分别打开两应用的 UI Smoke 验证渲染与点击；检查官方 website/utils 和根无 UI/CSS 直接依赖。错误与部分失败由 `batch.test.mjs` 的受控执行器验证，不破坏真实项目来制造失败。

见 [Monorepo 操作说明](MONOREPO.md)。使用独立的仓库外目录，依次创建官方根、Vue TS/TDesign/UnoCSS 和 React JS/Ant Design/Tailwind；不要并发执行生成。分别运行应用 `vp check`、`vp run build`，根运行 `vp check`；确认根没有新增 Vue/React UI/CSS 依赖、每个应用插件互不污染，Vue TS 声明生成后格式检查仍有效。默认 website/utils 保留。

## TypeScript / JavaScript 四种官方模板验证

在仓库外的工作目录执行：

```powershell
node .\viteplus-starter\packages\create\bin\cli.mjs --name vue-ts-check --type application --framework vue --language ts
node .\viteplus-starter\packages\create\bin\cli.mjs --name vue-js-check --type application --framework vue --language js --ui tdesign --css unocss
node .\viteplus-starter\packages\create\bin\cli.mjs --name react-ts-check --type application --framework react --language ts
node .\viteplus-starter\packages\create\bin\cli.mjs --name react-js-check --type application --framework react --language js --ui antd --css tailwindcss
```

进入每个新项目执行 `vp check` 和 `vp run build`，并确认 Vue JS 项目生成 `src/main.js`、React JS 项目生成 `src/main.jsx`；JavaScript 项目不应因生成器产生 TypeScript 专属的组件声明。其中 Vue/React JavaScript + UI/CSS 两组已由用户在 Windows 实机创建，并直接通过 `vp build`、`vp check`。其余指定新目录的完整矩阵及实际组件渲染仍待验证。

## 环境

- 本阶段交付与验收平台：Windows，使用 PowerShell；Linux/macOS 不属于当前要求，也不列为验收阻塞项。
- Node.js `^22.18.0 || ^24.11.0 || >=26.0.0`（与锁定的 Vite+ 1.4.0 一致，Node 22 最低为 22.18.0）
- pnpm
- Vite+ CLI（`vp`）

## 安装与验证

```powershell
pnpm install
node packages/create/bin/cli.mjs --help
# 交互式创建（在独立测试目录执行）
node packages/create/bin/cli.mjs
node packages/create/bin/cli.mjs --name demo-vue --type application --framework vue --dry-run
node packages/create/bin/cli.mjs --name demo-react --type application --framework react --dry-run
node packages/create/bin/cli.mjs --name demo-ui --type application --framework vue --ui tdesign --css unocss --dry-run
node --test
node scripts/validate-docs.mjs
vp check
```

`vp check` 需完整工具链可用。没有网络或依赖时明确记录失败原因，不绕过检查或伪造通过结果。

## 仓库依赖锁定

根 `pnpm-lock.yaml` 纳入版本控制，固定本次已验证的 Vite+ 1.4.0 及传递依赖；不改变 package.json 中的版本声明，不执行依赖升级。常规复现使用 `pnpm install --frozen-lockfile`；已缓存依赖时可追加 `--offline`。

2026-10-27 在本地使用 pnpm 11.24.0 执行 `pnpm install --frozen-lockfile --offline`，退出 0，未更新依赖。该记录与生成样例通过 Vite+ 管理的 pnpm 12.15.0 安装是两个不同环境。

## 实际创建验收（需有 vp 环境）

```powershell
node packages/create/bin/cli.mjs --name demo-vue --type application --framework vue
node packages/create/bin/cli.mjs --name demo-react --type application --framework react
```

在两个生成目录的 package.json 分别核对 Vue/React 依赖，再运行 `vp check`、`vp run build` 和 `vp dev`。Monorepo 使用 `--type monorepo` 单独验证，在根运行 `vp run ready`。目标目录必须不存在；创建完成后在生成项目中运行官方提供的本地检查、测试与构建命令。测试结束前不要删除非本工具创建的目录。

## UI/CSS 真实集成验收（待运行）

在仓库外创建新项目，避免覆盖已有测试目录：

```powershell
node .\viteplus-starter\packages\create\bin\cli.mjs --name p3-vue --type application --framework vue --ui tdesign --css unocss
node .\viteplus-starter\packages\create\bin\cli.mjs --name p3-react --type application --framework react --ui antd --css tailwindcss
```

分别进入两个目录执行 `vp check`、`vp run build` 和 `vp dev`，确认组件库样式、`vite.config.ts` 中的插件配置、`uno.config.ts` 或 `src/starter.tailwind.css` 可用。若安装依赖失败，项目目录可能已创建；检查后处理，禁止在生成器里自动删除现有用户文件。

## 处理官方模板生成成功但集成失败

如果之前执行已经产生 Application 目录，禁止自动删除或覆盖原项目。在上级目录执行：

```powershell
node .\viteplus-starter\packages\create\bin\cli.mjs --name starter-vue-p3 --type application --framework vue --ui tdesign --css unocss --apply-existing
cd starter-vue-p3
vp check
vp run build
```

补装会先检查目录、Vite+ 和 Vue/React 类型，以及已有 Starter 配置。失败时保留现有文件；并不提供可保证回滚所有已安装依赖的事务能力。

## 文档校验的边界

现有脚本检查必要文件、常规相对 Markdown 链接和需求标题编号重复。它**不等于**完整 Markdown 语义、Skills 安全审核、所有 ADR 和需求追踪一致性验证。

## Vue 自动生成声明的格式验证

新版 Vue UI 项目在 Vite+ `vite.config.ts` 写入 `fmt.ignorePatterns: ['src/components.d.ts']`（与现有规则合并）。这只排除自动生成类型声明的格式检查，TypeScript 仍应照常执行。

对**新创建**的 Vue + UI 项目，执行 `vp run build` 进行完整构建并触发声明生成，再运行 `vp check`；不应再次因 `src/components.d.ts` 格式失败。用户已经修好的旧项目不需要重新执行 `--repair-existing`，如以后再次出现该问题，可手动将路径加入现有 `fmt.ignorePatterns`。

## 已知环境限制

用户 Windows 已通过 TypeScript、JavaScript 两种语言下的 Vue + TDesign + UnoCSS 和 React + Ant Design + Tailwind 代表组合检查与构建；历史 Vue TypeScript 曾需 `--fix`，新增 `fmt.ignorePatterns` 的 TypeScript 新建项目仍需复验。

## 本地 UI Smoke 验收

使用 `--ui-smoke` 在**已创建的项目**中增加隔离验收页，见 [UI Smoke 验收步骤](UI_SMOKE.md)。运行 `vp dev` 并在浏览器访问 `/ui-smoke.html`，确认真实组件按钮、点击计数、原子 CSS 的展示效果。此操作需人工检查，不会替换原首页，且 `vp build` 成功不能单独代表真实组件渲染通过。

## 大屏验收

按 [SCREEN](SCREEN.md) 运行 --screen；Vue/React 的 TS/JS 都应检查与构建，独立页面通过开发服务器验证四模式、容器变化、坐标、交互、卸载重挂与控制台。全屏必须实测 fullscreenElement 和退出恢复，遇到浏览器 not granted 只能记录拒绝路径，不能标记成功。真实 3D 视口与 DPR 待引擎接入后验收。

## Three.js 专项检查

先有 --screen，再运行 --three-smoke；按 [THREE_SMOKE](THREE_SMOKE.md) 检查 canvas 缓冲、DPR、中心拾取、卸载与重挂。全屏需先激活目标标签，在前台通过用户手势进入，并检查 :fullscreen 与退出尺寸恢复。Three 页面需单独作为 build 输入验证，不用正式首页构建代替；记录包体提醒，不调高阈值掩盖。

## 延迟引擎请求

对 examples/three.batch.json 执行完整生成与根 ready；专项多页构建开启 manifest。检查引擎 isDynamicEntry，首页与验收入口均无静态引擎 import；生产预览用网络事件确认点击前无引擎分块请求、无 canvas，点击后出现一个引擎请求与 canvas，并验证卸载/重挂需要再次加载。晚到异步结果及重试使用受控单测验证；不以缓存命中代替首访请求证据。

## GLB 验收

以用户授权本地 GLB 选择验证贴图/相机、拾取、DPR 与容器变化，选择受控坏 GLB 检查错误恢复、清除后重载和卸载。原文件先后取 SHA-256，模型不提交 Git。清理调用用单测验证；专项双入口构建确认 GLTFLoader 分块，不以默认首页构建代替模型路径验证。

## .adui 验收

按 [MODEL_SECURITY](MODEL_SECURITY.md) 在源码及 public 之外生成临时密钥与 .adui；独立页面先加载场景再选验收密钥和加密模型。核对错误密钥/篡改拒绝、旧模型保留、清除授权/卸载和恢复；四组合执行 check/build，并以 Three HTML 作生产构建输入。密钥和模型都不提交 Git，检查日志/产物无明文密钥，不以本地 provider 代替服务端鉴权完成。

## 模型构建插件验收

按 [MODEL_BUILD](MODEL_BUILD.md) 安装到当前版本 Three 应用；使用独立生成的测试 env，不复制业务工程生产密钥。执行 verify-model-build 真实双模式构建与 HTTP 检查；四组合额外以 model-smoke.html 为输入构建（包含 sourcemap 检查）。浏览器确认 embedded 自动加载、external 锁定/解锁、配置域名允许与拒绝；检查无原 GLB、已知明文副本或原始密钥字面量。不将掩码拆分称为无法提取。

## 创建器模型保护验收

执行 examples/models.batch.json 并运行根 ready，确认四个启用保护的成员各自 KEY 不同，关闭成员无 Node 模型插件/env/模型页/KEY 脚本。Git check-ignore 验证 .env.local 和轮换备份。用 vp run models:keygen 验证拒绝覆盖及缺失时生成，用 models:keyrotate 验证备份和其他 env 保留；轮换后构建必须对新 KEY 输出新密文，不能重放旧缓存。四组合专项 model-smoke 页面构建并检查原 GLB/密钥字面量缺失，浏览器验证默认自动加载。TTY 交互选完保护后取消，确认无目录写入。

## 生成器主线验证

先运行 node scripts/verify-generator-matrix.mjs，核对 294 个配置组合的官方命令、语言、文件冲突与依赖隔离；输出 actualBuilds=0，不能称为真实项目验收。再针对缺口创建代表官方项目并运行 check/build，组件真实效果需独立浏览器验收。文件保护回归使用受控 temp/junction，不向业务工程写入；UI/CSS 格式化应保持无关文档与兄弟文件原样。当前覆盖表见 [GENERATOR_STATUS](GENERATOR_STATUS.md)。

## Cesium 本地验证

按 [CESIUM](CESIUM.md) 生成独立应用和官方工作区，运行 check/build/ready 后，再单独执行 verify-cesium-build 双入口脚本，验证 /cesium-check/ 与 ./ 部署及四类资源。专项脚本暂存配置，不与同一工作区检查并行。生产浏览器验证点击前无 canvas/场景分块、点击后本地椭球和 Worker/Assets 请求成功、卸载无 canvas、重挂等待点击；开发服务器另核对资源 HTTP 状态和 MIME。全屏/DPR 专项仍需另外验收。

Cesium 模型另选择原 GLB 和匹配 .adui/验收密钥，确认资源就绪后显示贴图、无授权拒绝、清除授权移除模型、卸载画布为 0。受控测试验证 ready/error/超时监听、取消与晚到创建、替换失败保留旧资产及 Blob URL 回收；不将其扩大为全部 GPU 缓存回收或 env 自动构建完成。

Cesium 自动构建使用 verify-model-app，检查双入口/base、密文与原 GLB 一致性、无原模型/KEY 字面量及四类资源。分别检查 embedded 自动加载、external 初始锁定/解锁/清除；开发服务检查原模型/env 403 与密文 200。KEY 轮换后重新构建与刷新验收。混合应用另确认模型插件/KEY 只有一套，模型入口符合 Three → Babylon → Cesium 优先级，再运行 verify-multi-build；每项专项与工作区全局检查串行。

## Babylon 本地验证

按 [BABYLON](BABYLON.md) 创建 Vue/React、TS/JS 与官方工作区，执行 check/build/ready。之后单独运行 verify-babylon-build，确认首页+验收页双入口、场景分块及 /babylon-check/、./ 部署。浏览器检查点击前无 canvas/引擎场景请求、加载后立方体、卸载画布清除、重挂等待再次点击、控制台无错误。受控测试验证初始化和帧错误后的循环/场景/引擎清理，不将其等同 GPU 堆测量或模型支持。

模型自动构建另执行 node scripts/verify-model-app.mjs <应用路径> [/model-check/|./]，需 src/models 至少一个自包含 GLB。验证官方首页+model-smoke 双入口、密文数量/解密一致、无原模型/明文与 KEY 字面量；产物保留 dist/model-verify，临时配置结束删除。对 embedded 页面检查无需手动解锁即 ready；external 页面检查初始锁定、独立解锁、锁定清除模型。补验生成项目开发服务的原 GLB/env HTTP 403 与密文 200，并验证 KEY 轮换后重新构建。受控下载/授权取消用例不等同任意 GPU 内存完全回收。

## Cesium/Babylon 大屏补验方法

使用最新生成的 Vue/React 引擎独立验收页，先运行 node scripts/verify-multi-build.mjs <应用路径>，然后在应用目录启动 vp preview --outDir dist/multi-verify --base /multi-check/。不要与同一工作区的普通构建同时执行，普通构建会清理 dist 下的专项产物。

1. 分别打开 cesium-smoke.html、babylon-smoke.html 并点击加载，核对 ready 与单个 canvas。
2. 同一容器尺寸下测试 DPR 1→2→3，比较 canvas 的 CSS 尺寸与 width/height 绘图缓冲区；上限为 2。浏览器缩放会影响实际 DPR，记录读取的 devicePixelRatio，不能直接将仿真参数当成实际 DPR。
3. 切换半宽、四模式，确认引擎 transform=none、缓冲区跟随容器，HUD 按对应模式变换。
4. 清除临时尺寸/DPR 仿真，将验收标签页置于前台再实际点击进入全屏。确认 :fullscreen 匹配 ad-screen，覆盖层按钮仍能点击；退出后匹配为空且容器恢复。请求拒绝不能算通过，不修改浏览器安全策略。
5. 卸载后 canvas=0；重挂应回到等待加载，再点击加载进入 ready。检查控制台 warn/error，保存实际全屏截图。

2026-10-29 已按此流程完成 Vue TS 独立应用和 React JS Monorepo 代表组合；具体边界见 [大屏说明](SCREEN.md)。接下来优先实现其他 UI 库的组件验收入口，不增加查看器操作。

## V1 收尾入口

模式选择、按顺序的端到端验收和未覆盖范围集中在 [V1 验收清单](V1_ACCEPTANCE.md)。新增 node scripts/verify-examples.mjs 对 examples 下所有 *.batch.json 做真实 CLI dry-run，并断言临时目录没有生成文件；只计计划，不计真实构建。当前示例与用途见 [示例索引](../examples/README.md)。

## Node 22 最低版本复验

根与 create 包的 engines.node 使用锁定 Vite+ 1.4.0 的范围：`^22.18.0 || ^24.11.0 || >=26.0.0`。依据是已安装 vite-plus/package.json 的 engines 字段及随包 guide/vitest-v5.md；不是泛指任意 Node 22。依赖更新后需重新核对范围和实测结果。

用官方环境管理器安装指定运行时，再在当前 PowerShell 进程临时选择。仅给最外层 node 指定 --node，不能作为后续 vp 子进程也使用该版本的证据；VP_NODE_VERSION 应同时传给子进程。还需把 vp 所在的官方 shim 目录放在 PATH 首位，并核对 pnpm 的解析来源；本机系统 Corepack 的 pnpm.cmd 会优先调用同目录的 Node 24，仅设置 VP_NODE_VERSION 无法约束该转发器。以下步骤不修改全局默认、项目 pin、系统 Node 或依赖版本：

```powershell
vp env install 22.18.0
$node22Previous = [Environment]::GetEnvironmentVariable('VP_NODE_VERSION', 'Process')
$node22PreviousPath = $env:PATH
try {
  $env:VP_NODE_VERSION = '22.18.0'
  $node22ShimDirectory = Split-Path (Get-Command vp -CommandType Application).Source
  $env:PATH = $node22ShimDirectory + [IO.Path]::PathSeparator + $node22PreviousPath
  Get-Command node,pnpm | Select-Object Name,Source
  vp env current --json
  vp env exec node -p "process.version + ' ' + process.execPath"
  vp env exec node --test
  vp env exec node scripts/validate-docs.mjs
  vp env exec node scripts/verify-examples.mjs
  vp env exec node scripts/verify-generator-matrix.mjs
  vp check
} finally {
  [Environment]::SetEnvironmentVariable('VP_NODE_VERSION', $node22Previous, 'Process')
  $env:PATH = $node22PreviousPath
}
```

真实生成和构建需在同样的临时环境选择下另行执行：先用仓库外 JSON 指定一个不存在的官方工作区及 Vue/React × TS/JS 四个应用，运行原 CLI --config；随后在新工作区核对 vp env current --json，再运行 vp run --no-cache ready、vp check，以及 UI 应用的 verify-ui-build。Vite+ run 的选项放在任务名之前，任务名之后的参数会转发给脚本；不能写成 vp run ready --no-cache。保留官方根和应用的运行时声明，不通过修改模板来强行兼容。所有命令都需检查退出码，前一步失败应先处理现场，不将后续命令的成功代替前一步结果。

示例和组合验证仍为 actualBuilds=0；真实生成、完整类型/构建、UI 双入口构建与浏览器验收分别记录，不把运行时兼容验证扩大成新增浏览器验收。

## Windows 中文与空格路径

父目录及配置文件路径可以包含中文和空格；项目和应用 name 仍须使用原有安全的小写 kebab-case。PowerShell 用单引号或路径变量保留完整参数，切换目录使用 Set-Location -LiteralPath；不要把命令与路径拼成一个字符串执行。批量输出始终是当前目录下的 name，不是 JSON 所在目录；需在已有工作区之外执行新建模式。

仓库外验收工作区可按下面方式复查，三个模式各自独立运行：

```powershell
$starterCli = 'D:\Workspace\adui-studio\viteplus-starter\packages\create\bin\cli.mjs'
$pathParent = 'D:\Workspace\adui-studio\Windows 路径验收 20261030'
$workspacePath = Join-Path $pathParent 'adui-windows-paths'
$expectedConfig = Join-Path $pathParent '恢复 配置.json'
node $starterCli --inspect-workspace $workspacePath --config $expectedConfig
node $starterCli --plan-recovery $workspacePath --config $expectedConfig
node $starterCli --execute-recovery $workspacePath --config $expectedConfig
```

首次生成及恢复执行仍调用官方入口；不存在的应用才允许新建，已有完整应用跳过，部分完成应用阻塞。验收时先保存已有 App/main、预设配置和独立页哈希，再执行恢复和重复调用；根共享锁文件/catalog 的正常更新应与已有应用源文件保护分开检查。生成后在同一工作区串行运行完整 ready、UI 双入口构建和最终 check，不用结构检查代替构建。实际记录见 [V1 清单](V1_ACCEPTANCE.md)。
