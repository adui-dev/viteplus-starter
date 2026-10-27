export function normalizeScreenPreset(value, overrides = {}) {
  const hasOverrides = Object.values(overrides).some((entry) => entry !== undefined);
  if (value === undefined || value === false) {
    if (hasOverrides) throw new Error("设计尺寸/缩放模式必须与 --screen 同用");
    return undefined;
  }
  if (value !== true && (!value || typeof value !== "object" || Array.isArray(value)))
    throw new Error("screen 必须为布尔值或配置对象");
  const input = value === true ? {} : value;
  for (const key of Object.keys(input))
    if (!["designWidth", "designHeight", "mode"].includes(key))
      throw new Error("未知 screen 字段：" + key);
  const result = { designWidth: 1920, designHeight: 1080, mode: "contain", ...input };
  for (const key of ["designWidth", "designHeight"]) {
    if (overrides[key] !== undefined) {
      if (!/^[1-9]\d*$/.test(overrides[key])) throw new Error("大屏尺寸必须为正整数");
      result[key] = Number(overrides[key]);
    }
    if (!Number.isSafeInteger(result[key]) || result[key] <= 0 || result[key] > 32768)
      throw new Error("大屏尺寸必须为 1–32768 的整数");
  }
  if (overrides.mode !== undefined) result.mode = overrides.mode;
  if (!["contain", "cover", "stretch", "none"].includes(result.mode))
    throw new Error("大屏模式必须为 contain/cover/stretch/none");
  return result;
}
