# V1 本地验收与交付范围

本项目交付 Vite+ 项目生成器及逐应用预设。当前为本地已验证能力的收尾清单；没有据此发布 npm/Release，也不将所有组合标为完成。详细实测证据见 [项目状态](PROJECT_CONTEXT.md)，当前覆盖见 [能力表](GENERATOR_STATUS.md)。

## 入口选择

| 目标                  | CLI 入口                                               | 是否写入                       |
| --------------------- | ------------------------------------------------------ | ------------------------------ |
| 新建单应用            | --name / --type application / --framework，语言默认 ts | 是，委托官方模板               |
| 新建官方工作区        | --name / --type monorepo                               | 是，根不指定语言               |
| JSON 新建工作区与应用 | --config，先配 --dry-run 预览                          | 实际执行时写入                 |
| 已有工作区添加应用    | --workspace 加逐应用选项                               | 是，目标必须不存在             |
| 已有应用首次补装预设  | --apply-existing                                       | 是，已有输出冲突拒绝           |
| 查看已有工作区        | --inspect-workspace，可配 --config                     | 只读                           |
| 规划逐应用恢复        | --plan-recovery，必须 --config                         | 只读                           |
| 显式新建缺失应用      | --execute-recovery，必须 --config                      | 是；已有应用跳过，部分完成阻塞 |
| 组件库独立验收        | --ui-smoke，带对应框架/语言/UI/CSS                     | 只添加验收文件                 |
| 旧版引用修复          | --repair-existing                                      | 仅针对已知旧格式，备份后修复   |

检查/规划/恢复入口互斥，不与单项目创建参数混用。恢复执行不运行保存的计划 JSON 或 PowerShell 展示文本。参数详见 node packages/create/bin/cli.mjs --help；完整示例见 [示例索引](../examples/README.md)。

## 生成器仓库检查

```powershell
node --test
node scripts/validate-docs.mjs
node scripts/verify-examples.mjs
node scripts/verify-generator-matrix.mjs
vp check
```

示例工具只预览 8 个 JSON、20 个应用计划；组合工具只验证 462 个计划（含 330 个 UI Smoke 计划），二者 actualBuilds 都为 0。它们与单元测试分别检查真实 CLI 预览、选项/输出计划和失败边界，不能代替下述实际创建与运行。

## 端到端验收顺序

1. 在生成器仓库上级目录，使用 examples/monorepo.batch.json 先 dry-run，再实际新建一个不存在的目标。新建根与应用都必须经官方 Vite+ 入口，保留 website/utils。
2. 在新工作区运行 vp run ready、vp check。Vue TS/JS、React TS/JS 需至少分别执行各自完整 build 脚本；类型检查不能只用一个 vp build 代替。UI/CSS 及预设依赖留在各自应用。
3. UI 项目运行 verify-ui-build；大屏/引擎和模型按各自专项脚本验证独立入口与部署 base。临时构建配置结束清理，不与同一工作区其他构建并行。详见 [Harness](HARNESS.md)。
4. 浏览器验证实际组件、点击、CSS；大屏验证模式、容器尺寸、原生全屏与 canvas 缓冲区；模型用自包含 GLB 与对应 .adui 验证加载及清理。只运行正式首页构建不算独立验收页已渲染。
5. 用原 JSON 对已有工作区运行 inspect、plan；确认结构完整的已有应用只给出验证建议，部分完成应用列明人工处理，只有不存在且预检无冲突的应用才列出新建步骤。
6. 明确需要补齐缺失应用时运行 execute。确认原有应用文件保持、每阶段前后检查有效；重复执行应无新建步骤。故障/冲突使用受控临时测试验证，失败即停、保留现场，不破坏业务项目制造故障。
7. 核对根/应用清单、App/main、Vite 配置及备份；区分新增应用带来的共享锁/catalog 更新与已有应用源文件修改。保留实际命令退出码、构建和浏览器证据，再更新状态表。

普通 UI、CSS、大屏与三引擎的代表项目、模型加密构建及恢复执行均已有历史真实验证，见各专项文档和 PROJECT_CONTEXT；本轮只核对说明/示例，不重复声称重新完成全部浏览器验收。

## 范围与剩余限制

- 支持 Vue/React × TS/JS；Vue Element Plus/Ant Design Vue/TDesign、React Ant Design/TDesign；CSS none/UnoCSS/Tailwind。五种框架/UI 均有真实代表渲染记录，尚未穷举语言、CSS 和增强功能的全部组合。
- 三引擎逐应用按需加载、GLB/.adui 与 env 模型构建已接入，多引擎只选择一套模型保护配置。仅自包含 GLB、32 MiB 上限；FBX/OBJ、压缩解码器、远端资源和业务查看器不在已实现范围。
- 默认 embedded 无服务端；客户端密钥可被逆向，目标是提高直接复用成本。external 的独立授权来源由业务决定，不将浏览器解密称为无法提取。
- 工作区只支持官方 pnpm `apps/*`、`packages/*`、`tools/*` 布局。部分完成应用人工处理，不自动覆盖、删除、回滚或接管运行中新出现的目录，不承诺事务性或抵御恶意并发文件系统替换。
- 本地真实证据来自 Windows，包含 Node 22.18.0 的专项复验及既有 Node 24/26 记录；其他系统仍需专门验证。Node 支持范围与锁定 Vite+ 1.4.0 一致：`^22.18.0 || ^24.11.0 || >=26.0.0`，并非所有 Node 22。结构/依赖声明存在不代表安装完成或版本兼容。

