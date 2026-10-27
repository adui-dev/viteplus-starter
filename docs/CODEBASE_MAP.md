# 代码索引

## 2026-10-26 P3 结构更新

- `packages/create/src/format-config.mjs`：向 Vite+ 根 `fmt.ignorePatterns` 安全合并 Vue 自动生成的 `src/components.d.ts`。
- `packages/create/test/format-config.test.mjs`：默认 fmt、已有格式规则、幂等、异常结构测试。

- `packages/create/src/vite-config.mjs`：内联 Vite 插件和已知旧版 `starter.plugins` 引用迁移。
- `packages/create/src/integrations.mjs`：执行 `vp fmt . --write`，提供不重装依赖的旧项目修复函数。
- `packages/create/bin/cli.mjs`：新增 `--repair-existing`，保留 `--apply-existing`。
- 新生成项目不再创建 `starter.plugins.ts`；该文件仅可能存在于旧版本，修复后保留 `.bak` 备份。

> 本文件仅列出本次初始化实际新增的关键路径。规划模块不视为已存在。

| 路径                                                 | 作用                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| `package.json`                                       | 工作区根信息及本地检查入口                                            |
| `pnpm-workspace.yaml`                                | packages 工作区声明                                                   |
| `vite.config.ts`                                     | 根部 Vite+ 最小配置，尚未做完整构建验证                               |
| `packages/create/bin/cli.mjs`                        | 初始化 CLI 入口                                                       |
| `packages/create/src/cli-args.mjs`                   | 参数白名单和重复参数校验                                              |
| `packages/create/src/prompts.mjs`                    | 项目交互选择、确认和取消                                              |
| `packages/create/test/cli.test.mjs`                  | 交互流程与参数解析单元测试                                            |
| `packages/create/src/integrations.mjs`               | UI/CSS 依赖计划、配置与样式生成、安装接入                             |
| `packages/create/src/vite-config.mjs`                | 安全识别官方 Vite+ 顶层插件字段、兼容 lazyPlugins 并注入 Starter 插件 |
| `packages/create/test/vite-config.test.mjs`          | 插件字段多形态识别、嵌套字段与未知结构回归测试                        |
| `packages/create/test/integrations.test.mjs`         | UI/CSS 兼容规则和生成文件单元测试                                     |
| `packages/create/src/options.mjs`                    | 创建选项白名单校验及官方命令组装                                      |
| `packages/create/test/options.test.mjs`              | 创建选项基础单元测试                                                  |
| `scripts/validate-docs.mjs`                          | 本地文档检查                                                          |
| `.agents/skills/starter-preset-development/SKILL.md` | 本项目可复用的集成预设开发工作流                                      |
| `AGENTS.md`                                          | Agent 规则及导航入口                                                  |
| `docs/`                                              | 需求、架构、设计、状态、Skills、Harness、ADR                          |

UI/CSS 已在 `integrations.mjs` 实现；3D、大屏及模型安全模块**尚无真实实现目录**。

## P4 Monorepo 多应用

- `packages/create/src/workspace.mjs`：工作区预检、安全成员路径、同名包检查和根声明忽略规则增量合并。
- `packages/create/test/workspace.test.mjs`：官方命令参数、配置隔离、目录与 junction 保护、真实 CLI dry-run/覆盖拒绝。
- `docs/MONOREPO.md`：逐应用创建、检查及边界说明。

## UI Smoke 验收工具

- `packages/create/src/ui-smoke.mjs`：在已有应用内生成隔离 UI 验收页，不覆盖业务文件。
- `packages/create/test/ui-smoke.test.mjs`：涵盖 Vue/React、JS/TS、依赖预检、文件覆盖保护。
- `docs/UI_SMOKE.md`：独立页面的运行、人工验收和清理说明。
