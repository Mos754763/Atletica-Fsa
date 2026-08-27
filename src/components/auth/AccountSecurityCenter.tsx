"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, KeyRound, LoaderCircle, MonitorCheck, ShieldCheck, ShieldOff, Smartphone, TriangleAlert } from "lucide-react";
import { formatMfaFactorType } from "@/lib/auth/mfa-assurance";
import { getBrowserClient } from "@/lib/supabase/client";

type FactorSummary = {
  id: string;
  factorType: string;
  friendlyName: string | null;
  status: string;
  createdAt: string | null;
};

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

type Notice = { kind: "success" | "error"; text: string } | null;

const providerLabel: Record<string, string> = {
  email: "E-mail e senha",
  google: "Google",
  azure: "Microsoft",
  apple: "Apple",
};

export function AccountSecurityCenter() {
  const router = useRouter();
  const [factors, setFactors] = useState<FactorSummary[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [aal, setAal] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState<Notice>(null);

  const qrImageSrc = useMemo(() => enrollment ? `data:image/svg+xml;utf8,${encodeURIComponent(enrollment.qrCode)}` : null, [enrollment]);
  const verifiedFactors = factors.filter((factor) => factor.status === "verified");
  const providerCount = Math.max(providers.length, 1);

  const refreshSecurityState = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = await getBrowserClient();
      const [{ data: factorData, error: factorError }, { data: assurance, error: assuranceError }, { data: userData, error: userError }] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.getUser(),
      ]);
      if (factorError) throw factorError;
      if (assuranceError) throw assuranceError;
      if (userError) throw userError;
      if (!userData.user) {
        router.replace("/login?next=%2Fconta%2Fseguranca");
        return;
      }

      setFactors((factorData?.all ?? []).map((factor) => ({
        id: factor.id,
        factorType: factor.factor_type,
        friendlyName: factor.friendly_name ?? null,
        status: factor.status,
        createdAt: factor.created_at ?? null,
      })));
      setAal(assurance?.currentLevel ?? null);
      setPhone(userData.user.phone ?? null);
      setProviders(Array.from(new Set((userData.user.identities ?? []).map((identity) => identity.provider))));
    } catch (securityError) {
      setNotice({ kind: "error", text: securityError instanceof Error ? securityError.message : "Não foi possível carregar as configurações de segurança." });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshSecurityState(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshSecurityState]);

  async function beginTotpEnrollment() {
    setBusyAction("enroll-totp");
    setNotice(null);
    try {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Autenticador FSA", issuer: "ATLETICA FSA" });
      if (error) throw error;
      setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
      setTotpCode("");
    } catch (enrollmentError) {
      setNotice({ kind: "error", text: enrollmentError instanceof Error ? enrollmentError.message : "Não foi possível iniciar o aplicativo autenticador." });
    } finally {
      setBusyAction(null);
    }
  }

  async function cancelTotpEnrollment() {
    if (!enrollment) return;
    setBusyAction("cancel-totp");
    try {
      const supabase = await getBrowserClient();
      await supabase.auth.mfa.unenroll({ factorId: enrollment.factorId });
      setEnrollment(null);
      setTotpCode("");
      await refreshSecurityState();
    } finally {
      setBusyAction(null);
    }
  }

  async function verifyTotpEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment) return;
    setBusyAction("verify-totp");
    setNotice(null);
    try {
      const supabase = await getBrowserClient();
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.factorId, code: totpCode.trim() });
      if (error) throw error;
      setEnrollment(null);
      setTotpCode("");
      setNotice({ kind: "success", text: "Aplicativo autenticador confirmado. Sua sessão foi elevada para a proteção em duas etapas." });
      await refreshSecurityState();
    } catch (verificationError) {
      setNotice({ kind: "error", text: verificationError instanceof Error ? verificationError.message : "O código não pôde ser validado." });
    } finally {
      setBusyAction(null);
    }
  }

  async function removeFactor(factor: FactorSummary) {
    if (!window.confirm(`Remover ${formatMfaFactorType(factor.factorType).toLowerCase()}${factor.friendlyName ? ` “${factor.friendlyName}”` : ""}?`)) return;
    setBusyAction(`remove-${factor.id}`);
    setNotice(null);
    try {
      const supabase = await getBrowserClient();
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) throw error;
      setNotice({ kind: "success", text: "Segundo fator removido com sucesso." });
      await refreshSecurityState();
    } catch (removeError) {
      setNotice({ kind: "error", text: removeError instanceof Error ? removeError.message : "Não foi possível remover o segundo fator." });
    } finally {
      setBusyAction(null);
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setNotice({ kind: "error", text: "Use uma senha com pelo menos oito caracteres." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotice({ kind: "error", text: "As senhas informadas não coincidem." });
      return;
    }
    setBusyAction("password");
    setNotice(null);
    try {
      const supabase = await getBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      setNotice({ kind: "success", text: "A atualização de senha foi solicitada. Caso a confirmação segura esteja habilitada, conclua-a pelo e-mail enviado pelo Supabase." });
    } catch (passwordError) {
      setNotice({ kind: "error", text: passwordError instanceof Error ? passwordError.message : "Não foi possível atualizar a senha." });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="protected-page account-security-page">
      <header className="account-header"><Link href="/conta" className="protected-back"><ChevronLeft size={16} /> Minha conta</Link></header>
      <section className="account-hero">
        <p className="eyebrow">CENTRO DE SEGURANÇA</p>
        <h1>Proteja sua conta.</h1>
        <p>Gerencie senha, provedores conectados e autenticação em duas etapas. As permissões de membro continuam definidas pelo perfil institucional da FSA.</p>
      </section>

      {notice && <p className={`security-notice security-notice--${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>{notice.kind === "success" ? <CheckCircle2 size={17} /> : <TriangleAlert size={17} />}{notice.text}</p>}

      <section className="security-overview" aria-label="Resumo da segurança">
        <article><ShieldCheck size={22} /><span>Proteção atual</span><strong>{verifiedFactors.length > 0 ? "MFA configurado" : "Somente primeiro fator"}</strong><small>{aal === "aal2" ? "Sessão atual validada em duas etapas" : "Sessão atual em nível padrão"}</small></article>
        <article><MonitorCheck size={22} /><span>Provedores</span><strong>{providerCount} conectado{providerCount === 1 ? "" : "s"}</strong><small>{providers.map((provider) => providerLabel[provider] ?? provider).join(" · ") || "E-mail e senha"}</small></article>
        <article><Smartphone size={22} /><span>Telefone</span><strong>{phone ? "Confirmado" : "Aguardando ativação"}</strong><small>{phone ? "Número confirmado na sua conta" : "Depende de provedor SMS homologado"}</small></article>
      </section>

      <section className="security-grid">
        <article className="security-card">
          <div className="security-card__heading"><span className="security-card__icon"><ShieldCheck size={20} /></span><div><h2>Aplicativo autenticador</h2><p>Use Google Authenticator, Microsoft Authenticator, 1Password ou equivalente.</p></div></div>
          {loading ? <p className="security-loading"><LoaderCircle size={16} /> Carregando fatores...</p> : enrollment ? <form className="security-enrollment" onSubmit={verifyTotpEnrollment}>
            {qrImageSrc && <img src={qrImageSrc} alt="QR Code para configurar o aplicativo autenticador" />}
            <p>Escaneie o QR Code no aplicativo. Se não puder escanear, use a chave exibida apenas neste momento.</p>
            <code>{enrollment.secret}</code>
            <label>Código de seis dígitos<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={totpCode} onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" /></label>
            <div className="security-actions"><button className="account-admin-link" type="submit" disabled={busyAction === "verify-totp"}>{busyAction === "verify-totp" ? "Confirmando..." : "Confirmar aplicativo"}</button><button className="security-text-button" type="button" onClick={() => void cancelTotpEnrollment()} disabled={busyAction === "cancel-totp"}>Cancelar</button></div>
          </form> : <>
            {factors.length === 0 ? <p className="security-empty">Nenhum segundo fator foi configurado nesta conta.</p> : <ul className="security-factor-list">{factors.map((factor) => <li key={factor.id}><span><strong>{formatMfaFactorType(factor.factorType)}</strong><small>{factor.friendlyName ?? "Fator sem nome"} · {factor.status === "verified" ? "verificado" : "aguardando confirmação"}</small></span><button className="security-text-button security-text-button--danger" type="button" disabled={busyAction === `remove-${factor.id}`} onClick={() => void removeFactor(factor)}>{busyAction === `remove-${factor.id}` ? "Removendo..." : "Remover"}</button></li>)}</ul>}
            <button className="account-admin-link" type="button" onClick={() => void beginTotpEnrollment()} disabled={busyAction === "enroll-totp"}>{busyAction === "enroll-totp" ? "Preparando..." : "Adicionar aplicativo"}</button>
          </>}
        </article>

        <article className="security-card">
          <div className="security-card__heading"><span className="security-card__icon"><KeyRound size={20} /></span><div><h2>Senha de acesso</h2><p>Crie uma senha forte e não reutilizada em outros serviços.</p></div></div>
          <form className="security-password-form" onSubmit={updatePassword}>
            <label>Nova senha<input required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
            <label>Confirmar nova senha<input required minLength={8} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
            <button className="account-admin-link" type="submit" disabled={busyAction === "password"}>{busyAction === "password" ? "Atualizando..." : "Atualizar senha"}</button>
          </form>
          <p className="security-footnote">Se você perdeu o acesso, use <Link href="/login">“Esqueci minha senha”</Link> na tela de login.</p>
        </article>

        <article className="security-card security-card--muted">
          <div className="security-card__heading"><span className="security-card__icon"><Smartphone size={20} /></span><div><h2>Verificação por telefone</h2><p>O fluxo será liberado após a FSA homologar um provedor SMS, custos e proteções antiabuso no Brasil.</p></div></div>
          <p className="security-empty">Nenhuma mensagem será enviada nem haverá cobrança até a configuração externa ser aprovada.</p>
        </article>

        <article className="security-card security-card--muted">
          <div className="security-card__heading"><span className="security-card__icon"><ShieldOff size={20} /></span><div><h2>Privacidade e acesso</h2><p>Os termos e a matriz LGPD da FSA orientam o tratamento de dados e permissões.</p></div></div>
          <p className="security-empty">Para solicitações de dados pessoais ou recuperação de acesso, contate a Presidência pelos canais institucionais.</p>
        </article>
      </section>
    </main>
  );
}
