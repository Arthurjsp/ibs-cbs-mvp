import "./globals.css";
import { ReactNode } from "react";
import { getRequiredSession } from "@/lib/auth";
import { Providers } from "@/components/providers";
import { HeaderShell } from "@/components/header-shell";

export const metadata = {
  title: "Tax Transition OS - MVP",
  description: "Simulador estratégico de transição IBS/CBS para decisão financeira e operacional."
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getRequiredSession();
  const showHeader = Boolean(session?.user);

  return (
    <html lang="pt-BR">
      <body>
        <a
          href="#main-content"
          className="skip-link sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:font-medium"
        >
          Ir para o conteúdo principal
        </a>
        <Providers session={session}>
          {showHeader ? <HeaderShell email={session?.user?.email} /> : null}
          <main id="main-content" className="container-page">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}


