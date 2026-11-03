import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { brandHtml, brandWorkspaceWebsite, logoPath, logoSource } from "../src/branding.mjs";
import {
  captureApplication,
  finalizeApplication,
  applicationEntry,
  planApplicationOutput,
} from "../src/application-output.mjs";
import { planUiSmoke } from "../src/ui-smoke.mjs";
import { planScreenPreset } from "../src/screen.mjs";
import { planThreeSmoke } from "../src/three-smoke.mjs";
import { planCesium } from "../src/cesium.mjs";
import { planBabylon } from "../src/babylon.mjs";
import { modelSmoke } from "../../model-security/src/smoke.mjs";

const noop = () => {};
const html =
  '<!doctype html><html><head><link rel="icon" href="/vite.svg"><meta name="viewport" content="width=device-width"></head><body><div id="app"></div></body></html>';
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "adui-branding-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function put(root, path, source) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), source);
}
async function snapshot(root) {
  const files = await readdir(root, { recursive: true, withFileTypes: true });
  return Promise.all(
    files
      .filter((item) => item.isFile())
      .map(async (item) => {
        const path = join(item.parentPath, item.name);
        return [path, await readFile(path)];
      }),
  );
}

test("HTML 图标使用原 SVG，保留 head 元信息和注释，不重复保留其他 favicon", () => {
  const source = html.replace(
    "<meta",
    '<!-- <link rel="icon" href="keep.svg"> --><link href="/touch.png" rel="apple-touch-icon"><meta',
  );
  const output = brandHtml(source);
  assert.ok(output.includes('<!-- <link rel="icon" href="keep.svg"> -->'));
  assert.ok(output.includes('<meta name="viewport"'));
  assert.doesNotMatch(output, /href="\/(?:vite\.svg|touch\.png)"/);
  const encoded = /href="data:image\/svg\+xml,([^"]+)"/.exec(output)[1];
  assert.equal(decodeURIComponent(encoded), logoSource);
  assert.match(brandHtml(output, "/" + logoPath), /href="\/src\/assets\/adui-studio-logo\.svg"/);
  for (const invalid of ["<html></html>", "<head></head><head></head>", "</head><head>"])
    assert.throws(() => brandHtml(invalid), /无法唯一识别/);
});

test("无插件的 Vue/React TS/JS 首页及 favicon 共用 Logo，预览列出文件，不生成空插件入口", async (t) => {
  for (const framework of ["vue", "react"])
    for (const language of ["ts", "js"]) {
      const root = await fixture(t);
      const options = { name: "brand-app", type: "application", framework, language };
      const { app, main } = applicationEntry(options);
      await put(root, app, "official app");
      await put(
        root,
        main,
        framework === "vue"
          ? "createApp(App).mount('#app')\n"
          : "createRoot(root).render(<App />)\n",
      );
      await put(root, "index.html", html);
      const plan = await planApplicationOutput(options);
      assert.ok(plan.files.includes(logoPath));
      assert.ok(plan.files.includes("index.html"));
      const state = await captureApplication(root, options);
      await finalizeApplication(root, options, state, noop);
      assert.equal(await readFile(join(root, logoPath), "utf8"), logoSource);
      assert.match(await readFile(join(root, app), "utf8"), /alt="ADui Studio"/);
      assert.match(
        await readFile(join(root, "index.html"), "utf8"),
        /href="\/src\/assets\/adui-studio-logo\.svg"/,
      );
      assert.doesNotMatch(await readFile(join(root, main), "utf8"), /plugins\/index/);
      await assert.rejects(readFile(join(root, "src/plugins/index." + language)), {
        code: "ENOENT",
      });
    }
});

