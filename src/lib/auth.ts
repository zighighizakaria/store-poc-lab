import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

// Admin sign-in: Credentials provider against AdminUser, JWT session.
// No /api/auth route is mounted on purpose: signIn/signOut/auth are only used
// from server actions, so the login rate limit cannot be bypassed over HTTP.
const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(1).max(200),
});

// Hash compared when the email is unknown, so timing does not reveal accounts.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const admin = await db.adminUser.findUnique({ where: { email: parsed.data.email } });
        const ok = await bcrypt.compare(parsed.data.password, admin?.passwordHash ?? DUMMY_HASH);
        if (!admin || !ok) return null;
        return { id: admin.id, email: admin.email, name: admin.name };
      },
    }),
  ],
});
