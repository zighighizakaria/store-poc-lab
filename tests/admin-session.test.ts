import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  LOGIN_MAX_FAILURES,
  LOGIN_WINDOW_MS,
  loginKey,
  recordLoginFailure,
  resetLoginRateLimits,
} from "@/lib/admin/rate-limit";
import { requireAdmin, UnauthorizedError } from "@/lib/admin/session";
import { auth } from "@/lib/auth";

// The Auth.js session reader is replaced: these tests are about the guard,
// not about Auth.js itself.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
const mockedAuth = vi.mocked(auth) as unknown as ReturnType<typeof vi.fn>;

beforeEach(async () => {
  mockedAuth.mockReset();
  await db.$executeRawUnsafe(`TRUNCATE "AdminUser" RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await db.$disconnect();
});

describe("requireAdmin", () => {
  it("rejects without a session", async () => {
    mockedAuth.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects a session without a user id", async () => {
    mockedAuth.mockResolvedValue({ user: {}, expires: "" });
    await expect(requireAdmin()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects a valid-looking session whose admin was deleted", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "ghost-admin-id" }, expires: "" });
    await expect(requireAdmin()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("returns the admin for a session of an existing admin", async () => {
    const admin = await db.adminUser.create({
      data: { email: "boss@example.test", name: "Boss", passwordHash: "x" },
    });
    mockedAuth.mockResolvedValue({ user: { id: admin.id }, expires: "" });
    await expect(requireAdmin()).resolves.toEqual({ id: admin.id, email: "boss@example.test", name: "Boss" });
  });
});

describe("login rate limit", () => {
  beforeEach(() => resetLoginRateLimits());

  it("blocks after the maximum failures, per IP + email, until the window passes", () => {
    const key = loginKey("1.2.3.4", "Admin@Example.test");
    const t0 = 1_000_000;
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
      expect(checkLoginRateLimit(key, t0 + i).allowed).toBe(true);
      recordLoginFailure(key, t0 + i);
    }
    expect(checkLoginRateLimit(key, t0 + 10).allowed).toBe(false);
    // Same email from another IP is not blocked; the key ignores email case.
    expect(checkLoginRateLimit(loginKey("5.6.7.8", "admin@example.test"), t0 + 10).allowed).toBe(true);
    expect(checkLoginRateLimit(loginKey("1.2.3.4", "admin@example.test"), t0 + 10).allowed).toBe(false);
    expect(checkLoginRateLimit(key, t0 + LOGIN_WINDOW_MS + 1).allowed).toBe(true);
  });

  it("is cleared by a successful login", () => {
    const key = loginKey("1.2.3.4", "a@example.test");
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) recordLoginFailure(key);
    clearLoginFailures(key);
    expect(checkLoginRateLimit(key).allowed).toBe(true);
  });
});
