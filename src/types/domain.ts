export const USER_ROLES = ["admin", "cozinha", "caixa", "cliente"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const EVENT_STATES = ["divulgando", "inscricoes_abertas", "em_andamento", "encerrado"] as const;
export type EventState = (typeof EVENT_STATES)[number];

export const ORDER_STATES = ["criado", "aguardando_pagamento", "pago", "em_preparo", "pronto", "entregue", "cancelado"] as const;
export type OrderState = (typeof ORDER_STATES)[number];

export const PAYMENT_METHODS = ["mercado_pago_checkout", "mercado_pago_pos", "pix_presencial", "dinheiro"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface ProductCard {
  id: string;
  name: string;
  category: string;
  priceInCents: number;
  imageUrl?: string;
  stock: number;
  featured?: boolean;
}

export interface EventCard {
  id: string;
  title: string;
  startsAt: string;
  venue: string;
  state: EventState;
  coverUrl?: string;
}
