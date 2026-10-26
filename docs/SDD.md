# 详细设计

## 官方模板语言选择（新增）

- Application 的 `--language ts|js` 默认 `ts`。Vue 选 `vue-ts` 或 `vue`；React 选 `react-ts` 或 `react`，全部使用 Vite+ 官方 `vite:application`，不再自行运行其他生成器。
- `options.mjs` 负责框架 × 语言的模板映射及校验；`cli-args.mjs` 解析 `--language`；`prompts.mjs` 在框架后询问语言，默认 TypeScript。
- Monorepo 根目录禁止传 `--language`；后续需为各子应用独立设置。
- `integrations.mjs` 按语言选择 `src/main.ts` / `src/main.js`（Vue）和 `src/main.tsx` / `src/main.jsx`（React），同时识别实际存在的 `vite.config.ts|mts|js|mjs`。若存在多个 Vite 配置则拒绝自动修改。
- UnoCSS 配置采用 `uno.config.ts|js`；Vue JavaScript 组件自动导入设置 `dts: false`，Vue TypeScript 保留 `src/components.d.ts` 及对应格式忽略规则。
- 旧版 `starter.plugins.ts` 的迁移只适用于历史 TypeScript 工程；JS 创建和 `--apply-existing` 不使用此历史格式。
- 完成代码级参数/生成验证，但实际 JS 项目创建、依赖安装与 `vp check/build` 仍需在 Windows Vite+ 环境验收。


## P3 生成器修复：插件内联与旧配置修复

- `packages/create/src/format-config.mjs`：仅针对 Vue UI 自动导入，向 Vite+ `fmt.ignorePatterns` 添加 `src/components.d.ts`，避免自动生成的类型声明在重新生成后造成不稳定格式检查。保留原有 `fmt`、`ignorePatterns`，重复调用不新增重复条目；不支持的配置格式拒绝修改。该规则仅影响格式检查，不关闭 Lint 或 TypeScript。

- `generateIntegration` 在 `vite.config.ts` 内联 Vite 插件的 import 和工厂调用，避免 `starter.plugins.ts` 跨文件导入；兼容普通数组、`lazyPlugins` 及无插件字段的 Vite+ 配置。
- `applyIntegrations` 在写入后调用 `vp fmt . --write`，不得跳过失败。
- `--repair-existing` 仅用于符合已知 Starter 旧格式的现有 Vue/React Application：先验证项目类型、旧插件文件及配置形态，再替换旧导入并将 `starter.plugins.ts` 备份为 `starter.plugins.ts.bak`，随后格式化；**不安装依赖，也不重建项目**。
- 此功能不是通用任意 TypeScript 配置的转换器，无法识别的结构必须拒绝修改；真实 Windows `vp check` 待用户复验。


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
- `generateIntegration(options, viteConfig, mainSource)`：保留 Vite+ 官方配置，不再仅识别直接数组；调用 `vite-config.mjs` 兼容顶层普通 plugins、lazyPlugins 或无 plugins 情况，未知结构停止。
- `applyIntegrations(directory, options)`：在安装依赖前先生成并校验修改后的配置、检查目标文件是否存在；校验失败不安装依赖。安装失败时不写入插件配置，但官方基础项目可能已存在。
- 新增 `--apply-existing` 显式补装：校验原目录、package.json 中的 `vite-plus` 及 Vue/React 依赖，再对已有的官方基础应用安装所选集成；不重新执行 `vp create`。
- Vue 使用 `unplugin-vue-components` 和对应 Resolver 按需引入组件；React 依赖自身组件导入机制；UnoCSS / Tailwind 均写入官方建议的插件与样式入口。
- 当前只支持独立 Application。Monorepo 各应用独立 UI/CSS 配置仍待实现和验证。
- `collectProjectOptions` 基础参数已全部提供时直接返回校验结果，未指定 UI/CSS 默认视为 None；修复 P3 新增交互字段导致的非交互单元测试回归。
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
