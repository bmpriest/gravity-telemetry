import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    // globalSetup runs ONCE before the entire suite (across all files): drops
    // and recreates the test database, applies migrations, and seeds the ship
    // catalogue. See tests/setup/globalSetup.ts.
    globalSetup: ["./tests/setup/globalSetup.ts"],
    // setupFiles runs before EACH test file is imported: installs the
    // next/headers cookies() mock and clears the per-test cookie jar in a
    // beforeEach. See tests/setup/installMocks.ts.
    setupFiles: ["./tests/setup/installMocks.ts"],
    // The DB-backed tests share rows via the `User`/`Session`/etc tables.
    // Running them in parallel would race on TRUNCATE in beforeEach, so we
    // serialize. The unit-only tests (credits, changelog) don't care.
    fileParallelism: false,
  },
});
