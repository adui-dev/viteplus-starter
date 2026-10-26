# 代码索引

> 本文件仅列出本次初始化实际新增的关键路径。规划模块不视为已存在。

| 路径 | 作用 |
| --- | --- |
| `package.json` | 工作区根信息及本地检查入口 |
| `pnpm-workspace.yaml` | packages 工作区声明 |
| `vite.config.ts` | 根部 Vite+ 最小配置，尚未做完整构建验证 |
| `packages/create/bin/cli.mjs` | 初始化 CLI 入口 |
| `packages/create/src/cli-args.mjs` | 参数白名单和重复参数校验 |
| `packages/create/src/prompts.mjs` | 项目交互选择、确认和取消 |
| `packages/create/test/cli.test.mjs` | 交互流程与参数解析单元测试 |
| `packages/create/src/options.mjs` | 创建选项白名单校验及官方命令组装 |
| `packages/create/test/options.test.mjs` | 创建选项基础单元测试 |
| `scripts/validate-docs.mjs` | 本地文档检查 |
| `.agents/skills/starter-preset-development/SKILL.md` | 本项目可复用的集成预设开发工作流 |
| `AGENTS.md` | Agent 规则及导航入口 |
| `docs/` | 需求、架构、设计、状态、Skills、Harness、ADR |

计划中的 UI、CSS、3D、大屏及模型安全模块**尚无真实实现目录**。
