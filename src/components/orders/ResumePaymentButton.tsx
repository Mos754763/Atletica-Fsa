"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";

export function ResumePaymentButton({ orderId }: { orderId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function resumePayment() {
    setState("loading"); setError(null);
    try {
      const supabase = await getBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) throw new Error("Sua sessão expirou. Entre novamente para continuar.");
      const response = await fetch("/api/checkout/resume", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ orderId }) });
      const body = await response.json() as { checkoutUrl?: string; error?: string };
      if (!response.ok || !body.checkoutUrl) throw new Error(body.error ?? "Não foi possível retomar o pagamento.");
      window.location.assign(body.checkoutUrl);
    } catch (resumeError) {
      setState("error"); setError(resumeError instanceof Error ? resumeError.message : "Não foi possível retomar o pagamento.");
    }
  }

  return <div className="customer-order__resume"><button type="button" onClick={() => void resumePayment()} disabled={state === "loading"} aria-busy={state === "loading"}><CreditCard size={16} />{state === "loading" ? "Abrindo Mercado Pago..." : "Retomar pagamento"}</button>{state === "error" && <small role="status">{error}</small>}</div>;
}
