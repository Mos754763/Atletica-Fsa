"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut();
    window.location.assign("/");
  }

  return <button className="sign-out" type="button" onClick={signOut} disabled={busy}><LogOut size={16} />{busy ? "Saindo..." : "Sair"}</button>;
}
