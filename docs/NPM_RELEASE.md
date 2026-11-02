# npm 首发准备

包名为 `@adui/viteplus-starter`，命令名为 `viteplus-starter`。当前 CLI 候选版本暂按 **0.1.0** 准备，仍设置 `private: true`，尚未发布；仓库根作为开发工作区继续保留 0.0.0/private。

## 本轮候选包

在仓库根运行：

```powershell
$bundle = npm --silent run cli:pack | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'CLI 打包失败' }
$bundle.tarball
$contents = Get-Content -LiteralPath $bundle.contents -Raw | ConvertFrom-Json
$contents | Select-Object name, version, private, license, fileCount, integrity
$contents.files | Format-Table path, size
```

tarball 与 `pack-contents.json` 放在同一个独立产物目录，互不覆盖已有包。清单来自 npm pack 的实际结果，包含每个文件的路径/字节数、压缩和解压大小、SHA-512 integrity、版本和 private 状态；清单自身不进入包。

打包器核对包名、版本和文件名，拒绝未知目录、隐藏/越界路径、测试、node_modules、模型文件与重复项，检查 CLI 入口、本地 normalize.css 和两份许可文件。包包含生成器及预设的运行时源码、README、MIT LICENSE；不包含仓库测试、环境文件、锁文件或用户模型，不带安装生命周期脚本。允许的运行时源码仍应在发布前结合 diff 和完整清单审阅；路径检查不代替内容审阅。

元信息来自 packages/create/package.json：MIT、Git 仓库、主页、问题反馈地址，以及预期的 public/官方 registry 发布配置。根 LICENSE 与 normalize.css 原许可都随包携带，不修改已有版权内容。

## 本地安装验收

在仓库外新建自有临时安装目录，使用候选 tarball 安装，禁用安装脚本：

```powershell
$checkRoot = Join-Path ([IO.Path]::GetTempPath()) ('adui-cli-check-' + [Guid]::NewGuid().ToString('N'))
npm install --prefix $checkRoot --ignore-scripts --no-audit --no-fund --package-lock=false $bundle.tarball
if ($LASTEXITCODE -ne 0) { throw '候选包安装失败' }
& (Join-Path $checkRoot 'node_modules\.bin\viteplus-starter.cmd') --help
```

再从不同调用目录验证 Vue/React 的 --dry-run 和向导取消，确认没有创建项目。--dry-run 证明参数/资源读取与目标目录计算，不证明实际应用构建；实际创建/补装的历史代表证据见 [验收记录](V1_ACCEPTANCE.md)。本轮打包没有修改预设或官方模板调用，不为此重建历史业务现场。

## 发布前的人工条件

1. 确认首发版本、Git 提交、清单内容与本地安装结果。
2. 使用官方 registry 检查 npm 登录身份和 `@adui` 作用域权限。登录成功不自动证明作用域可写；E404 仅说明当前查询未找到可见包，不能据此证明名称空闲或拥有权限。
3. **只有用户明确授权发布后**，才同步版本/README 状态并调整 CLI 源清单的 private 状态，重新打包、核对新 integrity 并复验；工作区根继续 private。打包器读取源 private 布尔值，不另藏一个相互冲突的固定值。
4. 最终发布必须指向已复验的 CLI tarball，不能在仓库根误发整个开发工作区。不添加流水线、安装钩子发布或其他自动发布入口。

截至 2026-11-03 的只读检查：npm whoami 返回 ENEEDAUTH；公开 registry 对 @adui/viteplus-starter 返回 E404，作用域权限未核实。没有登录或创建 token，未直接读取或记录任何凭据内容，也没有上传候选包。

`private: true` 会让 npm 拒绝发布；publishConfig 只声明将来发布时的目标设置，不会自行执行发布。依据：[npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#private)。scoped 公共包的可见性与身份要求以 [npm 官方发布说明](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) 为准；本项目当前只做本地准备。
