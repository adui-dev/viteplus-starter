import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    // Keep imported Skills identical to their upstream source and installation hashes.
    ignorePatterns: [".agents/skills/git-commit/**", ".agents/skills/gitmoji/**"],
  },
});
