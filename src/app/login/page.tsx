import Link from "next/link";
import { FsaWordmark } from "@/components/brand/FsaWordmark";
import { RabbitMascot } from "@/components/brand/RabbitMascot";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="auth-logo"><FsaWordmark /></Link>
      <section className="auth-page__intro">
        <p className="eyebrow">UMA SÓ TORCIDA</p>
        <h2>A FSA<br /><span>é sua.</span></h2>
        <p>Pedidos, eventos, benefícios e a energia da torcida reunidos na sua conta.</p>
        <RabbitMascot className="auth-page__mascot" compact />
      </section>
      <section className="auth-page__panel"><LoginForm /></section>
    </main>
  );
}
