import type { Metadata } from "next";
import "./globals.css";
import "./auth.css";
import "./store.css";
import "./cms.css";

export const metadata: Metadata = {
  title: "ATLETICA FSA | Um só grito, uma só torcida",
  description: "Loja, eventos, pedidos e gestão da ATLETICA FSA.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
