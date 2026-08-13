import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { requireRole } from "@/lib/auth/require-role";

export default async function OrdersPage() {
  await requireRole(["admin", "cozinha", "caixa", "cliente"]);
  return <main className="protected-page"><p className="eyebrow">MEUS PEDIDOS</p><h1>Em breve, tudo por aqui.</h1><div className="ods-empty"><PackageOpen size={34} /><strong>Você ainda não tem pedidos.</strong><span>Quando a loja estiver ativa, seus pedidos e retiradas aparecerão nesta área.</span></div><Link href="/loja" className="protected-back">Ir para a loja</Link></main>;
}
