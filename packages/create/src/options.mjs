import { normalizeScreenPreset } from "./screen-options.mjs";
const PROJECT_TYPES = new Set(["application", "monorepo"]);
const FRAMEWORK_TEMPLATES = Object.freeze({
  vue: Object.freeze({ ts: "vue-ts", js: "vue" }),
  react: Object.freeze({ ts: "react-ts", js: "react" }),
});

export function validateProjectName(name) {
  if (
    typeof name !== "string" ||
    name.length > 64 ||
    !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)
  ) {
    throw new Error("项目名只能使用小写字母、数字和中划线，须以字母开头，长度不超过 64");
  }
  return name;
}

export function validateProjectOptions(options) {
  if (!options || typeof options !== "object") {
    throw new TypeError("项目配置必须是对象");
  }

  const { name, type, framework } = options;
  if (options.engines !== undefined) {
    if (options.engine !== undefined) throw new Error("engine 与 engines 不能混用");
    const list = options.engines;
    if (
      !Array.isArray(list) ||
      !list.length ||
      list.length > 3 ||
      list.some((value) => !["three", "cesium", "babylon"].includes(value)) ||
      new Set(list).size !== list.length
    )
      throw new Error("engines 必须是不重复的引擎数组");
    if (type !== "application") throw new Error("Monorepo 根不配置引擎");
    const engines = ["three", "cesium", "babylon"].filter((value) => list.includes(value));
    const { engines: _engines, ...rest } = options;
    const { engine: _engine, ...normalized } = validateProjectOptions({
      ...rest,
      engine: engines[0],
    });
    return { ...normalized, engines };
  }
  const { workspace } = options;
  const engine = options.engine === undefined ? "none" : options.engine;
  if (!["none", "three", "cesium", "babylon"].includes(engine))
    throw new Error("引擎仅支持 none、three、cesium 或 babylon");
  if (type === "monorepo" && engine !== "none") throw new Error("Monorepo 根不配置引擎");
  if (options.modelProtection !== undefined && options["model-protection"] !== undefined)
    throw new Error("模型保护参数不能重复");
  const rawProtection =
    options.modelProtection === undefined ? options["model-protection"] : options.modelProtection;
  const modelProtection =
    rawProtection === undefined ? (engine === "three" ? "embedded" : "none") : rawProtection;
  if (!["none", "embedded", "external"].includes(modelProtection))
    throw new Error("模型保护仅支持 none、embedded、external");
  if (type === "monorepo" && rawProtection !== undefined)
    throw new Error("Monorepo 根不配置模型保护");
  if (modelProtection !== "none" && engine !== "three")
    throw new Error("模型保护需要 engine=three");
  const language = options.language ?? "ts";
  const ui = options.ui ?? "none";
  const css = options.css ?? "none";
  const screen = normalizeScreenPreset(options.screen, {
    designWidth: options["screen-width"],
    designHeight: options["screen-height"],
    mode: options["screen-mode"],
  });

  validateProjectName(name);

  if (!PROJECT_TYPES.has(type)) {
    throw new Error("项目类型必须为 application 或 monorepo");
  }
  if (
    workspace !== undefined &&
    (type !== "application" ||
      typeof workspace !== "string" ||
      !workspace.trim() ||
      workspace.includes("\0"))
  ) {
    throw new Error("--workspace 只能为 Application 指定已有工作区路径");
  }

  if (type === "application" && !Object.hasOwn(FRAMEWORK_TEMPLATES, framework)) {
    throw new Error("Application 必须通过 --framework 选择 vue 或 react");
  }
  if (type === "monorepo" && framework !== undefined) {
    throw new Error("Monorepo 根工作区不能指定 --framework，需在创建应用时独立选择");
  }
  if (type === "application" && !["ts", "js"].includes(language)) {
    throw new Error("开发语言必须为 ts 或 js");
  }
  if (type === "monorepo" && options.language !== undefined) {
    throw new Error("Monorepo 根工作区不能指定 --language，需在各应用中独立选择");
  }
  if (!["none", "element-plus", "antd", "tdesign"].includes(ui)) {
    throw new Error("不支持的 UI 组件库");
  }
  if (!["none", "unocss", "tailwindcss"].includes(css)) {
    throw new Error("不支持的 CSS 框架");
  }
  if (framework === "react" && ui === "element-plus") {
    throw new Error("Element Plus 不支持 React");
  }
  if (type === "monorepo" && (ui !== "none" || css !== "none")) {
    throw new Error("Monorepo 根目录不配置 UI/CSS，请在各应用内选择");
  }
  if (type === "monorepo" && screen) throw new Error("Monorepo 根不配置大屏，请在应用中选择");
  return {
    name,
    type,
    ...(workspace === undefined ? {} : { workspace }),
    ...(framework === undefined ? {} : { framework }),
    ...(options.language === undefined ? {} : { language }),
    ...(options.ui === undefined ? {} : { ui }),
    ...(options.css === undefined ? {} : { css }),
    ...(screen ? { screen } : {}),
    ...(engine !== "none" ? { engine } : {}),
    ...(engine === "three" || rawProtection !== undefined ? { modelProtection } : {}),
  };
}

export function buildVpCommand(options) {
  const { name, type, framework, language = "ts", workspace } = validateProjectOptions(options);
  const args = [
    "create",
    type === "monorepo" ? "vite:monorepo" : "vite:application",
    "--directory",
    workspace === undefined ? name : "apps/" + name,
    "--package-manager",
    "pnpm",
    ...(workspace === undefined ? ["--git"] : ["--no-interactive"]),
  ];
  if (type === "application") {
    args.push("--", "--template", FRAMEWORK_TEMPLATES[framework][language]);
  }
  return { command: "vp", args };
}
