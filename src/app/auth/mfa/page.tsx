import Link from "next/link";
import { redirect } from "next/navigation";
import { FsaWordmark } from "@/components/brand/FsaWordmark";
import { RabbitMascot } from "@/components/brand/RabbitMascot";
import { MfaLoginChallenge } from "@/components/auth/MfaLoginChallenge";
import { resolveSafeRedirectPath } from "@/lib/auth/redirect-path";
import { createServerAuthClient } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const supabase = await createServerAuthClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/login");
  const query = await searchParams;
  const nextPath = resolveSafeRedirectPath(query.next, "/conta");

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
      <section className="auth-page__panel"><MfaLoginChallenge nextPath={nextPath} /></section>
    </main>
  );
}
