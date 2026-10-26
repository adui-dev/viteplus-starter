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
node packages/create/bin/cli.mjs --name demo-app --type application --dry-run
node --test
node scripts/validate-docs.mjs
vp check
```

`vp check` 需完整工具链可用。没有网络或依赖时明确记录失败原因，不绕过检查或伪造通过结果。

## 实际创建验收（需有 vp 环境）

```powershell
node packages/create/bin/cli.mjs --name demo-app --type application
```

在官方交互中分别验证 Vue、React。Monorepo 用 `--type monorepo` 验证。目标目录必须不存在；创建完成后在生成项目中运行官方提供的本地检查、测试与构建命令。测试结束前不要删除非本工具创建的目录。

## 文档校验的边界

现有脚本检查必要文件、常规相对 Markdown 链接和需求标题编号重复。它**不等于**完整 Markdown 语义、Skills 安全审核、所有 ADR 和需求追踪一致性验证。

## 已知环境限制

本轮执行环境有 Node.js，但无 `vp`；npm 注册表不可达，未运行真实 Vite+ 生成及构建验收。
