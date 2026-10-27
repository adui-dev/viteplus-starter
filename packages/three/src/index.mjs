import {
  WebGLRenderer,
  Scene,
  Color,
  PerspectiveCamera,
  BoxGeometry,
  MeshBasicMaterial,
  Mesh,
  Raycaster,
} from "three";
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
    },
    host,
    options,
  );
}
