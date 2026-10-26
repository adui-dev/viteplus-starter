# 本地开发 Harness

## P3 TS2307 修复后验证

在 `D:\Workspace\adui-studio` 执行（旧项目已成功安装 UI/CSS 时）：

```powershell
node .\viteplus-starter\packages\create\bin\cli.mjs --name starter-vue-p3 --type application --framework vue --ui tdesign --css unocss --repair-existing
node .\viteplus-starter\packages\create\bin\cli.mjs --name starter-react-p3 --type application --framework react --ui antd --css tailwindcss --repair-existing
```

上述命令不重新安装依赖，备份旧插件文件为 `starter.plugins.ts.bak`，仅对 `vite.config.ts` 执行 `vp fmt vite.config.ts --write`。再分别在两个应用执行 `vp check` 和 `vp build`。用户已在 Windows 完成旧项目修复：React `vp check` 直接通过、Vue `vp check --fix` 处理 `src/components.d.ts` 后通过，两组 `vp build` 均通过。


本项目**不使用 CI/CD**。所有检查由开发者本地手动执行。

## TypeScript / JavaScript 四种官方模板验证

在仓库外的工作目录执行：

```powershell
node .\viteplus-starter\packages\create\bin\cli.mjs --name vue-ts-check --type application --framework vue --language ts
node .\viteplus-starter\packages\create\bin\cli.mjs --name vue-js-check --type application --framework vue --language js --ui tdesign --css unocss
node .\viteplus-starter\packages\create\bin\cli.mjs --name react-ts-check --type application --framework react --language ts
node .\viteplus-starter\packages\create\bin\cli.mjs --name react-js-check --type application --framework react --language js --ui antd --css tailwindcss
```

进入每个新项目执行 `vp check` 和 `vp build`，并确认 Vue JS 项目生成 `src/main.js`、React JS 项目生成 `src/main.jsx`；JavaScript 项目不应因生成器产生 TypeScript 专属的组件声明。以上属于待完成的实机验收，不得提前标记通过。

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

用户 Windows 已通过 Vue + TDesign + UnoCSS 与 React + Ant Design + Tailwind 的检查（Vue 曾使用 `--fix`）和构建；新增 `fmt.ignorePatterns` 配置仍需在新项目复验。
