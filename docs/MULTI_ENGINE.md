# 按应用多引擎生成

完整批量样例见 [multi-engine.batch.json](../examples/multi-engine.batch.json)。

CLI 新增 --engines three,cesium,babylon；JSON 应用新增 engines 字符串数组，与旧 engine 互斥。只允许三个已支持引擎的非空、不重复子集，不允许 none。旧 --engine/JSON engine 和交互单选保持兼容，交互多选尚未接入。

```powershell
node ./viteplus-starter/packages/create/bin/cli.mjs --name multi-app --type application --framework vue --screen --engines three,cesium,babylon
```

新建必须 --screen；已有匹配大屏应用可 --apply-existing，所有所选输出/版本在写入前统一预检。顺序固定 Three → Cesium → Babylon，只有首阶段创建官方基础工程、集成 UI/CSS 与大屏，之后复用补装流程；每引擎有独立源码目录和验收页，不实现同页场景混用或切换。包含 Three 时模型保护默认 embedded，仅安装到 Three 阶段；可显式 none/external。仅选择 Cesium/Babylon 时不支持启用模型保护。

批量 JSON 示例应用：{"name":"viewer","framework":"react","screen":true,"engines":["three","babylon"],"modelProtection":"none"}。根仍委托官方 vite:monorepo，成员委托 vite:application。dry-run 列出合并依赖、文件、各验收地址及模型保护生成标记，不生成 KEY。每阶段失败停止，保留已生成内容，不回滚、覆盖续跑或跳过冲突。

执行 node scripts/verify-multi-build.mjs <应用路径> 联合构建官方首页及已有引擎/模型验收页；临时配置结束删除，产物在 dist/multi-verify，不与同一工作区的 check/ready 并行。联合构建不等同全部引擎同页运行，浏览器组合渲染仍需独立验收。具体执行结果见 [状态](PROJECT_CONTEXT.md)。
