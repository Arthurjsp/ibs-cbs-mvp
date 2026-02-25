import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  roles?: UserRole[];
}

const items: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/documents", label: "Documentos" },
  { href: "/documents/upload", label: "Upload XML" },
  { href: "/assisted-assessment", label: "Apuracao" },
  { href: "/credits", label: "Creditos" },
  { href: "/scenarios", label: "Cenarios" },
  { href: "/reports", label: "Relatorios" },
  { href: "/settings/users", label: "Usuarios", roles: ["ADMIN"] },
  { href: "/billing", label: "Planos", roles: ["ADMIN", "CFO"] }
];

function canAccess(item: NavItem, role?: UserRole) {
  if (!item.roles || item.roles.length === 0) return true;
  if (!role) return false;
  return item.roles.includes(role);
}

export function AppNav({ pathname, userRole }: { pathname: string; userRole?: UserRole }) {
  return (
    <nav aria-label="Navegacao principal do produto">
      <ul className="flex flex-wrap gap-2">
        {items.filter((item) => canAccess(item, userRole)).map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
                  active ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-foreground"
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
