# Agent 协作规则

本项目是 Vite+ 项目生成器；不是 `bn-health-pc` 业务工程。

1. 先阅读 [状态](docs/PROJECT_CONTEXT.md)、[需求](docs/REQUIREMENTS.md)、[架构](docs/ARCHITECTURE.md)、[代码索引](docs/CODEBASE_MAP.md)，再修改。
2. 用户当前明确要求优先于项目文档。任何“计划”不得称为“实现完成”。
3. **Vue 与 React 一律委托 Vite+ 官方 `vite:application`；Monorepo 委托 `vite:monorepo`。** 禁止替换为 create-vue / create-vite 或迁移路径。
4. 严禁新增 CI/CD、GitHub Actions、其他平台流水线、自动发布或自动部署配置。用户明确不需要 CI。
5. 保留官方模板原始结构；集成插件须兼容性验证、无覆盖式配置写入，不存储生产密钥。
6. 任何修改执行相应本地检查：`node --test`、`node scripts/validate-docs.mjs`；依赖可用时执行 `vp check`。未执行不得声称通过。
7. 提交信息优先中文 + emoji；不跳过 Git 检查。未经用户明确授权不得发布 npm / Release。
8. 必须更新相关文档：需求→[REQUIREMENTS](docs/REQUIREMENTS.md)，模块设计→[SDD](docs/SDD.md)，重大选型→[ADR](docs/adr/0001-official-viteplus-templates.md)，进度→[PROJECT_CONTEXT](docs/PROJECT_CONTEXT.md)。
9. Skills 见 [索引](docs/SKILLS.md)，本地开发与验证见 [Harness](docs/HARNESS.md)。
10. 严格保护未提交修改，避免无关重构、未授权依赖升级、凭据泄露、目录遍历与任意文件覆盖。
