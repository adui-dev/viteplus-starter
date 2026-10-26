# 详细设计

## 当前可用模块

`packages/create/src/options.mjs`:
- `validateProjectOptions({name,type,framework})`：名称限制为安全的小写 kebab-case；Application 强制 vue/react，Monorepo 不接受根框架参数。
- `buildVpCommand(options)`：组装 Vite+ 官方模板创建命令，不执行命令。

`packages/create/src/cli-args.mjs`：参数白名单、缺值和重复参数校验。

`packages/create/src/prompts.mjs`：交互式名称、类型、框架选择，非法名称重试，创建确认/取消。

`packages/create/bin/cli.mjs`:
- 支持 `--name`、`--type`、`--framework`、`--dry-run`、`--help`。
- 交互缺失选项可从终端读取，支持默认值与二次确认；取消时不调用 Vite+；非 TTY 必须显式传参。
- 已存在目标目录立即拒绝；仅执行白名单参数，不使用用户输入拼接 shell 命令字符串。
- 委托 `vp` 创建并传递退出状态；Application 向 `vite:application` 转发 `-- --template vue-ts|react-ts`。Windows 只使用白名单参数拼接单个 shell 命令避免 DEP0190，真实 Windows 创建仍需复验。

## UI/CSS 可选集成（已编写，待组合验收）

`packages/create/src/integrations.mjs`：
- `planIntegrations(options)`：按 Vue/React 生成白名单依赖清单，拒绝 React + Element Plus、Monorepo 根统一配置。
- `generateIntegration(options, viteConfig, mainSource)`：保留官方 Vite 配置，识别插件数组后仅添加引用 `starter.plugins.ts`；若结构无法识别则停止。
- `applyIntegrations(directory, options)`：先检查目标文件，再通过 pnpm 安装依赖，最后写入选中的样式和配置。安装失败时不写入配置，但生成项目可能已存在。
- Vue 使用 `unplugin-vue-components` 和对应 Resolver 按需引入组件；React 依赖自身组件导入机制；UnoCSS / Tailwind 均写入官方建议的插件与样式入口。
- 当前只支持独立 Application。Monorepo 各应用独立 UI/CSS 配置仍待实现和验证。
- 自动修改仅支持官方 Vue/React 的 `plugins: [...]` 格式以及标准 `src/main.ts[x]` 入口，不对未知结构强行变更。

## 规划模块（未实现）

- 进一步扩展选项 Schema：`engines`、`bigScreen`、`modelSecurity`（基础 `framework`、`ui`、`css` 已实现）。
- 插件合并器：先形成配置中间模型，再统一写入 Vite 配置和入口，避免重复覆盖。
- 3D 安全加载：AES-256-GCM 文件协议、授权密钥接口契约及 Three/Cesium/Babylon 适配。
- Monorepo 多应用：每个应用独立选择框架、UI、CSS、大屏及 3D。
- 失败恢复：区分生成前校验失败、模板执行失败与可选集成失败；避免错误清理他人已有文件。

## 需求追踪

- FR-001/002、NFR-001 → `packages/create/src/options.mjs`、`packages/create/src/cli-args.mjs`、`packages/create/src/prompts.mjs`、`packages/create/bin/cli.mjs`、`packages/create/test/*.test.mjs`。
- NFR-002/003 → `scripts/validate-docs.mjs`、`docs/HARNESS.md`。
- FR-003/004 → `packages/create/src/integrations.mjs`、`packages/create/test/integrations.test.mjs`（组合构建待验收）。
- FR-005 至 FR-008 → 规划，暂无实现文件或测试。

## 待确认

真实 Vue/React 生成的依赖和构建复验、Monorepo 子应用框架选择方式、最低支持 Vite+ 版本、npm 发布包名称、模型授权服务协议与大屏策略的正式参数契约。
