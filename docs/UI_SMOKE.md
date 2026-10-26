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
- 本流程不创建 CI/CD。真实浏览器测试仍需人工执行。
