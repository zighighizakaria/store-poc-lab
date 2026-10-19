import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { ADMIN_DATABASE_URL, TEST_DATABASE_URL, TEST_DB_NAME } from "./test-db";

// Runs once before the test files: creates store_test if missing, then applies
// every migration to it (including the order_number_seq sequence).
export default async function setup() {
  const admin = new PrismaClient({ datasources: { db: { url: ADMIN_DATABASE_URL } } });
  try {
    const rows = await admin.$queryRaw<{ datname: string }[]>`
      SELECT datname FROM pg_database WHERE datname = ${TEST_DB_NAME}`;
    if (rows.length === 0) await admin.$executeRawUnsafe(`CREATE DATABASE "${TEST_DB_NAME}"`);
  } finally {
    await admin.$disconnect();
  }

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });
}
