import { db } from "@/lib/db";
import { requireAdmin, UnauthorizedError } from "@/lib/admin/session";
import { toCsv } from "@/lib/admin/csv";

export const dynamic = "force-dynamic";

// CSV export of the newsletter list. The middleware redirects anonymous
// visitors; the session is checked again here (401 without it).
export async function GET() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    throw error;
  }

  const subscribers = await db.newsletterSubscriber.findMany({ orderBy: { createdAt: "asc" } });
  const csv = toCsv(
    ["email", "locale", "subscribed_at"],
    subscribers.map((s) => [s.email, s.locale, s.createdAt.toISOString()]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
