"use client";

import { FormEvent, useCallback, useState } from "react";
import { ArrowRight, Chrome, Mail, ShieldCheck } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";
import { buildPasswordRecoveryRedirect } from "@/lib/auth/password-recovery";
import { buildMfaRedirectPath } from "@/lib/auth/mfa-assurance";
import { resolveSafeRedirectPath } from "@/lib/auth/redirect-path";
import { AuthCaptcha } from "./AuthCaptcha";

type AuthMode = "login" | "signup" | "recovery";

function authFailureMessage(mode: AuthMode) {
  if (mode === "login") return "Não foi possível entrar com essas credenciais. Verifique os dados e tente novamente.";
  if (mode === "signup") return "Não foi possível concluir o cadastro agora. Tente novamente em alguns instantes.";
  return "Não foi possível enviar o link de recuperação agora. Tente novamente em alguns instantes.";
}

export function LoginForm() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const captchaEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
  const updateCaptchaToken = useCallback((token: string | null) => setCaptchaToken(token), []);

  function resetCaptcha() {
    setCaptchaToken(null);
    setCaptchaResetKey((current) => current + 1);
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setMessage(null);
    resetCaptcha();
  }
  function mfaRedirectPath() {
    const nextPath = resolveSafeRedirectPath(new URLSearchParams(window.location.search).get("next"), "/conta");
    return buildMfaRedirectPath(nextPath);
  }

  async function loginWithGoogle() {
    setBusy(true);
    setError(null);
    try {
      const supabase = await getBrowserClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(mfaRedirectPath())}` },
      });
      if (oauthError) throw oauthError;
    } catch (authError) {
      console.error("[auth] google-oauth-start-failure", { kind: authError instanceof Error ? authError.name : "unknown" });
      setError("Não foi possível iniciar a autenticação com Google. Tente novamente em alguns instantes.");
      setBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (captchaEnabled && !captchaToken) {
      setError("Conclua a verificação de segurança antes de continuar.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = await getBrowserClient();
      if (mode === "login") {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken: captchaToken ?? undefined } });
        if (loginError) throw loginError;
        window.location.assign(mfaRedirectPath());
        return;
      }

      if (mode === "recovery") {
        const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: buildPasswordRecoveryRedirect(window.location.origin),
          captchaToken: captchaToken ?? undefined,
        });
        if (recoveryError) throw recoveryError;
        setMessage("Se o e-mail estiver cadastrado, você receberá um link seguro para definir uma nova senha.");
        resetCaptcha();
        return;
      }

      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/conta`, captchaToken: captchaToken ?? undefined },
      });
      if (signupError) throw signupError;
      if (data.session) {
        window.location.assign(mfaRedirectPath());
        return;
      }
      setMessage("Conta criada. Confira seu e-mail para confirmar o acesso.");
      resetCaptcha();
    } catch (authError) {
      console.error("[auth] credential-flow-failure", { mode, kind: authError instanceof Error ? authError.name : "unknown" });
      setError(authFailureMessage(mode));
      resetCaptcha();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card__heading">
        <span className="auth-card__eyebrow">ACESSO FSA</span>
        <h1>{mode === "login" ? "Chegue junto." : mode === "signup" ? "Entre para a torcida." : "Recupere seu acesso."}</h1>
        <p>{mode === "recovery" ? "Informe seu e-mail para receber um link seguro de definição de nova senha." : "Use sua conta para pedir, se inscrever e acompanhar tudo o que acontece na FSA."}</p>
      </div>

      {mode !== "recovery" && <>
        <button className="auth-google" type="button" onClick={loginWithGoogle} disabled={busy}>
          <Chrome size={18} /> Continuar com Google
        </button>
        <div className="auth-divider"><span>ou use seu e-mail</span></div>
      </>}

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>E-mail</span>
          <div className="auth-field"><Mail size={17} /><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" /></div>
        </label>
        {mode !== "recovery" && <label>
          <span>Senha</span>
          <div className="auth-field"><ShieldCheck size={17} /><input required minLength={6} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" /></div>
        </label>}
        <AuthCaptcha onTokenChange={updateCaptchaToken} resetKey={captchaResetKey} />
        {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}
        {message && <p className="auth-feedback" role="status">{message}</p>}
        <button className="auth-submit" type="submit" disabled={busy || (captchaEnabled && !captchaToken)}>{busy ? "Aguarde..." : mode === "login" ? "Entrar na FSA" : mode === "signup" ? "Criar minha conta" : "Enviar link de recuperação"}<ArrowRight size={18} /></button>
      </form>

      {mode === "login" ? <p className="auth-switch">Ainda não tem conta? <button type="button" onClick={() => changeMode("signup")}>Criar conta</button> · <button type="button" onClick={() => changeMode("recovery")}>Esqueci minha senha</button></p> : <p className="auth-switch">{mode === "signup" ? "Já faz parte da FSA?" : "Lembrou sua senha?"} <button type="button" onClick={() => changeMode("login")}>Entrar</button></p>}
    </div>
  );
}
