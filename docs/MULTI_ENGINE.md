# 按应用多引擎生成

完整批量样例见 [multi-engine.batch.json](../examples/multi-engine.batch.json)。

CLI 新增 --engines three,cesium,babylon；JSON 应用新增 engines 字符串数组，与旧 engine 互斥。只允许三个已支持引擎的非空、不重复子集，不允许 none。旧 --engine/JSON engine 和交互单选保持兼容，交互多选已接入。

```powershell
node ./viteplus-starter/packages/create/bin/cli.mjs --name multi-app --type application --framework vue --screen --engines three,cesium,babylon
```

新建必须 --screen；已有匹配大屏应用可 --apply-existing，所有所选输出/版本在写入前统一预检。顺序固定 Three → Cesium → Babylon，只有首阶段创建官方基础工程、集成 UI/CSS 与大屏，之后复用补装流程；每引擎有独立源码目录和验收页，不实现同页场景混用或切换。选择任一引擎时模型保护默认 embedded，可显式 none/external。只安装一套模型目录、插件、KEY 和 model-smoke 页面：优先级为 Three → Babylon → Cesium，保留已有组合入口。

多引擎补装的基础样式、模型保护或引擎前置检查失败时，统一报告“阶段：补装预检”、绝对目标目录和原因，“已完成”为“无”。这些检查在首个引擎子阶段执行前完成；先处理报告中的清单或输出冲突，再按原规则补装。

批量 JSON 示例应用：{"name":"viewer","framework":"react","screen":true,"engines":["three","babylon"],"modelProtection":"none"}。根仍委托官方 vite:monorepo，成员委托 vite:application。dry-run 列出合并依赖、文件、各验收地址及模型保护生成标记，不生成 KEY。每阶段失败停止，保留已生成内容，不回滚、覆盖续跑或跳过冲突。

子阶段返回有效非零正整数退出码时，多引擎 CLI 会保留该码；例如阶段退出 23，PowerShell 的 $LASTEXITCODE 也是 23。启动失败或信号终止等没有有效退出码的情况返回 1。先核对报错阶段与保留现场，修复原因后再按已有工程的补装规则处理；不自动重试或认为后续阶段已完成。

--engines 的 dry-run 还在顶层显示实际执行目录 cwd 与绝对目标 target，保留原 official 对象。在下载工具中启动时，独立应用以工具父目录为 cwd；配合 --workspace 时改为已解析的工作区根，target 为其 apps/<name>，可据此核对位置。创建完成的普通 CLI 提示也会显示绝对项目目录。

执行 node scripts/verify-multi-build.mjs <应用路径> 联合构建官方首页及已有引擎/模型验收页；临时配置结束删除，产物在 dist/multi-verify，不与同一工作区的 check/ready 并行。联合构建不等同全部引擎同页运行，浏览器组合渲染仍需独立验收。具体执行结果见 [状态](PROJECT_CONTEXT.md)。

交互菜单用方向键移动、空格勾选引擎、回车确认；不勾选表示不启用，选择任一引擎后询问模型保护。参数模式 --engines 仍使用 three,cesium,babylon 等逗号列表。联合验收脚本的分块设置与静态入口检查用于避免跨引擎提前加载。自定义联合入口构建请采用相同的 output.codeSplitting 分组、includeDependenciesRecursively=false、strictExecutionOrder=true；这不是对任意业务构建配置的自动修复。
