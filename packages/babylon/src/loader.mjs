import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader.js";
import "@babylonjs/loaders/glTF/index.js";
export function parseModel(buffer, scene) {
  return LoadAssetContainerAsync(new Uint8Array(buffer), scene, {
    pluginExtension: ".glb",
    pluginOptions: { gltf: { validate: false } },
  });
}
