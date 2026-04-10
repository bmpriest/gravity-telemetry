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
    // Integration tests boot a Postgres container; allow plenty of headroom.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
