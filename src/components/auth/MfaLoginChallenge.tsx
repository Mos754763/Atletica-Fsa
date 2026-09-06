"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";

type MfaLoginChallengeProps = {
  nextPath: string;
  /** The server only supplies this after it confirms an AAL2 TOTP step is required. */
  factorId?: string;
};

export function MfaLoginChallenge({ nextPath, factorId }: MfaLoginChallengeProps) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);

    try {
      const supabase = await getBrowserClient();
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
      if (verifyError) throw verifyError;
      window.location.assign(nextPath);
    } catch (verifyError) {
      console.error("[auth] mfa-challenge-verify-failure", { kind: verifyError instanceof Error ? verifyError.name : "unknown" });
      setError("O código não pôde ser validado. Confira o aplicativo autenticador e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  if (!factorId) {
    return (
      <div className="auth-card">
        <div className="auth-card__heading">
          <span className="auth-card__eyebrow">VERIFICAÇÃO EM PAUSA</span>
          <h1>Não foi possível preparar a verificação em duas etapas.</h1>
          <p>Atualize a página ou entre novamente para tentar de novo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-card__heading">
        <span className="auth-card__eyebrow">SEGURANÇA DA CONTA</span>
        <h1>Confirme que é você.</h1>
        <p>Abra o aplicativo autenticador configurado para a sua conta FSA e informe o código de seis dígitos.</p>
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>Código do autenticador</span>
          <div className="auth-field"><ShieldCheck size={17} /><input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" /></div>
        </label>
        {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}
        <button className="auth-submit" type="submit" disabled={busy || !factorId}>{busy ? "Verificando..." : <>Confirmar acesso <ArrowRight size={18} /></>}</button>
      </form>
    </div>
  );
}
