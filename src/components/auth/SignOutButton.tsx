"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { signOutCurrentBrowserSession } from "@/lib/auth/signout";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await signOutCurrentBrowserSession({
        client: await getBrowserClient(),
        redirect: () => window.location.replace("/"),
      });
    } catch (error) {
      console.error("[auth] sign-out-client-unavailable", { kind: error instanceof Error ? error.name : "unknown" });
      window.location.replace("/");
    }
  }

  return <button className="sign-out" type="button" onClick={() => void signOut()} disabled={busy} title="Sair da conta"><LogOut size={16} /><span>{busy ? "Saindo..." : "Sair"}</span></button>;
}
