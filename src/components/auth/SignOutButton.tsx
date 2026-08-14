"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SIGN_OUT_TIMEOUT_MS = 5_000;

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);

    try {
      const timeout = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("sign_out_timeout")), SIGN_OUT_TIMEOUT_MS);
      });

      await Promise.race([createClient().auth.signOut(), timeout]);
    } catch {
      // A navegação abaixo é intencional: o usuário nunca deve ficar preso na tela
      // caso a rede ou a limpeza de sessão remota demorem mais do que o aceitável.
    } finally {
      window.location.replace("/");
    }
  }

  return <button className="sign-out" type="button" onClick={() => void signOut()} disabled={busy} title="Sair da conta"><LogOut size={16} /><span>{busy ? "Saindo..." : "Sair"}</span></button>;
}
