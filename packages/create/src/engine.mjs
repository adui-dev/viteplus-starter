import { planThreeSmoke } from "./three-smoke.mjs";
import { planCesium, cesiumDependencies, cesiumDevDependencies } from "./cesium.mjs";
export async function planEngine(options) {
  if (!options.engine) return null;
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
