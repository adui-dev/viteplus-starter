const required = [
  "package.json",
  "README.md",
  "LICENSE",
  "packages/create/bin/cli.mjs",
  "packages/create/assets/normalize.css",
  "packages/create/assets/normalize.LICENSE.txt",
];

function publicFile(path) {
  if (
    typeof path !== "string" ||
    path.split("/").some((part) => !part || part.startsWith(".")) ||
    path.includes("\\") ||
    path.includes(":")
  )
    return false;
  if (required.includes(path) || path === "packages/create/assets/normalize.SOURCE.md") return true;
  return (
    /^packages\/(?:create|screen|three|cesium|babylon|model-security)\/src\/(?:[^/]+\/)*[^/]+\.(?:mjs|css|d\.mts|d\.ts)$/.test(
      path,
    ) &&
    !path.toLowerCase().endsWith(".test.mjs") &&
    !path.split("/").some((part) => ["test", "tests", "node_modules"].includes(part.toLowerCase()))
  );
}

// Validate npm's actual packed-file inventory, rather than a source-tree estimate.
// This report does not contact npm, install dependencies or publish anything.
export function createCliPackReport(manifest, metadata) {
  const filename =
    manifest.name.replace(/^@/, "").replace("/", "-") + "-" + manifest.version + ".tgz";
  if (
    !metadata ||
    metadata.name !== manifest.name ||
    metadata.version !== manifest.version ||
    metadata.filename !== filename
  )
    throw new Error("npm pack 清单与候选包名称、版本或文件名不一致");
  if (manifest.license !== "MIT" || manifest.scripts !== undefined)
    throw new Error("CLI 候选包必须声明 MIT 且不携带生命周期脚本");
  if (
    !Array.isArray(metadata.files) ||
    !metadata.files.length ||
    typeof metadata.integrity !== "string" ||
    !metadata.integrity.startsWith("sha512-")
  )
    throw new Error("npm pack 缺少实际文件清单或完整性信息");
  const paths = new Set();
  for (const file of metadata.files) {
    if (
      !file ||
      !publicFile(file.path) ||
      paths.has(file.path) ||
      !Number.isSafeInteger(file.size) ||
      file.size < 0
    )
      throw new Error("CLI 候选包含未知、重复或无效文件：" + String(file?.path));
    paths.add(file.path);
  }
  for (const path of required)
    if (!paths.has(path)) throw new Error("CLI 候选包缺少必要文件：" + path);
  return {
    name: manifest.name,
    version: manifest.version,
    private: manifest.private === true,
    license: manifest.license,
    repository: manifest.repository,
    publishConfig: manifest.publishConfig,
    filename,
    integrity: metadata.integrity,
    fileCount: metadata.files.length,
    packedSize: metadata.size,
    unpackedSize: metadata.unpackedSize,
    files: metadata.files
      .map(({ path, size, mode }) => ({ path, size, mode }))
      .sort((a, b) => a.path.localeCompare(b.path)),
    publicationPerformed: false,
  };
}
