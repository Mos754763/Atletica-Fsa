import Link from "next/link";
import { FsaWordmark } from "@/components/brand/FsaWordmark";
import { RabbitMascot } from "@/components/brand/RabbitMascot";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="auth-page auth-page--experience">
      <Link href="/" className="auth-logo"><FsaWordmark /></Link>
      <section className="auth-page__intro fx-depth-surface">
        <span className="fx-depth-surface__glow" aria-hidden="true" />
        <span className="auth-page__depth-orbit auth-page__depth-orbit--one" aria-hidden="true" />
        <span className="auth-page__depth-orbit auth-page__depth-orbit--two" aria-hidden="true" />
        <p className="eyebrow">UMA SÓ TORCIDA</p>
        <h2>A FSA<br /><span>é sua.</span></h2>
        <p>Pedidos, eventos, benefícios e a energia da torcida reunidos na sua conta.</p>
        <RabbitMascot className="auth-page__mascot" />
      </section>
      <section className="auth-page__panel"><LoginForm /></section>
    </main>
  );
}
