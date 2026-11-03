# npm 分发与发布记录

包名为 [`@adui/viteplus-starter`](https://www.npmjs.com/package/@adui/viteplus-starter)，命令名为 `viteplus-starter`。**当前公开版本为 0.1.1，latest 指向 0.1.1**；0.1.0 于 2026-11-03 首发。CLI 清单为 private:false，开发工作区根继续保留 0.0.0/private。

## 0.1.0 首发结果

- 用户已明确授权 public/latest 发布，账号 adui 完成 npm 浏览器身份验证；上传命令成功退出。registry 处理后版本公开可用，无需再次上传或单独执行 stage。
- 实际上传的是发布前复验的 dist/cli/pack-M7ZfKt/adui-viteplus-starter-0.1.0.tgz，共 92 文件、101318 字节。公开下载与本地候选 SHA-512 完全一致：`sha512-f6j8l2ZGlk5f8sip73q2liIkkirkOJnrXVgAgtHRyTab7dLfI0/qzI/J1diX1KhWpTxkx1OawxJVlPQMuY3xPg==`。
- 291 项测试、隔离安装、Windows shim、Vue/React 预览与 publish dry-run 通过。真实 registry 包名调用 vp dlx / pnpm dlx 的帮助及 Vue/React 配置预览通过，未创建目标；registry 返回的 version/latest/integrity 均已核对。预览不等同新的应用构建，生成能力的代表实测见项目状态。
- 本轮未添加自动发布配置、CI/CD 或 GitHub Release。原始 Logo 与用户已安装 Skill 保持；根完整 vp check 仍仅受该第三方 Skill 的既有格式问题影响，分发内容不包含该 Skill。

## 0.1.1 Keywords 修正发布

0.1.0 未提供 keywords，npm 页面因此显示 none。CLI 源清单补齐 20 个与实际功能相关的关键词，并由 cli-package 显式传入独立包清单；pack-contents.json 同步展示关键词，回归直接核对暂存 package.json，防止只修改源码却在打包时遗漏。

用户已另行授权公开发布0.1.1，并完成本次npm浏览器身份验证。registry已确认version/latest均为0.1.1，版本keywords与包级keywords均为完整20项；公开下载与候选包SHA-512一致，vp dlx / pnpm dlx 的0.1.1包名帮助均通过。

本次上传的是已验收的dist/cli/pack-vn2jGH/adui-viteplus-starter-0.1.1.tgz，92文件、101415字节，integrity为 `sha512-e4SimgM9NtNZLtKmwBxxxG3d2xsLbgmI0tt6RUHP93kkosqw5sJReSJ1gOW0VruXlJZLYVz6XDXhNspcE2ulLw==`。与0.1.0相比仅package.json和README不同，其余90文件完全一致；上一轮291项回归通过，本轮不改变CLI运行逻辑、依赖或生成输出。已发布版本不可覆盖，更新应发布新版本，参考 [npm 版本更新说明](https://docs.npmjs.com/updating-your-published-package-version-number/)。

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

打包器核对包名、版本和文件名，拒绝未知目录、隐藏/越界路径、测试、node_modules、模型文件与重复项，检查 CLI 入口、原始 Logo、本地 normalize.css 和两份许可文件。包包含生成器及预设的运行时源码、README、MIT LICENSE；不包含仓库测试、环境文件、锁文件或用户模型，不带安装生命周期脚本。允许的运行时源码仍应在发布前结合 diff 和完整清单审阅；路径检查不代替内容审阅。

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

1. 首发版本 0.1.0 已确认；发布前核对 Git 提交、清单内容与本地安装结果。
2. 使用官方 registry 检查 npm 登录身份和 `@adui` 作用域权限。登录成功不自动证明作用域可写；E404 仅说明当前查询未找到可见包，不能据此证明名称空闲或拥有权限。
3. **只有用户明确授权发布后**，才同步版本/README 状态并调整 CLI 源清单的 private 状态，重新打包、核对新 integrity 并复验；工作区根继续 private。打包器读取源 private 布尔值，不另藏一个相互冲突的固定值。
4. 最终发布必须指向已复验的 CLI tarball，不能在仓库根误发整个开发工作区。不添加流水线、安装钩子发布或其他自动发布入口。

2026-11-03 最新只读检查：npm whoami 返回 adui，符合个人作用域 @adui；目标包公开查询为 E404，权限列表尚无目标包。此前 ENEEDAUTH 为用户登录前的历史状态。个人作用域规则见 [npm scopes](https://docs.npmjs.com/about-scopes/)。未直接读取或记录任何凭据内容，授权后的上传结果单独记录。

`private: true` 会让 npm 拒绝发布；publishConfig 只声明发布时的目标设置，不会自行执行发布。依据：[npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#private)。后续更新仍须按 [npm 官方发布说明](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) 完成人工授权与身份验证，不能将打包或 dry-run 当成实际发布。
