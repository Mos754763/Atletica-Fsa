"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SIGN_OUT_TIMEOUT_MS = 5_000;

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const supabase = createClient();
    let remoteSignOutFailed = false;

    try {
      const timeout = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("sign_out_timeout")), SIGN_OUT_TIMEOUT_MS);
      });

      const result = await Promise.race([supabase.auth.signOut({ scope: "global" }), timeout]);
      if (result.error) throw result.error;
    } catch (signOutError) {
      remoteSignOutFailed = true;
      console.error("[auth] remote-sign-out-failure", { kind: signOutError instanceof Error ? signOutError.name : "unknown" });
    } finally {
      if (remoteSignOutFailed) {
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      }
      window.location.replace("/");
    }
  }

  return <button className="sign-out" type="button" onClick={() => void signOut()} disabled={busy} title="Sair da conta"><LogOut size={16} /><span>{busy ? "Saindo..." : "Sair"}</span></button>;
}
