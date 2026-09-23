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
    // `scripts/` joined the list at slice B0b: `supabase/seed.sql` is generated
    // from `data/*.ts`, and `scripts/gen-seed.test.ts` is what fails when the
    // file on disk and the fixture drift apart.
    //
    // `*.dbtest.ts` is deliberately NOT here. Those need a running Postgres,
    // and `npm test` has to stay runnable without Docker — they have their own
    // runner in `vitest.db.config.mts` (`npm run test:db`).
    include: ["{data,lib,app,components,scripts}/**/*.test.ts"],
  },
});
