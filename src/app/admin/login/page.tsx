import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";
import { Card } from "@/components/ui/Card";
import { siteConfig } from "../../../../site.config";

export const metadata: Metadata = { title: `Connexion | Admin ${siteConfig.name}` };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center p-16">
      <Card className="w-full max-w-modal p-24 md:p-32">
        <p className="text-body font-medium text-muted">{siteConfig.name}</p>
        <h1 className="mt-4 mb-24 text-display-sm font-semibold tracking-tight">Connexion admin</h1>
        <LoginForm next={next ?? ""} />
      </Card>
    </main>
  );
}
