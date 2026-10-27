# Three.js 真实场景验收（首期）

向已有官方 Vue/React TS/JS 应用新增 Three.js 最小旋转立方体，使用 AdScreen 的原生引擎层，保留正式首页、main 和 Vite 配置。先按 [SCREEN](SCREEN.md) 生成大屏预设，再单独运行：

```powershell
# 在仓库上级目录：已有官方 Monorepo 的 Vue TS 成员
node ./viteplus-starter/packages/create/bin/cli.mjs --workspace ./adui-batch-demo --name admin --type application --framework vue --three-smoke

# 独立 React JS 项目（需先已有 --screen）
node ./viteplus-starter/packages/create/bin/cli.mjs --name starter-react-js --type application --framework react --language js --three-smoke
```

进入应用运行 `vp check`、`vp run build`、`vp dev`，打开实际端口的 `/three-smoke.html`。本命令只处理已有 Application，不能与 dry-run、screen、UI/CSS 补装、其他验收或修复标记混用；Monorepo 根不支持。批量 JSON 暂未加入 Three 字段，先生成工作区/大屏，再逐应用运行本命令。

## 文件与依赖

- 新增 `src/adui-three/`（框架无关运行时、入口与声明）、`src/three-smoke/`（所选框架/语言的组件、入口、样式）和 `three-smoke.html`。
- Three.js 固定为 0.186.1，开发类型固定为 @types/three 0.186.0，通过应用内 `vp add --save-exact` 安装；JS 项目也提供类型支持。缺失时新增，已有其他声明版本直接拒绝，不自动升级。包管理器可能更新工作区 catalog/锁文件，不将依赖加入根 package.json。
- 安装前校验框架、语言、已有大屏文件及全部输出路径；任一文件已存在、父路径是链接/junction 或非目录时拒绝。安装后复查目标与父目录，再用 wx 写入。失败保留依赖安装或部分现场，不承诺事务回滚，也不覆盖原文件。
- `packages/three` 为 private 内部源码包，未发布 npm。生成器复制源码快照；已有大屏目录不自动迁移，需保持约定接口。

## 运行时契约

`createThreeScene(host, {pixelRatio?, onStatus?, onError?})` 返回 canvas、status、setPixelRatio、destroy；组件在挂载后调用，在卸载时 destroy。host 要有实际尺寸，并位于原生引擎层。组件封装负责框架生命周期，运行时不依赖 Vue/React。

运行时创建独占 WebGLRenderer、透视相机、BoxGeometry、线框材质和 Raycaster。ResizeObserver/resize 触发尺寸更新；动画循环也检查 DPR，变化时更新相机宽高比、渲染器比例和 drawing buffer。默认使用当前设备 DPR，上限 2，单边上限取 8192 与 renderer.maxTextureSize 的较小值；隐藏/零尺寸时停止绘制，恢复后重算。DPR 下拉框可显式切换 1/2 或自动；OS 跨屏 DPR 变化路径由受控测试覆盖，本轮未移动实体显示器验收。

拾取使用 canvas.getBoundingClientRect 将 client 坐标转换到 NDC，不用设计稿坐标替代引擎坐标。点击中心命中后立方体变为橙色；HUD 按钮另行展示设计坐标换算，两套坐标各自作用于对应层。

destroy 幂等：取消 setAnimationLoop、断开观察器、移除窗口/canvas 监听，释放本实例独占的 geometry、material、renderer，主动丢弃其 WebGL context，并移除 canvas。初始化失败释放已分配资源；意外 contextlost 停止循环并通知 UI，需卸载/重挂恢复。本例不接管外部共享 renderer、材质或纹理，也不实现模型加载、加解密或其他引擎。

## 验收与边界

1. 页面显示持续旋转的线框立方体；点击 canvas 中央，selected=true、picks 增加且颜色改变。
2. 切换容器和四种缩放模式；引擎层 transform=none，相机保持对应视口比例。DPR 1/2 时 canvas 缓冲宽高与应用测量尺寸对应，布局可能存在小数 CSS 像素取整。
3. 卸载后显示 disposed=true 且 canvas 数量为 0；重挂为单个新 canvas，拾取计数从 0 开始。测试验证清理调用，不宣称测得 GPU 驱动堆内存完全回收。
4. 将 Chrome 标签切到前台再点击进入全屏；`:fullscreen` 应为 ad-screen，浮层保留，canvas 随视口改变，退出恢复。后台标签请求可被拒绝为 not granted，这与 API 缺失是不同情况；不修改浏览器安全设置。

默认正式构建只打包原首页，不能据此声称 Three 页面构建成功。本轮另用临时 mergeConfig 的 build.rolldownOptions.input=three-smoke.html 完成 Vue/React 专项构建，随后移走产物并移除临时配置，未改正式 Vite 配置。输出约 598/755 kB（压缩前），出现默认 500 kB 分块提醒；未通过调高阈值隐藏。正式集成阶段需要单独设计按需加载和分块。

实现依据：[Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer)、[Raycaster](https://threejs.org/docs/pages/Raycaster.html)。本地执行记录见 [PROJECT_CONTEXT](PROJECT_CONTEXT.md)。
