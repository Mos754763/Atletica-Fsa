import Link from "next/link";
import { ChefHat, Clock3 } from "lucide-react";
import { requireRole } from "@/lib/auth/require-role";

export default async function OdsPage() {
  const { profile } = await requireRole(["admin", "cozinha"]);
  return <main className="protected-page ods-page"><p className="eyebrow">ORDER DISPLAY SYSTEM</p><h1>Fila da cozinha.</h1><p>{profile.display_name || profile.email}, esta tela receberá pedidos pagos em tempo real quando o fluxo Mobile Order & Pay estiver ativo.</p><div className="ods-empty"><ChefHat size={34} /><strong>Nenhum pedido em preparo.</strong><span><Clock3 size={16} /> Acompanhe os próximos pedidos aqui.</span></div><Link href="/conta" className="protected-back">Voltar à minha conta</Link></main>;
}
