import { validateProjectName, validateProjectOptions } from "./options.mjs";

const PROJECT_TYPES = { 1: "application", 2: "monorepo" };
const FRAMEWORKS = { 1: "vue", 2: "react" };
export function parseEngineSelection(answer) {
  const names = {
    1: "none",
    2: "three",
    3: "cesium",
    4: "babylon",
    none: "none",
    three: "three",
    cesium: "cesium",
    babylon: "babylon",
  };
  const selected = (answer || "1")
    .split(",")
    .map((value) => (Object.hasOwn(names, value.trim()) ? names[value.trim()] : undefined));
  if (
    selected.some((value) => !value) ||
    new Set(selected).size !== selected.length ||
    (selected.length > 1 && selected.includes("none"))
  )
    throw new Error("引擎多选须用逗号分隔，不允许重复或混入 None");
  return selected.length === 1
    ? selected[0]
    : ["three", "cesium", "babylon"].filter((value) => selected.includes(value));
}

async function askUntilValid(ask, label, validate, report) {
  for (;;) {
    const value = (await ask(label)).trim();
    try {
      return validate(value);
    } catch (error) {
      report(error.message);
    }
  }
}

function choiceValidator(choices, defaultValue) {
  return (answer) => {
    const value = answer || defaultValue;
    const choice = choices[value];
    if (!Object.hasOwn(choices, value))
      throw new Error(`无效选项: ${value}，请按提示输入数字或选项名称`);
    return choice;
  };
}

export async function collectProjectOptions(partial, ask, report = console.error) {
  const options = { ...partial };
  // 基础参数齐全时按非交互调用处理；UI/CSS 缺省为 None。
  if (options.name && options.type && (options.type === "monorepo" || options.framework)) {
    return validateProjectOptions(options);
  }
  let prompted = false;

  if (!options.name) {
    prompted = true;
    options.name = await askUntilValid(ask, "项目名称: ", validateProjectName, report);
  }

  if (!options.type) {
    prompted = true;
    options.type = await askUntilValid(
      ask,
      "项目类型 [1] Application  [2] Monorepo (默认 1): ",
      choiceValidator({ ...PROJECT_TYPES, application: "application", monorepo: "monorepo" }, "1"),
      report,
    );
  }

  if (options.type === "application" && !options.framework) {
    prompted = true;
    options.framework = await askUntilValid(
      ask,
      "前端框架 [1] Vue 3  [2] React (默认 1): ",
      choiceValidator({ ...FRAMEWORKS, vue: "vue", react: "react" }, "1"),
      report,
    );
  }

  if (options.type === "application") {
    if (!options.language) {
      prompted = true;
      options.language = await askUntilValid(
        ask,
        "开发语言 [1] TypeScript  [2] JavaScript (默认 1): ",
        choiceValidator({ 1: "ts", 2: "js", ts: "ts", js: "js" }, "1"),
        report,
      );
    }
    if (!options.ui) {
      prompted = true;
      const values =
        options.framework === "vue"
          ? {
              1: "none",
              2: "element-plus",
              3: "antd",
              4: "tdesign",
              none: "none",
              "element-plus": "element-plus",
              antd: "antd",
              tdesign: "tdesign",
            }
          : { 1: "none", 2: "antd", 3: "tdesign", none: "none", antd: "antd", tdesign: "tdesign" };
      const label =
        options.framework === "vue"
          ? "UI 组件库 [1] None  [2] Element Plus  [3] Ant Design Vue  [4] TDesign (默认 1): "
          : "UI 组件库 [1] None  [2] Ant Design  [3] TDesign (默认 1): ";
      options.ui = await askUntilValid(ask, label, choiceValidator(values, "1"), report);
    }
    if (!options.css) {
      prompted = true;
      options.css = await askUntilValid(
        ask,
        "CSS 框架 [1] None  [2] UnoCSS  [3] Tailwind CSS (默认 1): ",
        choiceValidator(
          {
            1: "none",
            2: "unocss",
            3: "tailwindcss",
            none: "none",
            unocss: "unocss",
            tailwindcss: "tailwindcss",
          },
          "1",
        ),
        report,
      );
    }
  }
  if (options.type === "application") {
    if (options.screen === undefined) {
      options.screen = await askUntilValid(
        ask,
        "大屏适配 [1] 不启用 [2] 启用 (默认 " +
          (options.engines?.length || (options.engine && options.engine !== "none") ? "2" : "1") +
          "): ",
        choiceValidator(
          { 1: false, 2: true, no: false, yes: true },
          options.engines?.length || (options.engine && options.engine !== "none") ? "2" : "1",
        ),
        report,
      );
    }
    if (options.screen && options.engine === undefined && options.engines === undefined) {
      const selection = await askUntilValid(
        ask,
        "3D 引擎 [1] None [2] Three.js [3] Cesium [4] Babylon（可逗号多选，默认 1）: ",
        parseEngineSelection,
        report,
      );
      if (Array.isArray(selection)) options.engines = selection;
      else options.engine = selection;
    }
    if (
      (options.engine === "three" || options.engines?.includes("three")) &&
      options.modelProtection === undefined &&
      options["model-protection"] === undefined
    )
      options.modelProtection = await askUntilValid(
        ask,
        "模型保护 [1] 自动加密加载 [2] 外置密钥 [3] 关闭 (默认 1): ",
        choiceValidator(
          {
            1: "embedded",
            2: "external",
            3: "none",
            embedded: "embedded",
            external: "external",
            none: "none",
          },
          "1",
        ),
        report,
      );
  }
  const selected = validateProjectOptions(options);
  if ((selected.engine || selected.engines) && !selected.screen && !partial.applyExisting)
    throw new Error("新建引擎应用须同时启用大屏");
  if (!prompted) return selected;

  const description =
    selected.type === "application"
      ? `Application / ${selected.framework === "vue" ? "Vue 3" : "React"} / ${selected.language === "js" ? "JavaScript" : "TypeScript"} / UI: ${selected.ui ?? "none"} / CSS: ${selected.css ?? "none"} / 大屏: ${selected.screen ? "启用" : "关闭"} / 引擎: ${selected.engines?.join(",") ?? selected.engine ?? "none"} / 模型保护: ${selected.modelProtection ?? "none"}`
      : "Monorepo (各子应用后续独立选择框架)";
  const destination = selected.workspace
    ? `${selected.workspace}/apps/${selected.name}`
    : selected.name;
  const answer = (await ask(`\n将创建 ${destination} (${description})，确认吗？[Y/n]: `))
    .trim()
    .toLowerCase();
  if (answer === "n" || answer === "no") return null;
  if (answer !== "" && answer !== "y" && answer !== "yes") {
    throw new Error("确认选项只能是 Y 或 N，已取消创建");
  }
  return selected;
}
