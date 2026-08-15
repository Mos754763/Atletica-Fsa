import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <section className="not-found-card" aria-labelledby="not-found-title">
        <span className="not-found-kicker">ATLETICA FSA · 404</span>
        <h1 id="not-found-title">Esta página não está na escala.</h1>
        <p>O endereço pode ter mudado ou não está disponível. Volte para uma área segura da plataforma.</p>
        <div className="not-found-actions">
          <Link className="button-primary" href="/">Ir para a página inicial</Link>
          <Link className="button-secondary" href="/loja">Abrir a loja</Link>
        </div>
      </section>
    </main>
  );
}
