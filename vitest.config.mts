import { defineConfig } from "vitest/config";

// `.mts`, not `.ts`: the package is CommonJS, and Vite refuses to load an ESM
// config from a `.ts` file under it.
//
// No `vite-tsconfig-paths` either. Next's own testing guide still lists it,
// but the installed Vite resolves tsconfig `paths` natively and warns that the
// plugin is redundant — the tool is newer than the doc.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // Phase 1 is pure logic — fixtures and the functions derived from them —
    // so `node` is enough and there is no jsdom yet. Phase 2 brings components,
    // and with them jsdom + @testing-library/react.
    environment: "node",
    include: ["{data,lib,app,components}/**/*.test.ts"],
  },
});
