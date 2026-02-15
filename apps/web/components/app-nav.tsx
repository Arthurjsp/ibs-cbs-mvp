import Link from "next/link";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/documents", label: "Documentos" },
  { href: "/documents/upload", label: "Upload XML" },
  { href: "/assisted-assessment", label: "Apuração" },
  { href: "/credits", label: "Créditos" },
  { href: "/scenarios", label: "Cenários" },
  { href: "/reports", label: "Relatórios" },
  { href: "/billing", label: "Billing" }
];

export function AppNav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
            pathname.startsWith(item.href) ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
