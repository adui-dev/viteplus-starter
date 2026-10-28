import { Viewer, Color, Cartesian3, EllipsoidTerrainProvider } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
export function createGlobe(host) {
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
    viewer.entities.add({
      position: Cartesian3.fromDegrees(116.4, 39.9),
      point: { pixelSize: 14, color: Color.YELLOW },
    });
    viewer.camera.setView({ destination: Cartesian3.fromDegrees(110, 30, 18000000) });
    viewer.scene.requestRender();
    return viewer;
  } catch (error) {
    viewer.destroy();
    throw error;
  }
}
