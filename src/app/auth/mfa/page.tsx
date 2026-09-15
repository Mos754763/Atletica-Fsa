import Link from "next/link";
import { redirect } from "next/navigation";
import { FsaWordmark } from "@/components/brand/FsaWordmark";
import { RabbitMascot } from "@/components/brand/RabbitMascot";
import { MfaLoginChallenge } from "@/components/auth/MfaLoginChallenge";
import { buildMfaRedirectPath, requiresMfaChallenge } from "@/lib/auth/mfa-assurance";
import { resolveSafeRedirectPath } from "@/lib/auth/redirect-path";
import { createServerAuthClient } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const supabase = await createServerAuthClient();
  const query = await searchParams;
  const nextPath = resolveSafeRedirectPath(query.next, "/conta");
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (!sessionError && !sessionData.session) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const accessToken = sessionData.session?.access_token;

  // Passing the token makes auth-js validate it and fetch current factor data rather
  // than deriving the next assurance level from cookie-backed session.user.factors.
  const mfaResults = !sessionError && accessToken
    ? await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(accessToken),
      supabase.auth.mfa.listFactors(),
    ])
    : null;
  const assurance = mfaResults?.[0].data;
  const assuranceError = mfaResults?.[0].error;
  const factors = mfaResults?.[1].data;
  const factorsError = mfaResults?.[1].error;
  const hasRecognizedAssuranceLevels = (assurance?.currentLevel === "aal1" || assurance?.currentLevel === "aal2")
    && (assurance.nextLevel === "aal1" || assurance.nextLevel === "aal2");
  const assuranceRegressed = assurance?.currentLevel === "aal2" && assurance?.nextLevel === "aal1";
  const lookupFailed = Boolean(sessionError || !accessToken || assuranceError || factorsError)
    || !hasRecognizedAssuranceLevels
    || assuranceRegressed;

  const requiresChallenge = !lookupFailed
    && requiresMfaChallenge(assurance?.currentLevel ?? null, assurance?.nextLevel ?? null);
  const totpFactor = factors?.totp?.find((factor) => factor.status === "verified");
  const assuranceMismatch = Boolean(totpFactor && assurance?.nextLevel !== "aal2");

  if (!lookupFailed && !assuranceMismatch && !requiresChallenge) redirect(nextPath);

  const challengeUnavailable = Boolean(lookupFailed || assuranceMismatch || !totpFactor);

  return (
    <main className="auth-page auth-page--experience">
      <Link href="/" className="auth-logo"><FsaWordmark /></Link>
      <section className="auth-page__intro fx-depth-surface">
        <span className="fx-depth-surface__glow" aria-hidden="true" />
        <span className="auth-page__depth-orbit auth-page__depth-orbit--one" aria-hidden="true" />
        <span className="auth-page__depth-orbit auth-page__depth-orbit--two" aria-hidden="true" />
        <p className="eyebrow">VERIFICAÇÃO FSA</p>
        <h2>Acesso<br /><span>protegido.</span></h2>
        <p>Um passo adicional ajuda a manter sua conta e os dados operacionais da FSA em segurança.</p>
        <RabbitMascot className="auth-page__mascot" />
      </section>
      <section className="auth-page__panel">
        {challengeUnavailable ? (
          <div className="auth-card">
            <div className="auth-card__heading">
              <span className="auth-card__eyebrow">VERIFICAÇÃO EM PAUSA</span>
              <h1>Não foi possível confirmar a segurança da sessão.</h1>
              <p>Tente novamente. Se o problema persistir, entre novamente ou contate a Presidência para recuperar o acesso.</p>
            </div>
            <Link className="auth-submit" href={buildMfaRedirectPath(nextPath)}>Tentar novamente</Link>
          </div>
        ) : (
          <MfaLoginChallenge nextPath={nextPath} factorId={totpFactor?.id} />
        )}
      </section>
    </main>
  );
}