这些限制是后续兼容性验收事项，不通过新增演示功能掩盖。后续以清单核对发现的实际阻塞为优先，发布与部署另行授权。

## 三应用 UI 示例端到端补验（2026-10-29）

ui-libraries.batch.json 已实际创建 adui-ui-libraries：Element Plus/Vue JS/Tailwind、Ant Design Vue/Vue TS/UnoCSS、TDesign/React JS/UnoCSS。首次批量在 Ant Design Vue 格式化阶段停止：共享 YAML 的相对子路径含 .. 被 Vite+ 拒绝。修复为应用和根策略分别在所属目录定向格式化；未删除失败现场，显式完成剩余步骤。随后在全新 adui-ant-vue-format-regression 中验证根→Ant Design Vue 应用→验收页三阶段一次通过，不将主工作区称为首次无干预生成成功。

主工作区 ready 9/9、最终 vp check 62 格式/28 代码文件通过，三个 UI 双入口构建通过。Chrome 三页均渲染真实组件，点击 0→1，CSS 绿色区域和 16px 内边距正确，warn/error 为空。默认 website/utils 的 19 个文件哈希一致，根无 UI/CSS/框架直接依赖；重复批量和重复三页生成均拒绝，29 项保护文件哈希一致。inspect/plan 状态正确，execute completed=0、skipped=3。构建保留官方 TypeScript API 实验性、UnoCSS 多入口及性能提示，不称为无提示。

本次将该示例的证据从计划补充到实际生成/构建/浏览器层；未改变其他平台、最低 Node 版本或全部组合的未覆盖声明。

## Node 22.18.0 专项复验（2026-10-30）

原 engines.node 的 >=22 过宽，已按锁定 Vite+ 1.4.0 的实际要求修正根与 create 包声明，并同步使用说明。仅安装托管的 22.18.0 缓存，通过进程环境选择，不修改系统 Node、全局默认、项目 pin 或仓库依赖版本；复验步骤见 [Harness](HARNESS.md#node-22-最低版本复验)。

Windows Node 22.18.0 下，210/210 测试、文档检查、8 个示例/20 个应用预览、462 个组合计划及根 vp check 通过。预览与计划的 actualBuilds 仍为 0。另以用户原 DamagedHelmet 执行 verify-model-build，两模式真实构建/解密、明文及密钥 HTTP 403、密文 HTTP 200、模型重加密和 env 轮换失效均通过；原 GLB 哈希保持，临时密钥/目录由工具清理。

仓库外 adui-node22-acceptance 使用临时 JSON 实际生成官方根、四个应用及两个 UI 验收页，共七个阶段成功：

| 应用     | 官方模板 | UI/CSS                | 验收入口 |
| -------- | -------- | --------------------- | -------- |
| vue-ts   | vue-ts   | Ant Design Vue/UnoCSS | UI Smoke |
| react-js | react    | Ant Design/Tailwind   | UI Smoke |
| vue-js   | vue      | none/none             | 官方首页 |
| react-ts | react-ts | none/none             | 官方首页 |

官方创建日志与实际 CLI 进程路径均确认 Node 22.18.0，包管理器为 pnpm 12.16.1。首轮 UI 安装的 pnpm.cmd 曾通过系统 Corepack 的 Node 24 转发，不把首轮安装称为全链路 Node 22。随后将官方 shim 目录放到临时 PATH 首位，确认 node/pnpm 解析来源，再完成离线冻结安装，锁文件 SHA256 一致；同一 Corepack 分发器也另由 Node 22 显式调用并完成冻结安装。

在该受控环境运行 vp run --no-cache ready，11/11 任务无缓存成功，含 utils 测试、四应用完整 build、Vue/React TS 类型检查和官方 website/utils 构建。第一次误把 --no-cache 放在任务名后导致参数被转发给构建器，改正命令后通过，没有为此修改生成源码。两个 UI 应用分别通过 /ui-check/ 与 ./ 的首页+验收页构建，最终 vp check 69 格式/28 代码文件通过。保留 TypeScript 7 API 实验性、UnoCSS 多入口及构建性能提示。

inspect 找到六个成员、四个应用 present；plan 均为 validate-existing；execute completed=[]、skipped=4。上述入口执行前后 48 项根/应用源文件哈希一致，官方 website/utils 的 19 项原文件从添加应用前到验证结束保持一致；根无框架/UI/CSS 直接依赖，临时 UI 构建配置已移除，专项产物保留。临时 JSON 和哈希记录结束清理。

本轮验证 Node 22.18.0 的代表生成器与构建路径，没有新增浏览器验收，也不宣称首次安装始终未经过其他 Node、全部引擎组合或其他操作系统已验证。下一步检测可用的 Linux 验证环境，按同一清单补齐跨平台证据，不扩大预设或查看器功能。
