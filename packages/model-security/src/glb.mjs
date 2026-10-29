const MAX_BYTES = 32 * 1024 * 1024;
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
