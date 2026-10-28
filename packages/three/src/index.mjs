import {
  WebGLRenderer,
  Scene,
  Color,
  PerspectiveCamera,
  BoxGeometry,
  MeshBasicMaterial,
  Mesh,
  Raycaster,
  Box3,
  Vector3,
  Group,
  HemisphereLight,
  DirectionalLight,
  PMREMGenerator,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mountScene } from "./runtime.mjs";
export function createThreeScene(host, options = {}) {
  return mountScene(
    {
      WebGLRenderer,
      Scene,
      Color,
      PerspectiveCamera,
      BoxGeometry,
      MeshBasicMaterial,
      Mesh,
      Raycaster,
      Box3,
      Vector3,
      Group,
      HemisphereLight,
      DirectionalLight,
      createEnvironment(renderer) {
        const room = new RoomEnvironment();
        const generator = new PMREMGenerator(renderer);
        try {
          return generator.fromScene(room);
        } finally {
          room.dispose();
          generator.dispose();
        }
      },
      async parseGlb(buffer) {
        const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
        return new GLTFLoader().parseAsync(buffer, "");
      },
    },
    host,
    options,
  );
}
