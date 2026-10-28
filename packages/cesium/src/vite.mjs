import { createRequire } from "node:module";
import { dirname, resolve, relative } from "node:path";
import { viteStaticCopy } from "vite-plugin-static-copy";
// Resolve from this application's own dependency graph, including pnpm workspaces.
export function aduiCesium() {
  const require = createRequire(import.meta.url);
  const source = resolve(dirname(require.resolve("cesium/package.json")), "Build/Cesium");
  return viteStaticCopy({
    targets: ["Workers", "ThirdParty", "Assets", "Widgets"].map((name) => ({
      src: resolve(source, name).replaceAll("\\", "/"),
      dest: "adui-cesium",
      rename: (_name, _extension, fullPath) => ({
        stripBase: true,
        name: relative(source, fullPath).replaceAll("\\", "/"),
      }),
      overwrite: "error",
    })),
  });
}
