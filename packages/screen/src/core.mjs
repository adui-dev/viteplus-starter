export function normalizeOptions(input = {}) {
  const options = {
    designWidth: 1920,
    designHeight: 1080,
    mode: "contain",
    allowUpscale: true,
    ...input,
  };
  for (const key of ["designWidth", "designHeight"]) {
    if (typeof options[key] !== "number" || !Number.isFinite(options[key]) || options[key] <= 0) {
      throw new Error(key + " 必须为正有限数值");
    }
  }
  if (!["contain", "cover", "stretch", "none"].includes(options.mode))
    throw new Error("无效的大屏缩放模式");
  if (typeof options.allowUpscale !== "boolean") throw new Error("allowUpscale 必须为布尔值");
  const insets = { top: 0, right: 0, bottom: 0, left: 0, ...options.engineInsets };
  for (const value of Object.values(insets)) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
      throw new Error("engineInsets 必须为非负有限数值");
  }
  return { ...options, engineInsets: insets };
}

export function calculateLayout(containerWidth, containerHeight, input = {}) {
  const options = normalizeOptions(input);
  for (const size of [containerWidth, containerHeight]) {
    if (typeof size !== "number" || !Number.isFinite(size) || size < 0)
      throw new Error("容器尺寸必须为非负有限数值");
  }
  const { designWidth, designHeight, mode, allowUpscale, engineInsets } = options;
  const visible = containerWidth > 0 && containerHeight > 0;
  let scaleX = 1;
  let scaleY = 1;
  if (visible && mode !== "none") {
    const x = containerWidth / designWidth;
    const y = containerHeight / designHeight;
    scaleX = mode === "stretch" ? x : mode === "cover" ? Math.max(x, y) : Math.min(x, y);
    scaleY = mode === "stretch" ? y : scaleX;
    if (!allowUpscale) {
      scaleX = Math.min(1, scaleX);
      scaleY = Math.min(1, scaleY);
    }
  }
  const width = designWidth * scaleX;
  const height = designHeight * scaleY;
  const left =
    mode === "none" ? Math.max(0, (containerWidth - width) / 2) : (containerWidth - width) / 2;
  const top =
    mode === "none" ? Math.max(0, (containerHeight - height) / 2) : (containerHeight - height) / 2;
  const engineLeft = Math.max(0, Math.min(containerWidth, left + engineInsets.left * scaleX));
  const engineTop = Math.max(0, Math.min(containerHeight, top + engineInsets.top * scaleY));
  const engineRight = Math.max(
    0,
    Math.min(containerWidth, left + width - engineInsets.right * scaleX),
  );
  const engineBottom = Math.max(
    0,
    Math.min(containerHeight, top + height - engineInsets.bottom * scaleY),
  );
  return {
    ...options,
    containerWidth,
    containerHeight,
    visible,
    scaleX,
    scaleY,
    left,
    top,
    width,
    height,
    engine: {
      left: engineLeft,
      top: engineTop,
      width: visible ? Math.max(0, engineRight - engineLeft) : 0,
      height: visible ? Math.max(0, engineBottom - engineTop) : 0,
    },
  };
}

export function toDesignPoint(layout, x, y) {
  if (!layout.visible || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const point = { x: (x - layout.left) / layout.scaleX, y: (y - layout.top) / layout.scaleY };
  return {
    ...point,
    inside:
      x >= 0 &&
      y >= 0 &&
      x <= layout.containerWidth &&
      y <= layout.containerHeight &&
      point.x >= 0 &&
      point.y >= 0 &&
      point.x <= layout.designWidth &&
      point.y <= layout.designHeight,
  };
}
