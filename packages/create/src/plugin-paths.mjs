import { join } from "node:path";
import { inspectPath } from "./safe-paths.mjs";

const directories = {
  "src/adui-screen/": "src/plugins/screen/",
  "src/adui-three/": "src/plugins/three/",
  "src/adui-cesium/": "src/plugins/cesium/",
  "src/adui-babylon/": "src/plugins/babylon/",
  "adui-model-build/": "build/plugins/models/",
  "adui-cesium-build/": "build/plugins/cesium/",
};

export function applicationPath(path) {
  if (path === "src/adui-models.d.ts") return "src/types/adui-models.d.ts";
  for (const [old, current] of Object.entries(directories))
    if (path.startsWith(old)) return current + path.slice(old.length);
  return path;
}

export function isSmokeFile(path) {
  return /^(?:src\/)?(?:screen|three|cesium|babylon|model)-smoke(?:\/|\.html$)/.test(path);
}

export function applicationFiles(files, smokePages = false) {
  return files
    .filter((path) => !path.includes(".before-adui-") && (smokePages || !isSmokeFile(path)))
    .map(applicationPath);
}

export function rewritePluginPaths(source) {
  for (const [old, current] of Object.entries(directories)) {
    source = source.replaceAll(old, current);
    if (old.startsWith("src/"))
      source = source.replaceAll("../" + old.slice(4), "../" + current.slice(4));
  }
  return source;
}

export function applicationPresetPlan(plan, options) {
  if (!plan) return plan;
  const { previewPath, previews, ...rest } = plan;
  return {
    ...rest,
    files: applicationFiles(plan.files, options.smokePages),
    entry: "/",
    ...(options.smokePages && previewPath ? { previewPath } : {}),
    ...(options.smokePages && previews ? { previews } : {}),
  };
}

// Maintenance commands accept both historical projects and the grouped layout.
export async function installedPresetPath(directory, path) {
  const current = applicationPath(path);
  return (await inspectPath(join(directory, current))) ? current : path;
}

export async function rejectGroupedPreset(directory, files) {
  for (const path of files) {
    const current = applicationPath(path);
    if (current !== path && (await inspectPath(join(directory, current))))
      throw new Error("插件文件已存在，拒绝重复安装：" + current);
  }
}

export async function rewriteInstalledPluginPaths(directory, source) {
  for (const [old, current] of Object.entries(directories)) {
    if (old.startsWith("src/") && (await inspectPath(join(directory, current))))
      source = source.replaceAll("../" + old.slice(4), "../" + current.slice(4));
  }
  return source;
}
