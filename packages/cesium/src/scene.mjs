import { resizeGlobe } from "./resolution.mjs";
import {
  Viewer,
  Color,
  Cartesian3,
  EllipsoidTerrainProvider,
  Model,
  Transforms,
  HeadingPitchRange,
  Matrix4,
} from "cesium";
import { createModelController, waitModelReady } from "./model.mjs";
import "cesium/Build/Cesium/Widgets/widgets.css";
export function createGlobe(host, onModelState = () => {}) {
  const viewer = new Viewer(host, {
    baseLayer: false,
    terrainProvider: new EllipsoidTerrainProvider(),
    baseLayerPicker: false,
    geocoder: false,
    animation: false,
    timeline: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    skyBox: false,
    skyAtmosphere: false,
    requestRenderMode: true,
  });
  try {
    viewer.scene.globe.baseColor = Color.fromCssColorString("#267caa");
    const point = viewer.entities.add({
      position: Cartesian3.fromDegrees(116.4, 39.9),
      point: { pixelSize: 14, color: Color.YELLOW },
    });
    const reset = () =>
      viewer.camera.setView({ destination: Cartesian3.fromDegrees(110, 30, 18000000) });
    reset();
    const models = createModelController({
      create: (url) =>
        Model.fromGltfAsync({
          url,
          modelMatrix: Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(116.4, 39.9, 100)),
          incrementallyLoadTextures: false,
          lightColor: new Cartesian3(2, 2, 2),
        }),
      add: (model) => viewer.scene.primitives.add(model),
      remove: (model) => {
        if (!viewer.isDestroyed()) viewer.scene.primitives.remove(model);
      },
      ready: (model, signal) =>
        waitModelReady(model, {
          signal,
          requestRender: () => viewer.scene.requestRender(),
          afterRender: (callback) => viewer.scene.postRender.addEventListener(callback),
        }),
      prepare(model) {
        const sphere = model.boundingSphere;
        if (
          !Number.isFinite(sphere.radius) ||
          sphere.radius <= 0 ||
          ![sphere.center.x, sphere.center.y, sphere.center.z].every(Number.isFinite)
        )
          throw new Error("GLB 边界无效");
        viewer.camera.viewBoundingSphere(
          sphere,
          new HeadingPitchRange(0, -Math.PI / 6, sphere.radius * 3.5),
        );
        viewer.camera.lookAtTransform(Matrix4.IDENTITY);
      },
      onState(state, message) {
        host.dataset.modelState = state;
        host.dataset.modelError = message;
        if (state === "ready") point.show = false;
        if (state === "empty") {
          point.show = true;
          reset();
        }
        viewer.scene.requestRender();
        onModelState({ state, message });
      },
    });
    resizeGlobe(viewer, host);
    return {
      scene: viewer.scene,
      resize: () => resizeGlobe(viewer, host),
      isDestroyed: () => viewer.isDestroyed(),
      loadModel: (buffer, options) => models.load(buffer, options),
      clearModel: () => models.clear(),
      cancelModelLoad: () => models.cancel(),
      destroy() {
        try {
          models.destroy();
        } finally {
          if (!viewer.isDestroyed()) viewer.destroy();
        }
      },
    };
  } catch (error) {
    viewer.destroy();
    throw error;
  }
}
