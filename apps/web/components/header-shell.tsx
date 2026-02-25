"use client";

import type { UserRole } from "@prisma/client";
import { usePathname } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/signout-button";

export function HeaderShell({ email, role }: { email?: string | null; role?: UserRole }) {
  const pathname = usePathname();

  return (
    <header className="border-b bg-card/95 backdrop-blur" role="banner">
      <div className="container-page flex items-center justify-between gap-4 py-4">
        <div className="space-y-2">
          <p className="font-serif text-xl font-semibold tracking-tight text-primary">Tax Transition OS</p>
          <AppNav pathname={pathname} userRole={role} />
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground md:inline" aria-label="Usuário autenticado">
            {email ?? "Sem usuário"}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
