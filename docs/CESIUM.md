# Cesium 应用生成预设

通过官方 Vite+ Application 模板生成 Vue/React、TS/JS 应用，再按应用增量添加 Cesium 1.146.0、vite-plugin-static-copy 4.1.1、大屏原生像素引擎层和独立验收页。正式首页、App、main 保留；Vite 配置增量插入插件，原件保存为 vite.config.*.before-adui-cesium。

## 创建与补装

在生成器上级目录执行，目标名称必须未占用：

```powershell
node ./viteplus-starter/packages/create/bin/cli.mjs --name globe --type application --framework vue --screen --engine cesium
cd globe
vp check
vp run build
vp dev
```

打开终端所示端口的 /cesium-smoke.html，点击“加载 Cesium”。页面显示本地蓝色椭球和黄色点，不加载在线影像、地形或 ion Token；保留 Cesium 的署名显示。卸载清除 Viewer、画布及本实例 ResizeObserver；重挂后需要再次点击加载。Cesium 自身模块级缓存不作为每实例资源清理承诺。

React 使用 --framework react；JavaScript 加 --language js。新建必须 --screen；已有当前框架/语言大屏应用可用 --engine cesium --apply-existing 补装，也可在普通官方应用中同时 --screen --engine cesium --apply-existing。拒绝重复安装、链接/junction、输出冲突或未经验证的既有依赖版本。安装期间 Vite 配置变化会停止并保留现场，不回滚依赖安装。

Monorepo 示例为 [cesium.batch.json](../examples/cesium.batch.json)，根仍委托 vite:monorepo，成员委托 vite:application：

```powershell
node ./viteplus-starter/packages/create/bin/cli.mjs --config ./viteplus-starter/examples/cesium.batch.json --dry-run
node ./viteplus-starter/packages/create/bin/cli.mjs --config ./viteplus-starter/examples/cesium.batch.json
```

已有工作区用 --workspace <路径> 添加应用。官方 catalog: 引用通过本应用解析到的已安装包元数据核对版本，不执行包入口或覆盖 catalog；每个应用只增加自身所选引擎。暂不支持多引擎、Cesium 模型加载或 .adui 模型保护；Cesium 下传 embedded/external 明确拒绝，不生成无作用的 KEY 脚本。Three 的保护保持原有行为。

## 资源与构建

插件从本应用依赖图解析 cesium/Build/Cesium，将 Workers、ThirdParty、Assets、Widgets 映射到 adui-cesium/，开发时直接提供，构建时复制。适配静态复制插件 4 的目录保留规则，避免输出 node_modules 路径；冲突文件报错，public/adui-cesium 是保留路径。配置只增加插件，不改 base、server 或正式首页构建入口。

点击后先根据 import.meta.env.BASE_URL 和页面地址设置 CESIUM_BASE_URL，再动态导入场景与 Widgets 样式。支持 /、/子路径/、./ 的 HTTP 部署；相对 base 的验收 HTML 放在构建根目录，不能任意搬到额外目录。依赖与静态资源使用本地来源，不引入 CDN。

依据：[Cesium 官方资源配置说明](https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/)、[官方 Vite 示例](https://github.com/CesiumGS/cesium-vite-example)、[静态复制插件当前说明](https://github.com/sapphi-red/vite-plugin-static-copy)。

默认 vp run build 构建官方首页，不包含独立验收页。以下本地脚本以 index.html + cesium-smoke.html 双入口专项构建，并确认四类资源目录及部署 base：

```powershell
node scripts/verify-cesium-build.mjs D:/Workspace/adui-studio/globe
node scripts/verify-cesium-build.mjs D:/Workspace/adui-studio/globe ./
```

脚本在目标项目暂存独立配置，结束后删除，产物在 dist/cesium-verify；不要与同一项目/工作区的全局检查并行运行。现有同名临时配置拒绝覆盖。Cesium 场景约 4.17 MB（gzip 1.12 MB），仅点击后加载，保留默认 500 kB 提醒。正式首页未导入 Cesium 时仍复制静态资源，首期不做引用裁剪。

验收区分：单元/计划检查、真实双入口构建、真实浏览器分别记录。四组合及工作区的执行结果见 [状态记录](PROJECT_CONTEXT.md)，不将计划矩阵等同全部组合构建通过。
