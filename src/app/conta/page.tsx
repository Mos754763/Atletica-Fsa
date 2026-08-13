import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, PackageCheck, Shield, ShoppingBag } from "lucide-react";
import { FsaWordmark } from "@/components/brand/FsaWordmark";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { roleLabel } from "@/lib/auth/roles";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import type { UserRole } from "@/types/domain";

export default async function AccountPage() {
  const supabase = await createServerAuthClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("display_name, email, role").eq("id", userId).single();
  const role = (profile?.role ?? "cliente") as UserRole;
  const name = profile?.display_name || profile?.email?.split("@")[0] || "Torcida FSA";

  return (
    <main className="account-page">
      <header className="account-header"><Link href="/"><FsaWordmark /></Link><SignOutButton /></header>
      <section className="account-hero">
        <p className="eyebrow">MINHA CONTA</p>
        <h1>Oi, {name}.</h1>
        <p><span className="role-pill"><Shield size={14} /> {roleLabel(role)}</span> Sua área FSA está pronta para acompanhar pedidos e eventos.</p>
      </section>
      <section className="account-links" aria-label="Atalhos da conta">
        <Link href="/loja"><ShoppingBag size={23} /><span><strong>Loja FSA</strong><small>Produtos e pedidos</small></span></Link>
        <Link href="/eventos"><CalendarDays size={23} /><span><strong>Meus eventos</strong><small>Inscrições e check-in</small></span></Link>
        <Link href="/conta/pedidos"><PackageCheck size={23} /><span><strong>Meus pedidos</strong><small>Acompanhar retiradas</small></span></Link>
      </section>
      {role === "admin" && <Link className="account-admin-link" href="/admin">Acessar backoffice</Link>}
      {(role === "admin" || role === "cozinha") && <Link className="account-admin-link" href="/ods">Abrir ODS</Link>}
    </main>
  );
}
