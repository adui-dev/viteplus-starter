import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { inspectPath } from "./safe-paths.mjs";
import { runWorkspaceVp } from "./workspace.mjs";

export const logoPath = "src/assets/adui-studio-logo.svg";
export const logoSource = readFileSync(
  new URL("../assets/adui-studio-logo.svg", import.meta.url),
  "utf8",
);

// Inline icons keep independently generated smoke pages self-contained. Fresh
// application pages instead reference the shared Vite-managed SVG asset.
export function brandHtml(source, href = "data:image/svg+xml," + encodeURIComponent(logoSource)) {
  const masked = source.replace(/<!--[\s\S]*?-->/g, (comment) => " ".repeat(comment.length));
  const starts = [...masked.matchAll(/<head\b[^>]*>/gi)];
  const ends = [...masked.matchAll(/<\/head\s*>/gi)];
  if (starts.length !== 1 || ends.length !== 1 || starts[0].index >= ends[0].index)
    throw new Error("无法唯一识别 HTML head，拒绝写入品牌图标");
  const start = starts[0].index + starts[0][0].length;
  const end = ends[0].index;
  let head = source.slice(start, end);
  const links = [...masked.slice(start, end).matchAll(/<link\b[^>]*>/gi)];
  for (const link of links.reverse()) {
    const rel = /\srel\s*=\s*(["'])(.*?)\1/i.exec(link[0])?.[2].toLowerCase().trim();
    if (rel && /^(?:icon|shortcut\s+icon|apple-touch-icon(?:-precomposed)?|mask-icon)$/.test(rel))
      head = head.slice(0, link.index) + head.slice(link.index + link[0].length);
  }
  return (
    source.slice(0, start) +
    head +
    `\n<link rel="icon" type="image/svg+xml" href="${href}" />\n` +
    source.slice(end)
  );
}

export function workspaceBrandingPlan() {
  return {
    files: ["apps/website/" + logoPath, "apps/website/index.html", "apps/website/src/main.ts"],
  };
}

// Only used immediately after the official monorepo template succeeds. Preserve
// the official page, counter, documentation links, workspace structure and tools.
export async function brandWorkspaceWebsite(root, formatter = runWorkspaceVp) {
  const directory = join(root, "apps/website");
  const originals = new Map();
  for (const path of ["src/main.ts", "index.html"]) {
    if (!(await inspectPath(join(directory, path), "工作区品牌标识"))?.isFile())
      throw new Error("官方工作区网站缺少文件：" + path);
    originals.set(path, await readFile(join(directory, path), "utf8"));
  }
  if (await inspectPath(join(directory, logoPath), "工作区品牌标识"))
    throw new Error("工作区 Logo 目标已存在，拒绝覆盖");
  let main = originals.get("src/main.ts");
  const imports = [
    ...main.matchAll(
      /^import\s+(heroImg|typescriptLogo|viteLogo)\s+from\s+(['"])\.\/assets\/(?:hero\.png|typescript\.svg|vite\.svg)\2\s*;?\s*$/gm,
    ),
  ];
  if (
    imports.length !== 3 ||
    new Set(imports.map((item) => item[1])).size !== 3 ||
    [...main.matchAll(/<div class="hero">/g)].length !== 1
  )
    throw new Error("无法识别官方工作区网站 Logo 结构，保留原文件");
  main = main.replace(
    /^import\s+(?:heroImg|typescriptLogo|viteLogo)\s+from\s+(['"])\.\/assets\/(?:hero\.png|typescript\.svg|vite\.svg)\1\s*;?\s*$/gm,
    "",
  );
  main = `import aduiLogo from './assets/adui-studio-logo.svg'\n` + main;
  main = main
    .replace(
      /<div class="hero">[\s\S]*?<\/div>/,
      '<div class="hero"><img src="${aduiLogo}" alt="ADui Studio" width="170" height="179" style="object-fit:contain" /></div>',
    )
    .replaceAll("${typescriptLogo}", "${aduiLogo}")
    .replaceAll("${viteLogo}", "${aduiLogo}")
    .replaceAll('alt="TypeScript logo"', 'alt="ADui Studio"')
    .replaceAll('alt="Vite logo"', 'alt="ADui Studio"');
  const writes = new Map([
    [logoPath, logoSource],
    ["src/main.ts", main],
    ["index.html", brandHtml(originals.get("index.html"), "/" + logoPath)],
  ]);
  for (const [path, source] of originals) {
    await inspectPath(join(directory, path), "工作区品牌标识");
    if ((await readFile(join(directory, path), "utf8")) !== source)
      throw new Error("工作区网站在品牌写入前已变化：" + path);
  }
  for (const [path, source] of writes) {
    await inspectPath(join(directory, path), "工作区品牌标识");
    await mkdir(dirname(join(directory, path)), { recursive: true });
    await writeFile(join(directory, path), source, { flag: originals.has(path) ? "w" : "wx" });
  }
  await formatter(root, ["fmt", "apps/website/src/main.ts", "apps/website/index.html", "--write"]);
}
