# UI Smoke 本地组件渲染验收

本页面用于验证 Vite+ 生成项目的 UI 组件是否**真实渲染并正常响应点击**，以及 CSS 样式是否生效；不改变正式首页。

## 准备

支持现有 Vue 3 + TDesign 或 React + Ant Design 项目，JavaScript 与 TypeScript 均可。请先创建并安装对应 UI/CSS 依赖；不支持尚未实现的 Monorepo 根目录和其他 UI 组合。

在 `D:\Workspace\adui-studio` 执行：

```powershell
node .\viteplus-starter\packages\create\bin\cli.mjs --name starter-vue-js --type application --framework vue --language js --ui tdesign --css unocss --ui-smoke
node .\viteplus-starter\packages\create\bin\cli.mjs --name starter-react-js --type application --framework react --language js --ui antd --css tailwindcss --ui-smoke
```

`--ui-smoke` 不是创建新工程的命令；它只新增 `ui-smoke.html` 和 `src/ui-smoke/` 文件，已有同名文件会报错而不会覆盖。生成器会检查项目类型、已安装的依赖与 Vite 配置，并格式化新增文件。

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
