import Link from "next/link";
import { PackageCheck, PackageOpen, QrCode } from "lucide-react";
import { requireRole } from "@/lib/auth/require-role";
import { createServiceClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import { PickupQrCode } from "@/components/orders/PickupQrCode";
import { ResumePaymentButton } from "@/components/orders/ResumePaymentButton";
import { canResumeCheckout } from "@/lib/payments/checkout-resume";

export const dynamic = "force-dynamic";

type CustomerOrder = {
  id: string;
  order_number: number;
  status: "aguardando_pagamento" | "pago" | "em_preparo" | "pronto" | "entregue" | "cancelado";
  fulfillment: "retirada" | "consumo_local";
  total_cents: number;
  created_at: string;
  payment_expires_at: string | null;
  mercado_pago_preference_id: string | null;
  pickup_qr_token: string | null;
  pickup_qr_expires_at: string | null;
  pickup_location: string | null;
  pickup_instructions: string | null;
  pickup_deadline_at: string | null;
  picked_up_at: string | null;
  order_items: Array<{ product_name: string; variant_name: string | null; quantity: number; line_total_cents: number }>;
};

const statusLabel: Record<CustomerOrder["status"], string> = { aguardando_pagamento: "Aguardando pagamento", pago: "Pagamento confirmado", em_preparo: "Em preparo", pronto: "Pronto para retirada", entregue: "Retirado", cancelado: "Cancelado" };

export default async function OrdersPage() {
  const { profile } = await requireRole(["admin", "backoffice", "caixa", "cliente"]);
  const supabase = createServiceClient();
  const { data } = await supabase.from("orders").select("id,order_number,status,fulfillment,total_cents,created_at,payment_expires_at,mercado_pago_preference_id,pickup_qr_token,pickup_qr_expires_at,pickup_location,pickup_instructions,pickup_deadline_at,picked_up_at,order_items(product_name,variant_name,quantity,line_total_cents)").eq("customer_id", profile.id).order("created_at", { ascending: false });
  const orders = (data ?? []) as CustomerOrder[];

  return <main className="protected-page"><p className="eyebrow">MEUS PEDIDOS</p><h1>Acompanhe suas compras.</h1><p>Use o código ou QR Code somente quando o pedido estiver pronto. A conferência é feita pelo Backoffice na retirada.</p>
    {orders.length === 0 ? (
      <div className="ods-empty"><PackageOpen size={34} /><strong>Você ainda não tem pedidos.</strong><span>Quando a loja estiver ativa, seus pedidos e retiradas aparecerão nesta área.</span></div>
    ) : (
      <section className="customer-orders">{orders.map((order) => {
        const pickupToken = order.pickup_qr_token;
        const pickupExpiry = order.pickup_qr_expires_at;
        const canShowPickupQr = order.status === "pronto" && order.fulfillment === "retirada" && pickupToken !== null && pickupExpiry !== null && new Date(pickupExpiry) > new Date();
        const canResumePayment = canResumeCheckout({ status: order.status, paymentExpiresAt: order.payment_expires_at, preferenceId: order.mercado_pago_preference_id });
        return <article key={order.id} className={`customer-order customer-order--${order.status}`}>
          <header><div><span>Pedido #{order.order_number}</span><h2>{statusLabel[order.status]}</h2></div><time>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.created_at))}</time></header>
          <ul>{order.order_items.map((item, index) => <li key={`${item.product_name}-${index}`}><span>{item.quantity}× {item.product_name}{item.variant_name ? ` — ${item.variant_name}` : ""}</span><strong>{formatBRL(item.line_total_cents)}</strong></li>)}</ul>
          <footer>
            <div><span>{order.fulfillment === "retirada" ? "Retirada" : "Consumo no local"}</span><strong>{formatBRL(order.total_cents)}</strong>{order.status === "aguardando_pagamento" && order.payment_expires_at && <small>Reserva até {new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date(order.payment_expires_at))}.</small>}</div>
            {canResumePayment && <ResumePaymentButton orderId={order.id} />}
            {canShowPickupQr && <div className="customer-order__pickup"><div><QrCode size={18} /><span>QR Code de retirada</span><b>Apresente este QR no balcão</b><small>Válido até {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(pickupExpiry))}</small>{order.pickup_location && <small>{order.pickup_location}</small>}{order.pickup_instructions && <small>{order.pickup_instructions}</small>}</div><PickupQrCode token={pickupToken} orderNumber={order.order_number} /></div>}
            {order.status === "pronto" && order.fulfillment === "retirada" && !canShowPickupQr && <span className="customer-order__complete">QR expirado. Solicite ao Backoffice a renovação e atualize esta página.</span>}
            {order.status === "entregue" && <span className="customer-order__complete"><PackageCheck size={17} /> Retirada confirmada</span>}
          </footer>
        </article>;
      })}</section>
    )}
    <Link href="/loja" className="protected-back">Ir para a loja</Link>
  </main>;
}
