"use client";

import { ChefHat, Clock3, PackageCheck, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { ORDER_STATUS_LABEL } from "@/lib/orders/workflow";
import { getBrowserClient } from "@/lib/supabase/client";
import type { OrderState } from "@/types/domain";

type OdsOrder = { id: string; order_number: number; status: OrderState; fulfillment: string; customer_name: string | null; notes: string | null; created_at: string; order_items: Array<{ product_name: string; quantity: number }> };
type ManualCatalogItem = { key: string; productId: string; variantId: string | null; label: string; priceCents: number; stockQuantity: number };
type ManualCartItem = ManualCatalogItem & { quantity: number };

const nextStatus: Partial<Record<OrderState, OrderState>> = { pago: "em_preparo", em_preparo: "pronto", pronto: "entregue" };
const nextLabel: Partial<Record<OrderState, string>> = { pago: "Assumir preparo", em_preparo: "Marcar pronto", pronto: "Entregar pedido" };
const formatBrl = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function OdsBoard({ catalog }: { catalog: CatalogProduct[] }) {
  const [orders, setOrders] = useState<OdsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pickupTokens, setPickupTokens] = useState<Record<string, string>>({});
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualCart, setManualCart] = useState<ManualCartItem[]>([]);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState("");
  const [manualCustomerName, setManualCustomerName] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualPaymentMethod, setManualPaymentMethod] = useState<"pix_presencial" | "dinheiro">("pix_presencial");
  const [manualFulfillment, setManualFulfillment] = useState<"retirada" | "consumo_local">("retirada");
  const [creatingManualOrder, setCreatingManualOrder] = useState(false);

  const catalogItems = useMemo<ManualCatalogItem[]>(() => catalog.reduce<ManualCatalogItem[]>((items, product) => {
    if (product.hasVariants) {
      product.variants.forEach((variant) => items.push({ key: `${product.id}:${variant.id}`, productId: product.id, variantId: variant.id, label: `${product.name} — ${variant.name}`, priceCents: variant.priceCents ?? product.priceCents, stockQuantity: variant.stockQuantity }));
    } else {
      items.push({ key: `${product.id}:base`, productId: product.id, variantId: null, label: product.name, priceCents: product.priceCents, stockQuantity: product.stockQuantity });
    }
    return items;
  }, []).filter((item) => item.stockQuantity > 0), [catalog]);
  const manualTotalCents = useMemo(() => manualCart.reduce((total, item) => total + item.priceCents * item.quantity, 0), [manualCart]);

  const getToken = useCallback(async () => {
    const supabase = await getBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) throw new Error("Sua sessão expirou. Entre novamente.");
    return data.session.access_token;
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/ods/orders", { headers: { Authorization: `Bearer ${await getToken()}` } });
      const body = await response.json() as { orders?: OdsOrder[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar a fila.");
      setOrders(body.orders ?? []);
    } catch (fetchError) { setError(fetchError instanceof Error ? fetchError.message : "Erro ao carregar a fila."); }
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => {
    let active = true; let cleanup = () => {};
    void (async () => {
      await loadOrders();
      try {
        const supabase = await getBrowserClient(); if (!active) return;
        const channel = supabase.channel("fsa-ods-orders").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => { void loadOrders(); }).subscribe();
        cleanup = () => { void supabase.removeChannel(channel); };
      } catch (subscriptionError) { if (active) setError(subscriptionError instanceof Error ? subscriptionError.message : "Não foi possível conectar atualizações em tempo real."); }
    })();
    return () => { active = false; cleanup(); };
  }, [loadOrders]);

  async function advanceOrder(order: OdsOrder) {
    const status = nextStatus[order.status]; if (!status) return;
    setUpdatingId(order.id);
    try {
      const response = await fetch("/api/ods/orders", { method: "PATCH", headers: { Authorization: `Bearer ${await getToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id, status, pickupToken: pickupTokens[order.id] }) });
      const body = await response.json() as { error?: string }; if (!response.ok) throw new Error(body.error ?? "Não foi possível atualizar o pedido.");
      await loadOrders();
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "Erro ao atualizar o pedido."); }
    finally { setUpdatingId(null); }
  }

  function addManualItem() {
    const selected = catalogItems.find((item) => item.key === selectedCatalogItem); if (!selected) return;
    setManualCart((current) => {
      const existing = current.find((item) => item.key === selected.key);
      return existing ? current.map((item) => item.key === selected.key ? { ...item, quantity: Math.min(item.quantity + 1, item.stockQuantity) } : item) : [...current, { ...selected, quantity: 1 }];
    });
    setSelectedCatalogItem("");
  }

  async function createManualOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!manualCart.length) { setError("Inclua ao menos um item no pedido manual."); return; }
    setCreatingManualOrder(true); setError(null);
    try {
      const response = await fetch("/api/ods/orders", { method: "POST", headers: { Authorization: `Bearer ${await getToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ fulfillment: manualFulfillment, paymentMethod: manualPaymentMethod, customerName: manualCustomerName, notes: manualNotes, items: manualCart.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })) }) });
      const body = await response.json() as { error?: string }; if (!response.ok) throw new Error(body.error ?? "Não foi possível registrar o pedido manual.");
      setManualCart([]); setManualCustomerName(""); setManualNotes(""); setShowManualForm(false); await loadOrders();
    } catch (createError) { setError(createError instanceof Error ? createError.message : "Erro ao registrar o pedido manual."); }
    finally { setCreatingManualOrder(false); }
  }

  return <section className="ods-board">
    <header><div><p>FILA EM TEMPO REAL</p><h2>Pedidos ativos</h2></div><div className="ods-board__actions"><button className="ods-new-order" type="button" onClick={() => setShowManualForm((current) => !current)} aria-expanded={showManualForm}><Plus size={16} /> Novo pedido</button><button type="button" onClick={() => void loadOrders()} disabled={loading}><RefreshCw size={16} className={loading ? "is-spinning" : ""} /> Atualizar</button></div></header>
    {error && <p className="ods-error" role="alert">{error}</p>}
    {showManualForm && <form className="ods-manual-order" onSubmit={createManualOrder}><div className="ods-manual-order__heading"><div><p>NOVO PEDIDO PRESENCIAL</p><h3>Registrar venda já recebida.</h3></div><button className="ods-manual-order__close" type="button" onClick={() => setShowManualForm(false)} aria-label="Fechar novo pedido"><X size={18} /></button></div><div className="ods-manual-order__fields"><label>Cliente (opcional)<input value={manualCustomerName} onChange={(event) => setManualCustomerName(event.target.value)} maxLength={120} placeholder="Nome para identificação" /></label><label>Atendimento<select value={manualFulfillment} onChange={(event) => setManualFulfillment(event.target.value as "retirada" | "consumo_local")}><option value="retirada">Retirada</option><option value="consumo_local">Consumo no local</option></select></label><label>Forma de pagamento<select value={manualPaymentMethod} onChange={(event) => setManualPaymentMethod(event.target.value as "pix_presencial" | "dinheiro")}><option value="pix_presencial">PIX presencial</option><option value="dinheiro">Dinheiro</option></select></label></div><div className="ods-manual-order__add"><select value={selectedCatalogItem} onChange={(event) => setSelectedCatalogItem(event.target.value)} aria-label="Selecione um item do catálogo"><option value="">Selecione produto ou variação disponível</option>{catalogItems.map((item) => <option key={item.key} value={item.key}>{item.label} · {formatBrl(item.priceCents)} · {item.stockQuantity} em estoque</option>)}</select><button type="button" onClick={addManualItem} disabled={!selectedCatalogItem}>Adicionar</button></div><div className="ods-manual-order__cart">{manualCart.length === 0 && <p>Nenhum item selecionado. Escolha um produto do catálogo acima.</p>}{manualCart.map((item) => <div className="ods-manual-order__item" key={item.key}><span><strong>{item.label}</strong><small>{formatBrl(item.priceCents)} cada</small></span><label>Qtd.<input type="number" min="1" max={item.stockQuantity} value={item.quantity} onChange={(event) => setManualCart((current) => current.map((cartItem) => cartItem.key === item.key ? { ...cartItem, quantity: Math.max(1, Math.min(Number(event.target.value) || 1, cartItem.stockQuantity)) } : cartItem))} /></label><b>{formatBrl(item.priceCents * item.quantity)}</b><button type="button" onClick={() => setManualCart((current) => current.filter((cartItem) => cartItem.key !== item.key))} aria-label={`Remover ${item.label}`}><Trash2 size={16} /></button></div>)}</div><label className="ods-manual-order__notes">Observações (opcional)<textarea value={manualNotes} onChange={(event) => setManualNotes(event.target.value)} maxLength={500} rows={2} placeholder="Ex.: retirar no intervalo" /></label><footer><span>Total confirmado <strong>{formatBrl(manualTotalCents)}</strong></span><button type="submit" disabled={creatingManualOrder || manualCart.length === 0}>{creatingManualOrder ? "Registrando..." : "Confirmar pedido pago"}</button></footer></form>}
    {loading && <div className="ods-skeleton" aria-label="Carregando pedidos" role="status">{Array.from({ length: 3 }).map((_, index) => <div className="ods-skeleton__card" key={index}><span /><strong /><i /><i /><footer /></div>)}</div>}
    {!loading && orders.length === 0 && <div className="ods-empty"><ChefHat size={34} /><strong>Nenhum pedido em preparo.</strong><span><Clock3 size={16} /> Novos pedidos pagos aparecerão aqui automaticamente.</span></div>}
    {!loading && <div className="ods-board__grid">{orders.map((order) => <article className={`ods-order ods-order--${order.status}`} key={order.id}><header><div><span>#{order.order_number}</span><strong>{ORDER_STATUS_LABEL[order.status]}</strong></div><time>{new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(order.created_at))}</time></header><h3>{order.customer_name || "Pedido FSA"}</h3><ul>{order.order_items.map((item, index) => <li key={`${item.product_name}-${index}`}><b>{item.quantity}×</b> {item.product_name}</li>)}</ul><footer><span>{order.fulfillment === "consumo_local" ? "Consumo no local" : "Retirada"}</span>{order.status === "pronto" && order.fulfillment === "retirada" && <label className="ods-pickup-code">QR Code de retirada<input value={pickupTokens[order.id] ?? ""} onChange={(event) => setPickupTokens((current) => ({ ...current, [order.id]: event.target.value }))} inputMode="text" autoComplete="off" maxLength={64} placeholder="Escaneie o QR do cliente" /></label>}{nextStatus[order.status] && <button type="button" disabled={updatingId === order.id} onClick={() => void advanceOrder(order)}>{updatingId === order.id ? "Atualizando..." : <><PackageCheck size={16} /> {nextLabel[order.status]}</>}</button>}</footer></article>)}</div>}
  </section>;
}
