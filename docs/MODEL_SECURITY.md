# .adui 模型加密与授权契约

2026-10-28 更新：用户当前采用无服务端、防直接复用方案，默认 env 自动解密与构建插件见 [MODEL_BUILD](MODEL_BUILD.md)。以下保留容器、手动工具和授权扩展契约；服务端不再是当前阶段必做项。

首期提供引擎无关 AES-256-GCM 核心、Node 本地封装工具及 Three.js 解密适配。加密后缀固定 `.adui`，明文暂仅支持自包含 GLB 2.0，最大 32 MiB。解密后仍经过 GLB 格式/内嵌资源校验，再交给 GLTFLoader。Vue/React、TS/JS 使用同一套核心；不替换官方首页或 Vite 配置，不增加应用依赖。

## 本地封装

需要 Node >=22。以下命令从仓库根执行；密钥单独保存在源码、Web 静态目录和版本控制以外。输出父目录必须已存在，输入/输出及祖先不能是符号链接或 junction；任何已有输出均拒绝覆盖。路径来自操作者，不承诺抵御另一个进程恶意并发替换文件系统。

```powershell
node packages/model-security/bin/cli.mjs keygen --out C:/Users/ADui/Downloads/helmet-demo.key.json --key-id helmet-demo-v1
node packages/model-security/bin/cli.mjs encrypt --input C:/Users/ADui/Downloads/DamagedHelmet.glb --output C:/Users/ADui/Downloads/DamagedHelmet.adui --key-file C:/Users/ADui/Downloads/helmet-demo.key.json --model-id damaged-helmet
```

`keygen` 使用系统随机源生成 32 字节密钥，JSON 包含 version=1、keyId、key（Base64）。密钥不通过命令行参数传入、不在日志打印、不嵌入 `.adui`。写文件使用 wx 与 POSIX mode 0600；Windows 的实际访问控制由所在目录 ACL 决定，不能将 mode 称为已设置 Windows 私有 ACL。原 GLB 保留，不自动清除。每次封装生成新的随机 IV；生产环境按自己的密钥轮换及加密次数策略管理密钥。

生成的独立 `/three-smoke.html` 点击加载场景后，先通过“本地验收密钥”选择 JSON，再选择 `.adui`；不向 HTTP 服务上传文件。验收 provider 仅存在于组件内存，将密钥导入为不可导出的 decrypt-only CryptoKey，有效期 10 分钟；清除授权会同时清除模型，卸载也释放引用。它只模拟授权契约，不能作为生产授权。直接选择 `.glb` 仍可走明文验收路径，生产是否允许明文由业务策略决定。

## v1 文件布局

