"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  FileText,
  FolderTree,
  ImageIcon,
  Layers,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Package,
  Palette,
  Ruler,
  Settings,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Commandes", icon: ShoppingBag },
  { href: "/admin/products", label: "Produits", icon: Package },
  { href: "/admin/categories", label: "Catégories", icon: FolderTree },
  { href: "/admin/collections", label: "Collections", icon: Layers },
  { href: "/admin/colors", label: "Couleurs", icon: Palette },
  { href: "/admin/sizes", label: "Tailles", icon: Ruler },
  { href: "/admin/banners", label: "Bannières", icon: ImageIcon },
  { href: "/admin/pages", label: "Pages", icon: FileText },
  { href: "/admin/cities", label: "Villes", icon: MapPin },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/settings", label: "Réglages", icon: Settings },
  { href: "/admin/admins", label: "Admins", icon: Users },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Navigation admin" className="flex flex-col gap-4">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-44 items-center gap-12 rounded-pill px-16 text-body-lg font-medium transition-colors duration-fast",
              active ? "bg-ink text-on-accent" : "text-ink hover:bg-canvas",
            )}
          >
            <Icon aria-hidden="true" strokeWidth={1.5} className="size-20 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

type Props = {
  brand: string;
  adminName: string;
  logoutAction: () => Promise<void>;
  children: ReactNode;
};

/** Sidebar (desktop) / drawer (phone) + topbar with the admin name and logout. */
export function AdminShell({ brand, adminName, logoutAction, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-sidebar shrink-0 border-e border-line bg-surface p-16 print:hidden md:sticky md:top-0 md:block md:h-screen md:overflow-y-auto">
        <p className="mb-20 px-16 text-title font-semibold tracking-tight">{brand}</p>
        <NavLinks pathname={pathname} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex min-h-48 items-center justify-between gap-12 border-b border-line bg-surface px-16 py-4 print:hidden">
          <div className="flex items-center gap-8">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Ouvrir le menu"
              className="inline-flex size-44 items-center justify-center rounded-pill hover:bg-canvas md:hidden"
            >
              <Menu aria-hidden="true" strokeWidth={1.5} className="size-24" />
            </button>
            <span className="text-body-lg font-semibold md:hidden">{brand}</span>
            <span className="hidden text-body text-muted md:inline">Back-office</span>
          </div>
          <div className="flex items-center gap-8">
            <span className="max-w-[160px] truncate text-body font-medium sm:max-w-none">{adminName}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex min-h-44 items-center gap-8 rounded-pill border border-line bg-surface px-16 text-body font-medium shadow-sm hover:bg-canvas"
              >
                <LogOut aria-hidden="true" strokeWidth={1.5} className="size-16" />
                <span className="hidden sm:inline">Déconnexion</span>
                <span className="sr-only sm:hidden">Déconnexion</span>
              </button>
            </form>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-16 md:p-24">{children}</main>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} title={brand} closeLabel="Fermer le menu" side="start">
        <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
      </Drawer>
    </div>
  );
}
