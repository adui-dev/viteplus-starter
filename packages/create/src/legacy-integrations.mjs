// Restricted comparison with the TS file emitted before plugin inlining (23184ed).
// Formatting and comments are allowed; aliases, custom options and extra code are not migrated.
function tokens(source) {
  const pattern =
    /\s+|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|'[^'\\\r\n]*'|"[^"\\\r\n]*"|[A-Za-z_$][\w$]*|[{}()[\].,:;]/y;
  const result = [];
  for (let index = 0; index < source.length;) {
    pattern.lastIndex = index;
    const match = pattern.exec(source);
    if (!match) return null;
    const token = match[0];
    index = pattern.lastIndex;
    if (/^\s|^\//.test(token)) {
      if (result.at(-1) === "return" && /[\r\n]/.test(token)) return null;
      continue;
    }
    result.push(/^["']/.test(token) ? JSON.stringify(token.slice(1, -1)) : token);
  }
  return JSON.stringify(
    result.filter(
      (token, index) =>
        !(token === "," && ["]", "}", ")"].includes(result[index + 1])) &&
        !(
          token === ";" &&
          (result[index - 1]?.startsWith('"') || ["]", "}"].includes(result[index - 1]))
        ),
    ),
  );
}

export function matchesLegacyPlugins({ framework, ui = "none", css = "none" }, source) {
  const imports = [];
  const plugins = [];
  if (framework === "vue" && ui !== "none") {
    const resolvers = {
      "element-plus": [
        "import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'",
        "ElementPlusResolver()",
      ],
      antd: [
        "import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'",
        "AntDesignVueResolver({ importStyle: false })",
      ],
      tdesign: [
        "import { TDesignResolver } from '@tdesign-vue-next/auto-import-resolver'",
        "TDesignResolver({ library: 'vue-next' })",
      ],
    };
    const [resolverImport, resolver] = resolvers[ui];
    imports.push("import Components from 'unplugin-vue-components/vite'", resolverImport);
    plugins.push(`Components({ resolvers: [${resolver}], dts: 'src/components.d.ts' })`);
  }
  if (css === "unocss") {
    imports.push("import UnoCSS from 'unocss/vite'");
    plugins.push("UnoCSS()");
  }
  if (css === "tailwindcss") {
    imports.push("import tailwindcss from '@tailwindcss/vite'");
    plugins.push("tailwindcss()");
  }
  if (!plugins.length) return false;
  const expected = `${imports.join("\n")}\nexport function starterPlugins() { return [${plugins.join(",")}] }`;
  const actual = tokens(source);
  return actual !== null && actual === tokens(expected);
}
