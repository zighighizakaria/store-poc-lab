import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type AdminSession = { id: string; email: string; name: string };

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** The signed-in admin, or null. The admin must still exist (deleted admins lose access at once). */
export async function getAdmin(): Promise<AdminSession | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const admin = await db.adminUser.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  });
  return admin;
}

/**
 * Session check for every admin server action and route handler (the
 * middleware is a first line of defence, this is the one that counts).
 * Throws UnauthorizedError without a valid session.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) throw new UnauthorizedError();
  return admin;
}
