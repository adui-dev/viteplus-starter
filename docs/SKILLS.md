# Skills 索引

| Skill                      | 位置                                                              | 状态                                                             |
| -------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| starter-preset-development | [SKILL.md](../.agents/skills/starter-preset-development/SKILL.md) | 项目自有；已用于 P3/P4 集成与实机验收                            |
| git-commit                 | [SKILL.md](../.agents/skills/git-commit/SKILL.md)                 | 按逻辑分步暂存、检查和提交；遵循项目历史提交格式                 |
| gitmoji                    | [SKILL.md](../.agents/skills/gitmoji/SKILL.md)                    | 为中文 Conventional Commits 选择意图一致的 emoji；不单独执行提交 |

## 使用约定

新增 UI/CSS/3D/大屏等预设时，先读 Skill，确保只增强 Vite+ 官方基础模板，执行组合兼容校验与本地验证。不自动安装、执行未经审查的第三方 Skill。新增或修改 Skill 时更新本索引。

## 2026-10-27 清理

本次只清理仓库内 `.agents/skills`，20 个保留 3 个，移除 17 个；不影响全局或插件自带的共享 Skills。第三方保留项来自 `github/awesome-copilot`，来源与安装哈希保留在根 `skills-lock.json`，未修改其原始指令。

- 移除仓库不适用或无对应服务的 `code-review`（Awesome Copilot 专用）、`codebase-memory-mcp`。
- 移除重复流程 `commit-message-storyteller`、`conventional-commit`、`conventional-branch`、`git-flow-branch-creator`。
- 移除当前未采用的 Issue/Release 流程 `create-github-issue-feature-from-specification`、`create-github-issues-feature-from-implementation-plan`、`create-github-issues-for-unmet-specification-requirements`、`github-issues`、`github-release`。
- 移除当前未使用的 `context-map`、`create-implementation-plan`、`create-readme`、`editorconfig`、`draw-io-diagram-generator`、`drawio`；现有需求/设计/代码索引与 Mermaid 已覆盖当前文档流程。

保持历史提交风格：`emoji type(scope): 中文说明`。Git 提交与推送仍需用户授权，不跳过本地检查和 Git hooks；保留 Skill 不表示授权发布 npm 或 GitHub Release。
