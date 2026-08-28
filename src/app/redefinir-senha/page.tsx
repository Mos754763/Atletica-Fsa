import { FsaWordmark } from "@/components/brand/FsaWordmark";
import { RabbitMascot } from "@/components/brand/RabbitMascot";
import { PasswordResetForm } from "@/components/auth/PasswordResetForm";
import Link from "next/link";
import styles from "./reset-password.module.css";

export default function PasswordResetPage() {
  return (
    <main className={`auth-page auth-page--experience auth-page--reset ${styles.page}`}>
      <Link href="/" className="auth-logo"><FsaWordmark /></Link>
      <section className={`auth-page__intro fx-depth-surface ${styles.intro}`}>
        <span className="fx-depth-surface__glow" aria-hidden="true" />
        <span className="auth-page__depth-orbit auth-page__depth-orbit--one" aria-hidden="true" />
        <span className="auth-page__depth-orbit auth-page__depth-orbit--two" aria-hidden="true" />
        <p className="eyebrow">ACESSO PROTEGIDO</p>
        <h2>Volte para<br /><span>a torcida.</span></h2>
        <p>Atualize sua senha com segurança e retome seus pedidos, eventos e benefícios.</p>
        <RabbitMascot className="auth-page__mascot" />
      </section>
      <section className={`auth-page__panel ${styles.panel}`}><PasswordResetForm /></section>
    </main>
  );
}
