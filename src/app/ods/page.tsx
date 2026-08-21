import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { OdsBoard } from "@/components/ods/OdsBoard";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function OdsPage() {
  const { profile } = await requireRole(["admin", "backoffice", "caixa"]);
  const catalog = await getCatalog();
  return <main className="protected-page ods-page"><p className="eyebrow">ORDER DISPLAY SYSTEM</p><h1>Fila do backoffice.</h1><p>{profile.display_name || profile.email}, acompanhe os pedidos pagos, registre vendas presenciais e atualize o preparo sem trocar de tela.</p><OdsBoard catalog={catalog} /><Link href="/conta" className="protected-back">Voltar à minha conta</Link></main>;
}
