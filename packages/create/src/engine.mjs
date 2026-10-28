import { planThreeSmoke } from "./three-smoke.mjs";
import { planCesium, cesiumDependencies, cesiumDevDependencies } from "./cesium.mjs";
import { planBabylon, babylonVersion } from "./babylon.mjs";
export async function planEngine(options) {
  if (options.engines) {
    const plans = await Promise.all(
      options.engines.map((engine) =>
        planEngine({
          ...options,
          engines: undefined,
          engine,
          modelProtection: engine === "three" ? options.modelProtection : "none",
        }),
      ),
    );
    const files = plans.flatMap((plan) => plan.files);
    if (new Set(files).size !== files.length) throw new Error("多引擎文件冲突");
    return {
      names: options.engines,
      dependencies: [...new Set(plans.flatMap((plan) => plan.dependencies))],
      devDependencies: [...new Set(plans.flatMap((plan) => plan.devDependencies))],
      files,
      previews: plans.map((plan) => plan.previewPath),
    };
  }
  if (!options.engine) return null;
  if (options.engine === "babylon") {
    const plan = await planBabylon(options);
    return {
      name: "babylon",
      dependencies: ["@babylonjs/core@" + babylonVersion],
      devDependencies: [],
      files: Object.keys(plan.files),
      previewPath: plan.previewPath,
    };
  }
  const cesium = options.engine === "cesium";
  const plan = await (cesium ? planCesium : planThreeSmoke)(options);
  return {
    name: options.engine,
    dependencies: cesium ? cesiumDependencies : ["three@0.186.1"],
    devDependencies: cesium ? cesiumDevDependencies : ["@types/three@0.186.0"],
    files: Object.keys(plan.files),
    previewPath: plan.previewPath,
  };
}
