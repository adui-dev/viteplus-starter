# Babylon 应用生成预设

--engine babylon 在官方 Vite+ Vue/React、TS/JS 模板上增加 @babylonjs/core 与 @babylonjs/loaders 9.32.1、框架生命周期组件及 /babylon-smoke.html 独立验收页。正式 App、main、首页保留。支持本地 GLB、授权回调解密 .adui、env 自动加密打包及 [多引擎组合](MULTI_ENGINE.md)。默认启用 embedded 模型保护，Vite 配置备份后增量加入模型插件；--model-protection none 时不修改 Vite 配置。

## 创建与补装

在生成器仓库上级目录执行，目标名称必须不存在：

```powershell
node ./viteplus-starter/packages/create/bin/cli.mjs --name cube --type application --framework vue --screen --engine babylon
cd cube
vp check
vp run build
vp dev
```

打开终端端口下的 /babylon-smoke.html，点击“加载 Babylon”查看本地立方体。React 改用 --framework react；JavaScript 加 --language js。组件放入 AdScreen 原生像素引擎层，不依赖在线纹理、CDN、Token 或额外静态资源插件。首期不提供查看器操作工具。

已有匹配框架/语言的大屏应用可用 --engine babylon --apply-existing；普通官方应用可同时加 --screen 首次补装。拒绝已占用文件、输出路径链接/junction、未知依赖版本；安装后再次预检，不覆盖安装期间新建的用户文件。失败保留依赖安装与现场，不宣称事务回滚。

Monorepo 使用 [babylon.batch.json](../examples/babylon.batch.json)，根交给 vite:monorepo，成员交给 vite:application。已有根用 --workspace <路径> 逐个添加。依赖只写所选应用，官方 catalog: 通过本应用已安装元数据校验，不执行包入口、不升级已有未知版本。Three/Babylon 均默认 embedded；可选 external 或 none，每应用独立生成 KEY 与轮换脚本。

## 生命周期与构建

页面初始只导入 lazy/demo；点击才导入 Babylon 场景，采用 ES 模块深路径导入所需 Engine、Scene、材质与几何。导入过程中卸载会丢弃晚到结果；失败允许重试。初始化异常或渲染错误停止循环、释放 Scene/Engine 并清除画布，卸载断开本实例 ResizeObserver。尺寸变化调用 engine.resize；不宣称测量 GPU 驱动堆或清空引擎模块级缓存。

默认 vp run build 只构建官方首页。专项脚本构建 index.html + babylon-smoke.html，确认场景独立分块及部署 base：

```powershell
node scripts/verify-babylon-build.mjs D:/Workspace/adui-studio/cube
node scripts/verify-babylon-build.mjs D:/Workspace/adui-studio/cube ./
```

临时配置用 wx 创建，结束删除，产物保存在 dist/babylon-verify。不要与同一项目或工作区的检查并行；默认首页构建可能清空这些专项产物。支持 /、/子路径/、./ 的 HTTP 部署，不承诺 file:// 直接打开。保留构建器默认体积提醒。

API 与模块导入依据见 [Babylon 官方 ES 模块说明](https://doc.babylonjs.com/setup/frameworkPackages/npmSupport/)、[官方模块拆分说明](https://doc.babylonjs.com/setup/frameworkPackages/es6Support/treeShaking/)。真实执行范围与结果见 [状态记录](PROJECT_CONTEXT.md)，计划矩阵不等同全部组合真实构建。

## 本地 GLB 与 .adui

点击加载引擎后，通过“Babylon 模型文件”选择 GLB。模型通过共享 GLB 2.0 检查后才动态加载 glTF loader；仅支持最大 32 MiB 的自包含模型，拒绝外部 URI、Draco/KTX2/Meshopt 压缩及未列入适配范围的扩展，不自动请求外部解码器。模型缩放至最长边 2 并居中，使用本地光照；这只是集成验收，不增加旋转缩放等查看器工具。

.adui 文件和独立验收密钥的生成命令见 [MODEL_SECURITY](MODEL_SECURITY.md)。先选择“Babylon 验收密钥”，再选择匹配的 .adui；文件只在浏览器本地读取。缺少授权或认证失败不安装模型；成功替换后释放旧 AssetContainer，失败保留旧模型。清除模型、清除授权和卸载会使待处理请求失效，晚到容器不加入场景并释放。

代码接入通过 createLazyScene 返回的 loadModel(buffer, {encrypted: true, authorize})，授权契约复用共享 decryptAdui。临时解密缓冲最终清零；加载器持有的独立字节副本随资产生命周期管理，不承诺抹除全部内存或 GPU 副本。API 依据 [官方加载说明](https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/importers/loadingFileTypes.md) 与 [glTF 支持说明](https://doc.babylonjs.com/features/featuresDeepDive/importers/glTF/)。

## env 自动加密与构建目录

新应用默认生成 src/models、被忽略的 .env.local、models:keygen/models:keyrotate 脚本、独立 /model-smoke.html。将 GLB 放入 src/models 后运行 vp dev，模型验收页通过同源 .adui 目录自动下载、解密并加载；生产构建只输出密文。普通 vp run build 保留官方首页入口；专项页面构建需显式加入 model-smoke.html，详见 [MODEL_BUILD](MODEL_BUILD.md)。

external 模式先选择独立解锁 JSON，再加载构建目录；锁定清除当前模型与待处理请求。none 模式保留本地文件验收，不生成模型插件、env 或 KEY 脚本。多引擎共用一个模型目录与插件，同时包含 Three 时模型验收页沿用 Three；没有 Three 的 Babylon/Cesium 组合继续使用 Babylon。

```powershell
node scripts/verify-model-app.mjs D:/Workspace/adui-studio/cube /model-check/
node scripts/verify-model-app.mjs D:/Workspace/adui-studio/cube ./
```

该工具需 src/models 中至少一个 GLB，输出 dist/model-verify，验证双入口/base、密文数量与解密一致性、无原 GLB/明文及原始 KEY 字面量。不要与同一项目或工作区的检查/构建并行。客户端拆分密钥可以被逆向，旧 Babylon 源码快照不覆盖升级；旧版缺少 loadBundledModel 时拒绝自动安装保护。
