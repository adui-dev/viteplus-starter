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

已有工作区用 --workspace <路径> 添加应用。官方 catalog: 引用通过本应用解析到的已安装包元数据核对版本，不执行包入口或覆盖 catalog；每个应用只增加自身所选引擎。支持 [多引擎组合](MULTI_ENGINE.md)、本地 GLB/.adui 与 env 自动构建保护。默认 embedded，可选 external 或 none，自动生成项目 KEY 与轮换脚本；多引擎只配置一套，适配器优先级为 Three → Babylon → Cesium。

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

## 本地 GLB 与 .adui 模型

先点击“加载 Cesium”，再通过“Cesium 模型文件”选择自包含 GLB。加载前检查 GLB 2.0、32 MiB 上限和外部资源 URI；拒绝 Draco/KTX2/Meshopt 及未支持扩展，不自动下载解码器。当前扩展范围为 KHR_materials_unlit/pbrSpecularGlossiness/specular/clearcoat/anisotropy、KHR_texture_transform、KHR_mesh_quantization、EXT_mesh_gpu_instancing。

.adui 与独立验收密钥使用同一套 [模型封装工具](MODEL_SECURITY.md)。先导入“Cesium 验收密钥”，再选择匹配的 .adui；本地文件不上传。缺少授权或认证失败不创建 Blob/模型；清除授权同时清除模型并取消待处理授权，验收授权有效期 10 分钟。

代码接口是 createLazyGlobe 返回的 loadModel(buffer, {encrypted, authorize})、cancelModelLoad、clearModel、destroy，授权契约复用 decryptAdui。onModelState 接收 {state,message}。当前验收将模型放在示例位置 116.4°E、39.9°N、高度 100 米，按就绪后的有限包围球聚焦，不宣称完成业务地理配准或新增查看器工具。

模型使用公开 Model.fromGltfAsync({url}) 接口加载受控 Blob URL。创建返回后，候选模型隐藏加入场景，等待 readyEvent/errorEvent；加载期间持续请求帧，最长等待 30 秒。只有资源就绪且边界有效才显示并替换旧模型；失败保留旧资产。取消、清除、卸载及晚到结果均移除候选、销毁模型、撤销 URL，并解除就绪/错误/帧监听。

Blob 保存独立明文副本供加载器使用，URL 存活至对应资产释放。临时解密缓冲最终清零不等于清除 Blob、引擎缓存或 GPU 的所有副本；浏览器合法解密仍可提取模型。旧源码快照不会覆盖升级。

API 依据 [Cesium 官方 Model 文档](https://cesium.com/learn/cesiumjs/ref-doc/Model.html) 和本项目固定版本 [1.146 的加载实现](https://github.com/CesiumGS/cesium/blob/1.146/packages/engine/Source/Scene/Model/Model.js)，就绪判定使用事件，不把创建 Promise 当作全部资源就绪。

## env 自动构建与目录加载

新建 Cesium 应用默认增加 src/models、被忽略的 .env.local、models:keygen/models:keyrotate 和 /model-smoke.html。将自包含 GLB 放入 src/models 后，开发/构建自动扫描并生成 .adui。普通构建保留官方首页入口，仍输出密文；独立模型页需显式加入 HTML 输入。

embedded 模型页自动下载同源密文并解密，无需手动选择密钥。external 初始锁定，选择独立解锁 JSON 后加载；锁定清除模型并取消未完成请求。none 不生成模型构建插件、env、KEY 脚本或模型目录页，本地文件验收继续可用。操作与密钥边界见 [MODEL_BUILD](MODEL_BUILD.md)。

createLazyGlobe 默认 loader 在导入场景前设置部署 base 对应的 CESIUM_BASE_URL；loadBundledModel(asset,{authorize,signal}) 先通过共用限长下载器获取 .adui，再初始化 Viewer 并进入原授权/GLB/就绪流程。clear/cancel/destroy 和外部 signal 使旧下载失效，晚到结果不提交。

```powershell
node scripts/verify-model-app.mjs D:/Workspace/adui-studio/globe /model-check/
node scripts/verify-model-app.mjs D:/Workspace/adui-studio/globe ./
```

需 src/models 至少一个 GLB；工具检查双入口/base、密文数量与解密一致性、无原 GLB/明文/KEY 字面量，同时检查 Cesium 四类静态资源。产物保留 dist/model-verify，临时配置结束删除，不与同一工作区检查并行。旧快照缺少 loadBundledModel 时拒绝安装保护，不自动覆盖旧源码。
