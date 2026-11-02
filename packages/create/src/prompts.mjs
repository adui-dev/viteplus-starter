import { validateProjectName, validateProjectOptions } from "./options.mjs";

const cancelled = Symbol("cancelled");
const choices = (entries) => entries.map(([value, label]) => ({ value, label }));

export function parseEngineSelection(values) {
  const order = ["three", "cesium", "babylon"];
  if (
    !Array.isArray(values) ||
    values.some((value) => !order.includes(value)) ||
    new Set(values).size !== values.length
  )
    throw new Error("引擎选择必须是不重复的 Three.js、Cesium 或 Babylon 列表");
  const selected = order.filter((value) => values.includes(value));
  return selected.length > 1 ? selected : (selected[0] ?? "none");
}

export async function collectProjectOptions(partial, ui) {
  const options = { ...partial };
  // Complete base arguments remain non-interactive; optional presets keep defaults.
  if (options.name && options.type && (options.type === "monorepo" || options.framework))
    return validateProjectOptions(options);

  async function ask(kind, configuration) {
    const answer = await ui[kind](configuration);
    if (ui.isCancel(answer)) throw cancelled;
    return answer;
  }
  const select = (message, entries, initialValue) =>
    ask("select", {
      message,
      options: choices(entries),
      initialValue,
    });
  try {
    if (!options.name) {
      options.name = (
        await ask("text", {
          message: "项目名称",
          placeholder: "my-app",
          validate(value) {
            try {
              validateProjectName((value ?? "").trim());
            } catch (error) {
              return error.message;
            }
          },
        })
      ).trim();
    }
    if (!options.type)
      options.type = await select(
        "项目类型",
        [
          ["application", "Application"],
          ["monorepo", "Monorepo"],
        ],
        "application",
      );
    if (options.type === "application") {
      if (!options.framework)
        options.framework = await select(
          "前端框架",
          [
            ["vue", "Vue 3"],
            ["react", "React"],
          ],
          "vue",
        );
      if (!options.language)
        options.language = await select(
          "开发语言",
          [
            ["ts", "TypeScript"],
            ["js", "JavaScript"],
          ],
          "ts",
        );
      if (!options.ui) {
        const entries =
          options.framework === "vue"
            ? [
                ["none", "None"],
                ["element-plus", "Element Plus"],
                ["antd", "Ant Design Vue"],
                ["tdesign", "TDesign"],
              ]
            : [
                ["none", "None"],
                ["antd", "Ant Design"],
                ["tdesign", "TDesign"],
              ];
        options.ui = await select("UI 组件库", entries, "none");
      }
      if (!options.css)
        options.css = await select(
          "CSS 框架",
          [
            ["none", "None"],
            ["unocss", "UnoCSS"],
            ["tailwindcss", "Tailwind CSS"],
          ],
          "none",
        );
      if (options.screen === undefined)
        options.screen = await select(
          "大屏适配",
          [
            [false, "不启用"],
            [true, "启用"],
          ],
          Boolean(options.engines?.length || (options.engine && options.engine !== "none")),
        );
      if (options.screen && options.engine === undefined && options.engines === undefined) {
        const selection = parseEngineSelection(
          await ask("multiselect", {
            message: "3D 引擎（空格选择，回车确认；不选则不启用）",
            options: choices([
              ["three", "Three.js"],
              ["cesium", "Cesium"],
              ["babylon", "Babylon"],
            ]),
            initialValues: [],
            required: false,
          }),
        );
        if (Array.isArray(selection)) options.engines = selection;
        else options.engine = selection;
      }
      if (
        (["three", "cesium", "babylon"].includes(options.engine) || options.engines?.length) &&
        options.modelProtection === undefined &&
        options["model-protection"] === undefined
      )
        options.modelProtection = await select(
          "模型保护",
          [
            ["embedded", "自动加密加载"],
            ["external", "外置密钥"],
            ["none", "关闭"],
          ],
          "embedded",
        );
    }
    const selected = validateProjectOptions(options);
    if ((selected.engine || selected.engines) && !selected.screen && !partial.applyExisting)
      throw new Error("新建引擎应用须同时启用大屏");
    const description =
      selected.type === "application"
        ? `Application / ${selected.framework === "vue" ? "Vue 3" : "React"} / ${selected.language === "js" ? "JavaScript" : "TypeScript"} / UI: ${selected.ui ?? "none"} / CSS: ${selected.css ?? "none"} / 大屏: ${selected.screen ? "启用" : "关闭"} / 引擎: ${selected.engines?.join(",") ?? selected.engine ?? "none"} / 模型保护: ${selected.modelProtection ?? "none"}`
        : "Monorepo (各子应用后续独立选择框架)";
    const destination = selected.workspace
      ? `${selected.workspace}/apps/${selected.name}`
      : selected.name;
    return (await ask("confirm", {
      message: `将创建 ${destination} (${description})，确认吗？`,
      initialValue: true,
    }))
      ? selected
      : null;
  } catch (error) {
    if (error === cancelled) return null;
    throw error;
  }
}
