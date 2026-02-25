"use client";

import { usePathname } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/signout-button";

export function HeaderShell({ email }: { email?: string | null }) {
  const pathname = usePathname();

  return (
    <header className="border-b bg-card/95 backdrop-blur" role="banner">
      <div className="container-page flex items-center justify-between gap-4 py-4">
        <div className="space-y-2">
          <p className="font-serif text-xl font-semibold tracking-tight text-primary">Tax Transition OS</p>
          <AppNav pathname={pathname} />
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground md:inline" aria-label="Usuario autenticado">
            {email ?? "Sem usuario"}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
