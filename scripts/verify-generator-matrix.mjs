import assert from "node:assert/strict";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateProjectOptions, buildVpCommand } from "../packages/create/src/options.mjs";
import { planIntegrations, generateIntegration } from "../packages/create/src/integrations.mjs";
import { planUiSmoke } from "../packages/create/src/ui-smoke.mjs";
import { planScreenPreset } from "../packages/create/src/screen.mjs";
import { planThreeSmoke } from "../packages/create/src/three-smoke.mjs";
import { planModelProtection } from "../packages/create/src/model-protection.mjs";
export async function verifyGeneratorMatrix() {
  let cases = 0,
    uiSmoke = 0,
    screen = 0,
    three = 0,
    protectedModels = 0;
  const profiles = [
    {},
    { screen: true },
    ...["none", "embedded", "external"].map((modelProtection) => ({
      screen: true,
      engine: "three",
      modelProtection,
    })),
  ];
  for (const framework of ["vue", "react"])
    for (const language of ["ts", "js"])
      for (const ui of framework === "vue"
        ? ["none", "element-plus", "antd", "tdesign"]
        : ["none", "antd", "tdesign"])
        for (const css of ["none", "unocss", "tailwindcss"])
          for (const profile of profiles) {
            const options = validateProjectOptions({
              name: "matrix-case",
              type: "application",
              framework,
              language,
              ui,
              css,
              ...profile,
            });
            const official = buildVpCommand(options);
            assert.equal(official.command, "vp");
            assert.equal(official.args[1], "vite:application");
            assert.equal(official.args.at(-1), framework + (language === "ts" ? "-ts" : ""));
            const integration = planIntegrations(options),
              deps = [...integration.dependencies, ...integration.devDependencies];
            for (const forbidden of framework === "vue"
              ? ["antd", "tdesign-react"]
              : ["element-plus", "ant-design-vue", "tdesign-vue-next", "unplugin-vue-components"])
              assert.ok(!deps.includes(forbidden));
            const originalConfig =
              'import {defineConfig} from "vite-plus";export default defineConfig({server:{port:4321},plugins:[]})';
            const entry = "// original entry marker\n",
              generated = generateIntegration(options, originalConfig, entry);
            assert.match(generated?.config ?? originalConfig, /server:\{port:4321\}/);
            if (ui === "none" && css === "none") assert.equal(generated, null);
            for (const [path, source] of Object.entries(generated?.files ?? {}))
              if (path.startsWith("src/main.")) assert.ok(source.includes(entry.trim()));
            const files = [];
            function add(paths) {
              for (const path of paths) {
                assert.ok(!isAbsolute(path) && !path.startsWith(".."));
                assert.ok(!/^src\/(?:App\.|main\.)|^vite\.config\./.test(path));
                assert.ok(!files.includes(path), "增强文件冲突：" + path);
                files.push(path);
              }
            }
            add(
              Object.keys(generated?.files ?? {}).filter((path) => !path.startsWith("src/main.")),
            );
            if (
              (framework === "vue" && ui === "tdesign") ||
              (framework === "react" && ui === "antd")
            ) {
              add(Object.keys(planUiSmoke(options).files));
              uiSmoke++;
            } else assert.throws(() => planUiSmoke(options));
            if (options.screen) {
              const plan = await planScreenPreset(options);
              add(Object.keys(plan.files));
              assert.ok(plan.files["src/adui-screen/" + framework + ".mjs"]);
              assert.ok(
                !plan.files["src/adui-screen/" + (framework === "vue" ? "react" : "vue") + ".mjs"],
              );
              screen++;
            }
            if (options.engine) {
              add(Object.keys((await planThreeSmoke(options)).files));
              three++;
            }
            const models = planModelProtection(options);
            if (options.modelProtection && options.modelProtection !== "none") {
              assert.ok(models);
              add(models.files);
              assert.ok(models.secret.generatedAtExecution);
              assert.ok(!JSON.stringify(models).includes("ADUI_MODEL_KEY="));
              protectedModels++;
            } else assert.equal(models, null);
            cases++;
          }
  return {
    planningCases: cases,
    uiSmokePlans: uiSmoke,
    screenPlans: screen,
    threePlans: three,
    modelProtectionPlans: protectedModels,
    actualBuilds: 0,
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await verifyGeneratorMatrix(), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
