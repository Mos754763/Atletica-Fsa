import type { Metadata } from "next";
import "./globals.css";
import "./auth.css";
import "./theme.css";
import "./store.css";
import "./cms.css";
import "./events-admin.css";
import "./ods.css";
import "./management.css";
import "./institutional-pages.css";
import "./members.css";
import "./member-interest.css";
import "./analytics.css";
import "./mobile-nav.css";
import "./erp.css";
import "./erp-mascot.css";
import "./motion.css";
import "./mobile-overflow.css";
import "./experience.css";
import "./depth-surfaces.css";
import { ExperienceChrome } from "@/components/fx/ExperienceChrome";
import { FrontendFx } from "@/components/fx/FrontendFx";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { DEFAULT_THEME } from "@/lib/theme";

export const metadata: Metadata = {
  title: "ATLETICA FSA | Um só grito, uma só torcida",
  description: "Loja, eventos, pedidos e gestão da ATLETICA FSA.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('fsa-theme');var d=t==='dark'||t==='light'?t:'${DEFAULT_THEME}';document.documentElement.dataset.theme=d;document.documentElement.style.colorScheme=d}catch(e){}` }} /></head>
      <body><div className="ambient-scene" aria-hidden="true"><span /><span /><span /></div><FrontendFx /><ExperienceChrome />{children}<ThemeToggle /></body>
    </html>
  );
}
