import type { OrderState } from "@/types/domain";

const flow: Record<OrderState, OrderState[]> = {
  criado: ["aguardando_pagamento", "cancelado"],
  aguardando_pagamento: ["pago", "cancelado"],
  pago: ["em_preparo", "cancelado"],
  em_preparo: ["pronto", "cancelado"],
  pronto: ["entregue", "cancelado"],
  entregue: [],
  cancelado: [],
};

export function canMoveOrderStatus(current: OrderState, next: OrderState) {
  return flow[current].includes(next);
}

export const ORDER_STATUS_LABEL: Record<OrderState, string> = {
  criado: "Pedido criado", aguardando_pagamento: "Aguardando pagamento", pago: "Pagamento confirmado", em_preparo: "Em preparo", pronto: "Pronto para retirada", entregue: "Entregue", cancelado: "Cancelado",
};
