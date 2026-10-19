import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { logoutAction } from "@/lib/actions/admin/auth";
import { getAdmin } from "@/lib/admin/session";
import { siteConfig } from "../../../../site.config";

// Every admin page except the login page. The middleware already redirects
// anonymous visitors; this is the server-side re-check.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <AdminShell brand={siteConfig.name} adminName={admin.name} logoutAction={logoutAction}>
      {children}
    </AdminShell>
  );
}
