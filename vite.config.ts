import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      create: {
        command: "node scripts/create.mjs",
        cache: false,
      },
    },
  },
  fmt: {
    // Keep imported Skills identical to their upstream source and installation hashes.
    ignorePatterns: [".agents/skills/git-commit/**", ".agents/skills/gitmoji/**"],
  },
});
