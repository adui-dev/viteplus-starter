# UI Smoke 本地组件渲染验收

本页面用于验证 Vite+ 生成项目的 UI 组件是否**真实渲染并正常响应点击**，以及 CSS 样式是否生效；不改变正式首页。

## 准备

支持 Vue 3 的 Element Plus、Ant Design Vue、TDesign，以及 React 的 Ant Design、TDesign；JavaScript 与 TypeScript 均可。支持独立应用和官方 Monorepo 子应用，不接受 Monorepo 根或 ui=none。先安装对应 UI/CSS 依赖，验收页不会重新安装依赖。

在 `D:\Workspace\adui-studio` 执行：

```powershell
node .\viteplus-starter\packages\create\bin\cli.mjs --name starter-vue-js --type application --framework vue --language js --ui tdesign --css unocss --ui-smoke
node .\viteplus-starter\packages\create\bin\cli.mjs --name starter-react-js --type application --framework react --language js --ui antd --css tailwindcss --ui-smoke
```

`--ui-smoke` 不是创建新工程的命令；它只新增 `ui-smoke.html` 和 `src/ui-smoke/` 文件，已有同名文件会报错而不会覆盖。生成器会检查项目类型、已安装的依赖与 Vite 配置，并格式化新增文件。

新版 React 页面将组件放在 `src/ui-smoke/SmokeApp.jsx`（TS 为 `.tsx`），挂载入口放在 `main.jsx|tsx`。组件文件只导出组件，避免旧版把组件与挂载混放时的 Fast Refresh lint 警告。已有验收页不会自动升级：请先人工备份并移走旧验收 HTML/目录，再重新运行；生成器仍拒绝覆盖任何同名文件。

## Vue / TDesign / UnoCSS

```powershell
cd D:\Workspace\adui-studio\starter-vue-js
vp check
vp dev
```

在浏览器打开 Vite+ 显示的本地 URL 后追加 `/ui-smoke.html`（例如 `http://localhost:5173/ui-smoke.html`；如端口变化以终端实际 URL 为准）。

确认出现 **TDesign 主按钮**，初始“点击次数：0”；点击一次后变为 1。UnoCSS 区域应显示浅绿色背景、深绿色文字、圆角与内边距。浏览器控制台不应有组件未解析报错。

## React / Ant Design / Tailwind

结束前一个开发服务后执行：

```powershell
cd D:\Workspace\adui-studio\starter-react-js
vp check
vp dev
```

打开 `/ui-smoke.html`，确认 Ant Design 主按钮可见、点击计数从 0 增加，Tailwind CSS 浅绿色区域正常呈现，浏览器控制台无相关错误。

## 注意

- 验收页由开发服务器独立提供；Vite 默认单入口生产构建不一定包含该页面。**不要只依据 `vp build` 判断按钮是否正常渲染。**
- 不改变 `App.vue`、`App.jsx`、`src/main.*`、`vite.config.*`。
- 测试完成后，若确认无需保留，可手动删除新增的 `ui-smoke.html` 和 `src/ui-smoke/`；生成器不会删除现有文件。
- 本流程不创建 CI/CD。

## 2026-10-27 本地验收记录

基于 `511c8c5`，两个已有 JavaScript 项目均已完成 Chrome 实际验收：Vue/TDesign 自动导入及 React/Ant Design 按钮渲染正常，点击次数从 0 变为 1；UnoCSS/Tailwind 浅绿色区域、文字颜色、8px 圆角、16px 内边距正确；浏览器控制台未发现警告或错误。原 App、main 和 Vite 配置文件的前后 SHA-256 一致。

两项目 `vp check` 与 `vp build` 均退出 0，但 React 的新增 `src/ui-smoke/main.jsx:7` 有 `react/only-export-components` 警告（当前组件与挂载在同一无导出文件中）；不能称为无警告通过。Vue 首次启动进行了 TDesign 依赖预构建，完成后页面正常。

仓库 `node --test` 59 项通过，文档校验通过；仓库根 `vp check` 因 31 个文件格式问题退出 1。以上不代表 TypeScript 验收页或其他 UI/CSS 组合已经通过。

## 2026-10-27 质量修复复验

React 新版通过独立组件模块修复 Fast Refresh lint 警告。已有 `starter-react-p3` 的 TS 页面和新官方 `quality-react-js-20261027` 的 JS 页面均通过 `vp check`，无警告或 lint/type 错误；两应用的完整 build 脚本通过，TS 包含 `tsc -b`。浏览器中按钮点击 0→1、Tailwind 样式正常，控制台无 warn/error。

TS 页面额外验证了热更新：点击到 1 后修改组件标题，再恢复原标题，两次刷新均保留计数 1。此验证未改动正式 App/main 或项目配置。

生成器当前 72 项单元测试、文档校验和全仓 `vp check` 已全部通过，前文格式失败与 React 警告为修复前的历史记录。Vue TS/JS 的浏览器验收见项目状态中的 P3/P4 记录；尚未穷举所有 UI/CSS 组合。

## 2026-10-29：补齐其他 UI 库

新增组合沿用 --ui-smoke：Vue --ui element-plus、Vue --ui antd、React --ui tdesign。Vue 分别生成 el-button、a-button、t-button，验证已有 resolver 自动导入；React 显式导入对应 Button，TDesign 使用 theme=primary，Ant Design 使用 type=primary。共享样式独立导入，Element Plus 样式由现有 resolver 按需注入。css=none 不生成原子 CSS 测试区域。

例如在仓库上级目录，对已装好依赖且尚无验收页的应用执行：

```powershell
node .\viteplus-starter\packages\create\bin\cli.mjs --name audit-element-vue-js --type application --framework vue --language js --ui element-plus --css tailwindcss --ui-smoke
node .\viteplus-starter\packages\create\bin\cli.mjs --name audit-antd-vue-ts --type application --framework vue --language ts --ui antd --css unocss --ui-smoke
node .\viteplus-starter\packages\create\bin\cli.mjs --name audit-tdesign-react-js --type application --framework react --language js --ui tdesign --css unocss --ui-smoke
```

新增生产双入口验收工具，在仓库内执行：

```powershell
node scripts/verify-ui-build.mjs <应用绝对路径> /ui-check/
# 或使用相对部署 base
node scripts/verify-ui-build.mjs <应用绝对路径> ./
```

工具创建专用临时配置（已有文件拒绝覆盖），合并原配置后构建 index.html 与 ui-smoke.html，验证两个产物入口；输出 dist/ui-verify，结束清理临时配置。原 Vite 配置不修改。随后在应用目录运行 vp check，并通过 vp preview --outDir dist/ui-verify --base /ui-check/ 查看 /ui-check/ui-smoke.html；相对 base 则省略 --base。不要与同一应用或工作区的其他构建并行。该脚本不替代应用完整 build 脚本的类型检查，也不替代浏览器验收。

本轮上述三套既有官方样例和新官方 Monorepo 子应用 ui-tdesign-react-ts（React TS/TDesign/UnoCSS）通过正式 build、双入口构建及 vp check。Chrome 四页按钮真实渲染、点击 0→1、CSS 绿色区域及 16px 内边距正常，warn/error 为空。三套既有样例 App/main/配置/package.json/锁文件共 15 项哈希一致。UnoCSS 多入口构建保留重复虚拟 CSS 导入提示，不宣称构建完全无提示。

五种框架/UI × TS/JS × 三种 CSS 共 30 个基础页面计划已测试；跨增强配置矩阵的 UI Smoke 计划由 132 扩展至 330，总计划 462 不变。不是全部组合均已真实构建或浏览器验收。
