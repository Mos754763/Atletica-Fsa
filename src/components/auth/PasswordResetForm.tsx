"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, ShoppingBag, UserRound } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";
import { passwordResetSuccess } from "@/lib/auth/password-recovery";

export function PasswordResetForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmation) {
      setError("As senhas informadas não coincidem.");
      return;
    }

    setBusy(true);
    try {
      const supabase = await getBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setCompleted(true);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Não foi possível atualizar a senha. Solicite um novo link de recuperação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card auth-card--reset">
      {completed ? (
        <section className="password-reset-success" aria-live="polite" role="status">
          <span className="password-reset-success__icon"><CheckCircle2 size={28} strokeWidth={2.5} /></span>
          <div>
            <span className="auth-card__eyebrow">{passwordResetSuccess.eyebrow}</span>
            <h1>{passwordResetSuccess.title}</h1>
            <p>{passwordResetSuccess.description}</p>
          </div>
          <p className="password-reset-success__note"><ShieldCheck size={16} />{passwordResetSuccess.sessionNote}</p>
          <div className="password-reset-success__actions">
            <Link className="password-reset-success__primary" href={passwordResetSuccess.primaryAction.href}><UserRound size={17} />{passwordResetSuccess.primaryAction.label}<ArrowRight size={17} /></Link>
            <Link className="password-reset-success__secondary" href={passwordResetSuccess.secondaryAction.href}><ShoppingBag size={17} />{passwordResetSuccess.secondaryAction.label}</Link>
          </div>
        </section>
      ) : (
        <>
          <div className="auth-card__heading">
            <span className="auth-card__eyebrow">RECUPERAÇÃO DE ACESSO</span>
            <h1>Defina uma nova senha.</h1>
            <p>Escolha uma senha forte para recuperar o acesso à sua conta FSA.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              <span>Nova senha</span>
              <div className="auth-field"><ShieldCheck size={17} /><input required minLength={6} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" /></div>
            </label>
            <label>
              <span>Confirme a nova senha</span>
              <div className="auth-field"><ShieldCheck size={17} /><input required minLength={6} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repita a nova senha" /></div>
            </label>
            {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Atualizando..." : "Atualizar senha"}<ArrowRight size={18} /></button>
          </form>
        </>
      )}
    </div>
  );
}
