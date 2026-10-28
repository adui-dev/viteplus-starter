const MAX_BYTES = 32 * 1024 * 1024;
export function modelBounds(size) {
  const values = [size.x, size.y, size.z],
    max = Math.max(...values);
  if (!values.every((value) => Number.isFinite(value) && value >= 0) || max <= 0)
    throw new Error("GLB 场景边界为空或无效");
  return { scale: 2 / max, radius: Math.hypot(...values.map((value) => value / max)) * 1.1 };
}
export function validateGlb(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 20 || buffer.byteLength > MAX_BYTES)
    throw new Error("GLB 必须为 20 字节至 32 MiB 的 ArrayBuffer");
  const view = new DataView(buffer);
  if (
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== buffer.byteLength
  )
    throw new Error("无效的 GLB 2.0 文件头或长度");
  let offset = 12,
    json = null,
    chunks = 0;
  while (offset < buffer.byteLength) {
    if (offset + 8 > buffer.byteLength) throw new Error("GLB 分块头不完整");
    const size = view.getUint32(offset, true),
      type = view.getUint32(offset + 4, true);
    offset += 8;
    if (size % 4 || offset + size > buffer.byteLength) throw new Error("GLB 分块长度无效");
    if (chunks++ === 0) {
      if (type !== 0x4e4f534a) throw new Error("GLB 首块必须为 JSON");
      try {
        json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, offset, size)));
      } catch {
        throw new Error("GLB JSON 无效");
      }
    }
    offset += size;
  }
  if (json?.asset?.version !== "2.0") throw new Error("仅支持 glTF 2.0");
  for (const resource of [...(json.buffers ?? []), ...(json.images ?? [])])
    if (resource.uri !== undefined) throw new Error("首期仅支持内嵌资源 GLB，不读取外部 URI");
  const unsupported = [
    "KHR_draco_mesh_compression",
    "KHR_texture_basisu",
    "EXT_meshopt_compression",
  ];
  if ((json.extensionsUsed ?? []).some((name) => unsupported.includes(name)))
    throw new Error("首期未配置 Draco/KTX2/Meshopt 解码器");
  return json;
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
