import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { OdsBoard } from "@/components/ods/OdsBoard";

export default async function OdsPage() {
  const { profile } = await requireRole(["admin", "cozinha"]);
  return <main className="protected-page ods-page"><p className="eyebrow">ORDER DISPLAY SYSTEM</p><h1>Fila da cozinha.</h1><p>{profile.display_name || profile.email}, acompanhe os pedidos pagos e atualize o preparo sem trocar de tela.</p><OdsBoard /><Link href="/conta" className="protected-back">Voltar à minha conta</Link></main>;
}