所有长度字段为小端；magic 按 ASCII 保存。整个头部作为 AES-GCM additionalData，密文末尾含 16 字节认证 tag。IV 为随机 12 字节，tagLength 固定 128 bit，依据 [W3C Web Cryptography AES-GCM](https://www.w3.org/TR/webcrypto/#aes-gcm)。

| 偏移         | 长度         | 内容                                      |
| ------------ | ------------ | ----------------------------------------- |
| 0            | 4            | ASCII ADUI                                |
| 4            | 1            | version=1                                 |
| 5            | 1            | flags=0，其他值拒绝                       |
| 6            | 2            | headerLength，固定头加 JSON，最大 4096    |
| 8            | 4            | cipherLength，含认证 tag                  |
| 12           | 12           | IV                                        |
| 24           | 可变         | UTF-8 JSON：仅 modelId、keyId、format=glb |
| headerLength | cipherLength | GLB 密文及 tag                            |

modelId/keyId 仅允许 1–128 个 ASCII 字母数字、点、下划线、短横线，首位为字母数字。元数据本身可读，在成功认证前属于不可信输入；不能仅凭它赋予访问权限。解析拒绝版本、flags、长度、元数据及额外字段异常。错误密钥、IV/头/密文/tag 篡改均不会返回明文。

## 浏览器接口

生成应用从 `src/adui-three/adui.mjs` 导入 decryptAdui、inspectAdui；createLazyScene 返回 loadEncryptedModel、cancelModelLoad、clearModel、destroy。加解密源在 packages/model-security，包含零 Three/Vue/React 依赖；生成器只复制源码，尚未发布独立 npm 包。

```typescript
await scene.loadEncryptedModel(encryptedBuffer, {
  signal: abortController.signal,
  authorize: async (metadata, { signal }) => {
    // 业务实现：绑定预期 modelId，携带现有登录身份并由服务端校验模型访问权。
    // 使用自己的授权传输层，返回不可导出的 AES-256-GCM decrypt CryptoKey。
    return modelAuthorizationService.authorize(metadata, { signal });
  },
});
```

authorize 接收只读 `{modelId,keyId,format:'glb'}` 及可选 AbortSignal，返回 Promise<{key:CryptoKey,expiresAt:number}>；expiresAt 是 Unix 毫秒安全整数。拒绝访问应 reject，禁止失败时回退到本地常量密钥。核心在解密前后核验有效期、取消、密钥算法/256 位长度/decrypt 用途/不可导出。需要 HTTPS 或 localhost 的 Web Crypto。

授权等待期间先保留加密文件快照。后续模型请求、cancelModelLoad、clearModel、destroy 使旧操作失效并传递取消；授权实现须尊重 signal，Web Crypto/GLTFLoader 已开始的操作本身不能强制取消，晚到结果会丢弃。认证失败保留已有模型，经 onError 通知，loadEncryptedModel 返回 false；成功为 true。提交加载器后的临时明文缓冲最终清零，不宣称清掉 JS 引擎、Web Crypto 或 GPU 的所有副本。

## 服务端授权接口契约（待接业务服务）

建议由业务应用提供同源 `POST /api/model-grants`。本仓库不创建授权服务，不自行保存用户会话，不请求任意远端模型地址。契约如下：

- 请求：既有认证/CSRF 机制、JSON `{modelId,keyId}`；服务端从受控目录或数据库确定两者的关联，并校验当前用户/租户的模型权限、版本与撤销状态。不能相信文件头提供的 keyId 来任意检索密钥。
- 成功：200，`Cache-Control: no-store`；JSON `{modelId,keyId,algorithm:'A256GCM',key:<Base64>,expiresAt:<Unix毫秒>}`，仅通过已认证 TLS 连接提供。业务适配器核对预期模型、响应标识/算法/有效期，立即导入 non-extractable decrypt-only CryptoKey，返回上述 grant；不把响应放 localStorage/sessionStorage/URL/日志/静态资源。
- 失败：401 未登录、403 无权或已撤销、404 资源不存在、429 限流；不返回密钥。网络/解析/授权错误均失败关闭。服务端应按业务需要避免模型存在性泄漏，并审计授权事件，禁止记录密钥。
- 到期检查约束后续解密请求，不能收回已加载的明文/GPU 数据。业务如需实时撤销，应主动 cancel/clear/destroy；客户端到期时间不代替服务端鉴权。

浏览器获得合法解密能力后，用户仍可能提取明文；不可导出 CryptoKey 与 `.adui` 封装均不等于 DRM。当前未实现生产授权服务、任意远端模型下载、压缩解码器、FBX/OBJ 或自动迁移旧源码快照。

2026-10-29：Babylon 复用共享授权与 GLB 校验，createLazyScene 的 loadModel(buffer, {encrypted: true, authorize}) 在认证后调用按需 glTF AssetContainer loader。独立验收页可导入同一格式本地密钥；替换失败保留旧模型，清除授权同时清除模型并使晚到请求失效。加载器拥有独立字节副本，临时解密缓冲清零不等同抹除加载器副本。loadBundledModel 已接入同源限长下载和 env 构建目录，默认 embedded 自动授权，external 使用独立解锁文件，详见 [BABYLON](BABYLON.md)。

## 本地验证

Cesium 通过 createLazyGlobe.loadModel(buffer, {encrypted: true, authorize}) 复用授权与认证解密。自包含 GLB 经校验后才创建 Blob URL，模型在 GPU/纹理就绪后替换旧资产，取消/卸载回收候选、监听和 URL。Blob 保存独立明文副本，释放与清零不构成防提取保证。Cesium env 自动构建仍待接入，见 [CESIUM](CESIUM.md)。

运行 node --test、node scripts/validate-docs.mjs、vp check；测试包括真实 CLI、原生 Node crypto 互操作、头/密文/tag 篡改、错误密钥、到期/拒绝/取消、授权文件快照、晚到解密、替换清理与本地 provider。浏览器实际模型与四组合构建记录见 [PROJECT_CONTEXT](PROJECT_CONTEXT.md)。
