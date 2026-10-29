# 批量配置示例索引

所有 JSON 使用同一 version=1 格式，通过 Vite+ 官方 Monorepo/Application 模板生成。根目录名由 name 决定，输出相对命令执行目录；不要在生成器仓库或其他已有工作区里批量创建根。

| 文件                                               | 目标根名称              | 应用数 | 用途                                                              |
| -------------------------------------------------- | ----------------------- | ------ | ----------------------------------------------------------------- |
| [monorepo.batch.json](monorepo.batch.json)         | adui-batch-demo         | 2      | Vue TS/TDesign/UnoCSS + React JS/Ant Design/Tailwind，含 UI Smoke |
| [ui-libraries.batch.json](ui-libraries.batch.json) | adui-ui-libraries       | 3      | Element Plus、Ant Design Vue、React TDesign 的 UI Smoke 组合      |
| [screen.batch.json](screen.batch.json)             | adui-screen-demo        | 2      | 大屏应用及设计尺寸配置                                            |
| [three.batch.json](three.batch.json)               | adui-three-options-demo | 2      | Three 逐应用选项                                                  |
| [cesium.batch.json](cesium.batch.json)             | adui-cesium-workspace   | 2      | Cesium 静态资源和场景                                             |
| [babylon.batch.json](babylon.batch.json)           | adui-babylon-workspace  | 2      | Babylon 按需场景                                                  |
| [multi-engine.batch.json](multi-engine.batch.json) | adui-multi-workspace    | 2      | 多引擎组合与单应用隔离                                            |
| [models.batch.json](models.batch.json)             | adui-models-create-demo | 5      | 模型保护模式及 KEY 脚本                                           |

在仓库上级目录先预览，再按需实际创建（创建会安装依赖）：

```powershell
node ./viteplus-starter/packages/create/bin/cli.mjs --config ./viteplus-starter/examples/ui-libraries.batch.json --dry-run
node ./viteplus-starter/packages/create/bin/cli.mjs --config ./viteplus-starter/examples/ui-libraries.batch.json
```

已有根不能重跑批量新建。使用相同 JSON 对照检查或规划；显式恢复执行只新建缺失应用，部分完成的应用先人工处理。步骤见 [工作区说明](../docs/MONOREPO.md)。

本地校验全部示例：在生成器仓库运行 node scripts/verify-examples.mjs。该工具逐个使用真实 CLI --config --dry-run，临时目录验证结束清理；当前 8 个示例、20 个应用计划，actualBuilds=0。它不安装依赖、生成 KEY 或证明整个示例已实际构建；新 UI 示例的组合有独立代表项目验收记录，不宣称该三应用工作区本轮已生成。完整验收标准见 [V1 清单](../docs/V1_ACCEPTANCE.md)。
