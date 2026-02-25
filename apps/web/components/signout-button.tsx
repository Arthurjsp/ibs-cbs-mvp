"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button variant="outline" aria-label="Encerrar sessão" onClick={() => signOut({ callbackUrl: "/auth/signin" })}>
      Sair
    </Button>
  );
}
