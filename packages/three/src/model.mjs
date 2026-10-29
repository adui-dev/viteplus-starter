import { validateGlb } from "../../model-security/src/glb.mjs";
export { validateGlb };
export function modelBounds(size) {
  const values = [size.x, size.y, size.z],
    max = Math.max(...values);
  if (!values.every((value) => Number.isFinite(value) && value >= 0) || max <= 0)
    throw new Error("GLB 场景边界为空或无效");
  return { scale: 2 / max, radius: Math.hypot(...values.map((value) => value / max)) * 1.1 };
}
export function disposeGltf(asset) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set(),
    images = new Set(),
    skeletons = new Set();
  for (const root of new Set([asset?.scene, ...(asset?.scenes ?? [])].filter(Boolean))) {
    root.traverse((node) => {
      if (node.geometry) geometries.add(node.geometry);
      if (node.skeleton) skeletons.add(node.skeleton);
      for (const material of (Array.isArray(node.material)
        ? node.material
        : [node.material]
      ).filter(Boolean)) {
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
  }
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) {
    const source = texture.source?.data ?? texture.image;
    for (const image of Array.isArray(source) ? source : [source])
      if (image?.close) images.add(image);
    texture.dispose();
  }
  for (const skeleton of skeletons) skeleton.dispose();
  for (const image of images) image.close();
  return {
    geometries: geometries.size,
    materials: materials.size,
    textures: textures.size,
    images: images.size,
    skeletons: skeletons.size,
  };
}
export function createModelController({
  parse,
  install,
  remove,
  onState = () => {},
  onError = () => {},
}) {
  let version = 0,
    disposed = false,
    current = null;
  function release() {
    if (current) {
      remove(current);
      disposeGltf(current);
      current = null;
    }
  }
  return {
    async load(buffer) {
      if (disposed) return false;
      const request = ++version;
      let asset;
      try {
        validateGlb(buffer);
        onState("loading", "");
        asset = await parse(buffer);
        if (disposed || request !== version) {
          disposeGltf(asset);
          return false;
        }
        if (!asset?.scene) throw new Error("GLB 没有默认场景");
        // Fit/validate the new scene before releasing the currently visible model.
        install(asset);
        if (disposed || request !== version) {
          remove(asset);
          disposeGltf(asset);
          return false;
        }
        release();
        current = asset;
        onState("ready", "");
        return true;
      } catch (error) {
        if (asset) {
          remove(asset);
          disposeGltf(asset);
        }
        if (!disposed && request === version) {
          const message = error instanceof Error ? error.message : String(error);
          onState("error", message);
          onError(new Error(message));
        }
        return false;
      }
    },
    invalidate() {
      ++version;
    },
    clear() {
      if (disposed) return;
      ++version;
      release();
      onState("empty", "");
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      ++version;
      release();
    },
  };
}
