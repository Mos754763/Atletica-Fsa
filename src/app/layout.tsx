import type { Metadata } from "next";
import "./globals.css";
import "./auth.css";
import "./auth-captcha.css";
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
import "./sector-cards.css";
import { ExperienceChrome } from "@/components/fx/ExperienceChrome";
import { FrontendFx } from "@/components/fx/FrontendFx";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { DEFAULT_THEME } from "@/lib/theme";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "ATLETICA FSA | Um só grito, uma só torcida",
  description: "Loja, eventos, pedidos e gestão da ATLETICA FSA.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('fsa-theme');var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var d=t==='dark'||t==='light'?t:(m?'dark':'${DEFAULT_THEME}');document.documentElement.dataset.theme=d;document.documentElement.style.colorScheme=d}catch(e){}` }} /></head>
      <body><div className="ambient-scene" aria-hidden="true"><span /><span /><span /></div><FrontendFx /><ExperienceChrome />{children}<ThemeToggle /><Analytics /><SpeedInsights /></body>
    </html>
  );
}
