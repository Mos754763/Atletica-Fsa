"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";

export function PasswordResetForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      window.location.assign("/conta?senha=atualizada");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Não foi possível atualizar a senha. Solicite um novo link de recuperação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card auth-card--reset">
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
    </div>
  );
}
