import { FsaWordmark } from "@/components/brand/FsaWordmark";
import { PasswordResetForm } from "@/components/auth/PasswordResetForm";
import Link from "next/link";
import styles from "./reset-password.module.css";

export default function PasswordResetPage() {
  return (
    <main className={`auth-page auth-page--experience auth-page--reset ${styles.page}`}>
      <Link href="/" className="auth-logo"><FsaWordmark /></Link>
      <section className={`auth-page__intro ${styles.intro}`}>
        <p className="eyebrow">ACESSO PROTEGIDO</p>
        <h2>Volte para<br /><span>a torcida.</span></h2>
        <p>Atualize sua senha com segurança e retome seus pedidos, eventos e benefícios.</p>
      </section>
      <section className={`auth-page__panel ${styles.panel}`}><PasswordResetForm /></section>
    </main>
  );
}
