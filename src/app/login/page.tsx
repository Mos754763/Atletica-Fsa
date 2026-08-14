import Link from "next/link";
import { FsaWordmark } from "@/components/brand/FsaWordmark";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="auth-logo"><FsaWordmark /></Link>
      <section className="auth-page__intro">
        <p className="eyebrow">UMA SÓ TORCIDA</p>
        <h2>A FSA<br /><span>é sua.</span></h2>
        <p>Pedidos, eventos, benefícios e a energia da torcida reunidos na sua conta.</p>
      </section>
      <section className="auth-page__panel"><LoginForm /></section>
    </main>
  );
}
