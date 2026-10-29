import { Engine } from "@babylonjs/core/Engines/engine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { createRuntime } from "./runtime.mjs";
import { createModelController } from "./model.mjs";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight.js";
export function createScene(canvas, onError, onModelState = () => {}) {
  return createRuntime(canvas, {
    createEngine: (target) => new Engine(target, true),
    createScene: (engine) => new Scene(engine),
    onError,
    initialize(scene) {
      scene.clearColor = new Color4(0.035, 0.075, 0.13, 1);
      const camera = new FreeCamera("camera", new Vector3(0, 2, -5), scene);
      camera.setTarget(Vector3.Zero());
      new HemisphericLight("light", new Vector3(0, 1, -1), scene);
      const box = CreateBox("box", { size: 1.8 }, scene),
        material = new StandardMaterial("material", scene);
      material.diffuseColor = new Color3(0.15, 0.72, 0.85);
      box.material = material;
      box.rotation.y = 0.5;
      box.rotation.x = 0.2;
      const light = new DirectionalLight("model-key", new Vector3(-1, -1, 1), scene);
      light.intensity = 3;
      const models = createModelController({
        async parse(buffer) {
          const { parseModel } = await import("./loader.mjs");
          return parseModel(buffer, scene);
        },
        prepare(asset) {
          if (!asset.meshes.some((mesh) => mesh.getTotalVertices() > 0))
            throw new Error("GLB 没有可显示网格");
          const root = asset.createRootMesh(),
            bounds = root.getHierarchyBoundingVectors(true),
            size = bounds.max.subtract(bounds.min),
            max = Math.max(size.x, size.y, size.z);
          if (!Number.isFinite(max) || max <= 0) throw new Error("GLB 边界无效");
          const scale = 2 / max,
            center = bounds.min.add(bounds.max).scale(0.5);
          root.scaling.setAll(scale);
          root.position.copyFrom(center.scale(-scale));
        },
        onState(state, message) {
          canvas.dataset.modelState = state;
          canvas.dataset.modelError = message;
          if (state === "ready") box.setEnabled(false);
          if (state === "empty") box.setEnabled(true);
          onModelState({ state, message });
        },
      });
      return {
        loadModel: (buffer, options) => models.load(buffer, options),
        clearModel: () => models.clear(),
        cancelModelLoad: () => models.cancel(),
        destroy: () => models.destroy(),
      };
    },
  });
}