test("Logo 占用、HTML 变化与资源父目录 junction 在写入前拒绝", async (t) => {
  for (const conflict of ["logo", "html", "junction"]) {
    const root = await fixture(t),
      options = { name: "brand-app", type: "application", framework: "vue" };
    await put(root, "src/App.vue", "official app");
    await put(root, "src/main.ts", "createApp(App).mount('#app')\n");
    await put(root, "index.html", html);
    const state = await captureApplication(root, options);
    if (conflict === "logo") await put(root, logoPath, "business logo");
    if (conflict === "html") await put(root, "index.html", html + "<!-- user edit -->");
    if (conflict === "junction") {
      const outside = await fixture(t);
      await symlink(
        outside,
        join(root, "src/assets"),
        process.platform === "win32" ? "junction" : "dir",
      );
    }
    const before = await snapshot(root);
    await assert.rejects(finalizeApplication(root, options, state, noop), /已存在|已变更|junction/);
    assert.deepEqual(await snapshot(root), before);
  }
});

test("UI、大屏、三引擎与模型的独立验收页均内置同一 SVG favicon，不要求改写已有业务页", async () => {
  for (const framework of ["vue", "react"])
    for (const language of ["ts", "js"]) {
      const options = {
        name: "brand-app",
        type: "application",
        framework,
        language,
        ui: "tdesign",
        screen: true,
        engine: "three",
      };
      const plans = [
        planUiSmoke(options),
        await planScreenPreset(options),
        await planThreeSmoke(options),
        await planCesium({ ...options, engine: "cesium" }),
        await planBabylon({ ...options, engine: "babylon" }),
        { files: modelSmoke(framework, language, "embedded") },
      ];
      for (const plan of plans) {
        const page = Object.entries(plan.files).find(([path]) => path.endsWith(".html"))[1];
        const encoded = /href="data:image\/svg\+xml,([^"]+)"/.exec(page)?.[1];
        assert.equal(decodeURIComponent(encoded), logoSource);
      }
    }
});

async function website(t) {
  const root = await fixture(t);
  await put(root, "apps/website/index.html", html);
  await put(
    root,
    "apps/website/src/main.ts",
    `import './style.css'\nimport heroImg from './assets/hero.png'\nimport typescriptLogo from './assets/typescript.svg'\nimport viteLogo from './assets/vite.svg'\nimport { setupCounter } from './counter.ts'\n// keep business-independent official counter and links\ndocument.body.innerHTML = \`<div class="hero"><img src="\${heroImg}"><img src="\${typescriptLogo}"><img src="\${viteLogo}"></div><a href="https://vite.dev"><img src="\${viteLogo}"></a>\`\nsetupCounter(counter)\n`,
  );
  return root;
}

test("新官方工作区网站替换展示标识并保留原 counter 和链接，配置及 utils 不变", async (t) => {
  const root = await website(t);
  await put(root, "vite.config.ts", "keep config");
  await put(root, "packages/utils/index.ts", "keep utils");
  await brandWorkspaceWebsite(root, noop);
  const source = await readFile(join(root, "apps/website/src/main.ts"), "utf8");
  assert.match(source, /setupCounter\(counter\)/);
  assert.match(source, /https:\/\/vite.dev/);
  assert.doesNotMatch(source, /typescriptLogo|viteLogo|heroImg/);
  assert.equal(await readFile(join(root, "apps/website/" + logoPath), "utf8"), logoSource);
  assert.equal(await readFile(join(root, "vite.config.ts"), "utf8"), "keep config");
  assert.equal(await readFile(join(root, "packages/utils/index.ts"), "utf8"), "keep utils");
  await assert.rejects(brandWorkspaceWebsite(root, noop), /拒绝覆盖/);
});

test("工作区网站 Logo 冲突或未知首页结构不产生部分写入", async (t) => {
  for (const conflict of ["logo", "main"]) {
    const root = await website(t);
    await put(
      root,
      conflict === "logo" ? "apps/website/" + logoPath : "apps/website/src/main.ts",
      "custom content",
    );
    const before = await snapshot(root);
    await assert.rejects(brandWorkspaceWebsite(root, noop), /拒绝覆盖|无法识别/);
    assert.deepEqual(await snapshot(root), before);
  }
});
