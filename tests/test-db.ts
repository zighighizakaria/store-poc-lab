// Connection strings of the test database. Derived from DATABASE_URL (.env) by
// swapping the database name, so the dev database is never touched by tests.
try {
  process.loadEnvFile?.();
} catch {
  // no .env file, rely on the real environment
}

export const TEST_DB_NAME = "store_test";

function withDatabase(name: string): string {
  const url = new URL(
    process.env.DATABASE_URL ?? "postgresql://store:store@localhost:5433/store?schema=public",
  );
  url.pathname = `/${name}`;
  return url.toString();
}

export const TEST_DATABASE_URL = withDatabase(TEST_DB_NAME);
/** Maintenance database used only to run CREATE DATABASE. */
export const ADMIN_DATABASE_URL = withDatabase("postgres");
