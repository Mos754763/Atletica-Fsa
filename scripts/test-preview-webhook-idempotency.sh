#!/usr/bin/env bash
set -euo pipefail

# Valida somente a idempotência da auditoria autenticada de merchant_order no
# Preview; não valida a idempotência de liquidação financeira de payment.
# Uso:
# MERCADO_PAGO_WEBHOOK_SECRET='...' VERCEL_PROTECTION_BYPASS_SECRET='...' \
#   ./scripts/test-preview-webhook-idempotency.sh https://preview.example.vercel.app

preview_url="${1:?Informe a URL do deployment Preview.}"
secret="${MERCADO_PAGO_WEBHOOK_SECRET:?Defina MERCADO_PAGO_WEBHOOK_SECRET somente no ambiente de execução.}"
vercel_bypass_secret="${VERCEL_PROTECTION_BYPASS_SECRET:?Defina VERCEL_PROTECTION_BYPASS_SECRET somente no ambiente de execução.}"
event_id="homolog-merchant-order-$(date +%s)"
timestamp="$(date +%s)"
request_id="homolog-idempotency-${timestamp}"
manifest="id:${event_id};request-id:${request_id};ts:${timestamp};"
signature="$(printf '%s' "$manifest" | openssl dgst -sha256 -hmac "$secret" -hex | sed 's/^.* //')"
payload="{\"type\":\"merchant_order\",\"data\":{\"id\":\"${event_id}\"}}"
response_one="$(mktemp)"
response_two="$(mktemp)"
trap 'rm -f "$response_one" "$response_two"' EXIT

status_one="$(curl --silent --show-error --output "$response_one" --write-out '%{http_code}' \
  --request POST "${preview_url%/}/api/payments/mercado-pago/webhook" \
  --header 'Content-Type: application/json' \
  --header "x-vercel-protection-bypass: ${vercel_bypass_secret}" \
  --header "x-request-id: ${request_id}" \
  --header "x-signature: ts=${timestamp},v1=${signature}" \
  --data "$payload")"

status_two="$(curl --silent --show-error --output "$response_two" --write-out '%{http_code}' \
  --request POST "${preview_url%/}/api/payments/mercado-pago/webhook" \
  --header 'Content-Type: application/json' \
  --header "x-vercel-protection-bypass: ${vercel_bypass_secret}" \
  --header "x-request-id: ${request_id}" \
  --header "x-signature: ts=${timestamp},v1=${signature}" \
  --data "$payload")"

first_body="$(cat "$response_one")"
second_body="$(cat "$response_two")"

if [[ "$status_one" != "200" || "$first_body" != *'merchant_order_not_enabled'* ]]; then
  printf 'Falha no primeiro merchant_order de auditoria: HTTP %s; resposta: %s\n' "$status_one" "$first_body" >&2
  exit 1
fi

if [[ "$status_two" != "200" || "$second_body" != *'"duplicate":true'* ]]; then
  printf 'Falha na repetição do merchant_order de auditoria: HTTP %s; resposta: %s\n' "$status_two" "$second_body" >&2
  exit 1
fi

printf 'Idempotência de auditoria merchant_order confirmada no Preview (não valida liquidação financeira de payment). Evento: %s; primeira resposta: ignorado; repetição: duplicate=true.\n' "$event_id"
