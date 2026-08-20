"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";
import { requiresMfaChallenge } from "@/lib/auth/mfa-assurance";

type MfaLoginChallengeProps = {
  nextPath: string;
};

export function MfaLoginChallenge({ nextPath }: MfaLoginChallengeProps) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function prepareChallenge() {
      try {
        const supabase = await getBrowserClient();
        const [{ data: assurance, error: assuranceError }, { data: factors, error: factorsError }] = await Promise.all([
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
          supabase.auth.mfa.listFactors(),
        ]);
        if (assuranceError) throw assuranceError;
        if (factorsError) throw factorsError;

        if (!requiresMfaChallenge(assurance?.currentLevel ?? null, assurance?.nextLevel ?? null)) {
          window.location.assign(nextPath);
          return;
        }

        const totpFactor = factors?.totp?.[0];
        if (!totpFactor) {
          throw new Error("Esta conta exige um segundo fator, mas não possui um aplicativo autenticador disponível. Contate a Presidência para recuperar o acesso.");
        }

        if (active) setFactorId(totpFactor.id);
      } catch (challengeError) {
        if (active) setError(challengeError instanceof Error ? challengeError.message : "Não foi possível preparar a verificação em duas etapas.");
      } finally {
        if (active) setBusy(false);
      }
    }

    void prepareChallenge();
    return () => { active = false; };
  }, [nextPath]);

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
      setError(verifyError instanceof Error ? verifyError.message : "O código não pôde ser validado. Tente novamente.");
    } finally {
      setBusy(false);
    }
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
