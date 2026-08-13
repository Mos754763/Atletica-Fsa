import type { Metadata } from "next";
import "./globals.css";
import "./auth.css";
import "./store.css";
import "./cms.css";
import "./events-admin.css";
import "./ods.css";
import "./management.css";
import "./institutional-pages.css";
import "./members.css";
import "./analytics.css";

export const metadata: Metadata = {
  title: "ATLETICA FSA | Um só grito, uma só torcida",
  description: "Loja, eventos, pedidos e gestão da ATLETICA FSA.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body><div className="ambient-scene" aria-hidden="true"><span /><span /><span /></div>{children}</body>
    </html>
  );
}
