import "./globals.css";
import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Providers } from "@/components/providers";
import { HeaderShell } from "@/components/header-shell";

export const metadata = {
  title: "Simulador IBS/CBS - MVP",
  description: "Motor de cálculo estimado para reforma tributária com auditoria de regras."
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const showHeader = Boolean(session?.user);

  return (
    <html lang="pt-BR">
      <body>
        <Providers session={session}>
          {showHeader ? <HeaderShell email={session?.user?.email} /> : null}
          <main className="container-page">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

