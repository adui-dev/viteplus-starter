# Babylon 应用生成预设

--engine babylon 在官方 Vite+ Vue/React、TS/JS 模板上增加 @babylonjs/core 9.32.1、框架生命周期组件及 /babylon-smoke.html 独立验收页。正式 App、main、首页和 Vite 配置均不修改；首期没有模型加载、模型保护或多引擎多选。

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

Monorepo 使用 [babylon.batch.json](../examples/babylon.batch.json)，根交给 vite:monorepo，成员交给 vite:application。已有根用 --workspace <路径> 逐个添加。依赖只写所选应用，官方 catalog: 通过本应用已安装元数据校验，不执行包入口、不升级已有未知版本。Three 仍默认 embedded；Babylon 不生成 KEY 脚本，显式 embedded/external 拒绝。

## 生命周期与构建

页面初始只导入 lazy/demo；点击才导入 Babylon 场景，采用 ES 模块深路径导入所需 Engine、Scene、材质与几何。导入过程中卸载会丢弃晚到结果；失败允许重试。初始化异常或渲染错误停止循环、释放 Scene/Engine 并清除画布，卸载断开本实例 ResizeObserver。尺寸变化调用 engine.resize；不宣称测量 GPU 驱动堆或清空引擎模块级缓存。

默认 vp run build 只构建官方首页。专项脚本构建 index.html + babylon-smoke.html，确认场景独立分块及部署 base：

```powershell
node scripts/verify-babylon-build.mjs D:/Workspace/adui-studio/cube
node scripts/verify-babylon-build.mjs D:/Workspace/adui-studio/cube ./
```

临时配置用 wx 创建，结束删除，产物保存在 dist/babylon-verify。不要与同一项目或工作区的检查并行；默认首页构建可能清空这些专项产物。支持 /、/子路径/、./ 的 HTTP 部署，不承诺 file:// 直接打开。保留构建器默认体积提醒。

API 与模块导入依据见 [Babylon 官方 ES 模块说明](https://doc.babylonjs.com/setup/frameworkPackages/npmSupport/)、[官方模块拆分说明](https://doc.babylonjs.com/setup/frameworkPackages/es6Support/treeShaking/)。真实执行范围与结果见 [状态记录](PROJECT_CONTEXT.md)，计划矩阵不等同全部组合真实构建。
