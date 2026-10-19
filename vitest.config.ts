import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { TEST_DATABASE_URL } from "./tests/test-db";

// Tests for the order logic run against the Docker Postgres, in a separate
// database (store_test) created and migrated by tests/global-setup.ts.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    env: { DATABASE_URL: TEST_DATABASE_URL },
    // One shared database: run test files one after the other.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
