# 本地开发 Harness

本项目**不使用 CI/CD**。所有检查由开发者本地手动执行。

## 环境

- Node.js 22+（计划最低版本，尚待官方工具链版本验证）
- pnpm
- Vite+ CLI（`vp`）

## 安装与验证

```powershell
pnpm install
node packages/create/bin/cli.mjs --help
# 交互式创建（在独立测试目录执行）
node packages/create/bin/cli.mjs
node packages/create/bin/cli.mjs --name demo-vue --type application --framework vue --dry-run
node packages/create/bin/cli.mjs --name demo-react --type application --framework react --dry-run
node --test
node scripts/validate-docs.mjs
vp check
```

`vp check` 需完整工具链可用。没有网络或依赖时明确记录失败原因，不绕过检查或伪造通过结果。

## 实际创建验收（需有 vp 环境）

```powershell
node packages/create/bin/cli.mjs --name demo-vue --type application --framework vue
node packages/create/bin/cli.mjs --name demo-react --type application --framework react
```

在两个生成目录的 package.json 分别核对 Vue/React 依赖，再运行 `vp check`、`vp build` 和 `vp dev`。Monorepo 使用 `--type monorepo` 单独验证。目标目录必须不存在；创建完成后在生成项目中运行官方提供的本地检查、测试与构建命令。测试结束前不要删除非本工具创建的目录。

## 文档校验的边界

现有脚本检查必要文件、常规相对 Markdown 链接和需求标题编号重复。它**不等于**完整 Markdown 语义、Skills 安全审核、所有 ADR 和需求追踪一致性验证。

## 已知环境限制

用户已确认 Vue/React 显式框架创建成功；本轮新交互逻辑通过 Node 22 的 11 项单元测试，Windows 交互终端创建仍待复验。
