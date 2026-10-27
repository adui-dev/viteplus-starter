# 本地开发 Harness

## P3 TS2307 修复后验证

在 `D:\Workspace\adui-studio` 执行（旧项目已成功安装 UI/CSS 时）：

```powershell
node .\viteplus-starter\packages\create\bin\cli.mjs --name starter-vue-p3 --type application --framework vue --ui tdesign --css unocss --repair-existing
node .\viteplus-starter\packages\create\bin\cli.mjs --name starter-react-p3 --type application --framework react --ui antd --css tailwindcss --repair-existing
```

上述命令不重新安装依赖，备份旧插件文件为 `starter.plugins.ts.bak`，仅对 `vite.config.ts` 执行 `vp fmt vite.config.ts --write`。再分别在两个应用执行 `vp check` 和 `vp build`。用户已在 Windows 完成旧项目修复：React `vp check` 直接通过、Vue `vp check --fix` 处理 `src/components.d.ts` 后通过，两组 `vp build` 均通过。

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

进入每个新项目执行 `vp check` 和 `vp build`，并确认 Vue JS 项目生成 `src/main.js`、React JS 项目生成 `src/main.jsx`；JavaScript 项目不应因生成器产生 TypeScript 专属的组件声明。其中 Vue/React JavaScript + UI/CSS 两组已由用户在 Windows 实机创建，并直接通过 `vp build`、`vp check`。其余指定新目录的完整矩阵及实际组件渲染仍待验证。

## 环境

- Node.js 22+（计划最低版本，尚待官方工具链版本验证）
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

在两个生成目录的 package.json 分别核对 Vue/React 依赖，再运行 `vp check`、`vp build` 和 `vp dev`。Monorepo 使用 `--type monorepo` 单独验证。目标目录必须不存在；创建完成后在生成项目中运行官方提供的本地检查、测试与构建命令。测试结束前不要删除非本工具创建的目录。

## UI/CSS 真实集成验收（待运行）

在仓库外创建新项目，避免覆盖已有测试目录：

```powershell
node .\viteplus-starter\packages\create\bin\cli.mjs --name p3-vue --type application --framework vue --ui tdesign --css unocss
node .\viteplus-starter\packages\create\bin\cli.mjs --name p3-react --type application --framework react --ui antd --css tailwindcss
```

分别进入两个目录执行 `vp check`、`vp build` 和 `vp dev`，确认组件库样式、`vite.config.ts` 中的插件配置、`uno.config.ts` 或 `src/starter.tailwind.css` 可用。若安装依赖失败，项目目录可能已创建；检查后处理，禁止在生成器里自动删除现有用户文件。

## 处理官方模板生成成功但集成失败

如果之前执行已经产生 Application 目录，禁止自动删除或覆盖原项目。在上级目录执行：

```powershell
node .\viteplus-starter\packages\create\bin\cli.mjs --name starter-vue-p3 --type application --framework vue --ui tdesign --css unocss --apply-existing
cd starter-vue-p3
vp check
vp build
```

补装会先检查目录、Vite+ 和 Vue/React 类型，以及已有 Starter 配置。失败时保留现有文件；并不提供可保证回滚所有已安装依赖的事务能力。

## 文档校验的边界

现有脚本检查必要文件、常规相对 Markdown 链接和需求标题编号重复。它**不等于**完整 Markdown 语义、Skills 安全审核、所有 ADR 和需求追踪一致性验证。

## Vue 自动生成声明的格式验证

新版 Vue UI 项目在 Vite+ `vite.config.ts` 写入 `fmt.ignorePatterns: ['src/components.d.ts']`（与现有规则合并）。这只排除自动生成类型声明的格式检查，TypeScript 仍应照常执行。

对**新创建**的 Vue + UI 项目，先执行 `vp build` 触发声明生成，再运行 `vp check`；不应再次因 `src/components.d.ts` 格式失败。用户已经修好的旧项目不需要重新执行 `--repair-existing`，如以后再次出现该问题，可手动将路径加入现有 `fmt.ignorePatterns`。

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
