#!/usr/bin/env bash
set -euo pipefail

# Exercita cenários não liquidáveis do webhook no Preview, sem criar pedido,
# pagamento ou movimento de estoque. Nenhum segredo é persistido neste arquivo.
# O caso payment com assinatura inválida usa somente o HTTP 401 como evidência
# de bloqueio, sem consulta a banco ou ação de provedor.
# Uso:
# MERCADO_PAGO_WEBHOOK_SECRET='...' VERCEL_PROTECTION_BYPASS_SECRET='...' \
#   ./scripts/test-preview-webhook-matrix.sh https://preview.example.vercel.app

preview_url="${1:?Informe a URL do deployment Preview.}"
secret="${MERCADO_PAGO_WEBHOOK_SECRET:?Defina MERCADO_PAGO_WEBHOOK_SECRET somente no ambiente de execução.}"
vercel_bypass_secret="${VERCEL_PROTECTION_BYPASS_SECRET:?Defina VERCEL_PROTECTION_BYPASS_SECRET somente no ambiente de execução.}"
timestamp="$(date +%s)"
merchant_event_id="homolog-matrix-merchant-${timestamp}"
merchant_request_id="homolog-matrix-${timestamp}"
manifest="id:${merchant_event_id};request-id:${merchant_request_id};ts:${timestamp};"
signature="$(printf '%s' "$manifest" | openssl dgst -sha256 -hmac "$secret" -hex | sed 's/^.* //')"
endpoint="${preview_url%/}/api/payments/mercado-pago/webhook"

request() {
  local output status
  output="$(mktemp)"
  status="$(curl --silent --show-error --output "$output" --write-out '%{http_code}' "$@")"
  printf '%s\n%s\n' "$status" "$(cat "$output")"
  rm -f "$output"
}

assert_response() {
  local name expected_status expected_fragment actual status body
  name="$1"
  expected_status="$2"
  expected_fragment="$3"
  actual="$4"
  status="$(printf '%s' "$actual" | sed -n '1p')"
  body="$(printf '%s' "$actual" | sed -n '2p')"

  if [[ "$status" != "$expected_status" || "$body" != *"$expected_fragment"* ]]; then
    printf 'Falha em %s: HTTP %s; resposta: %s\n' "$name" "$status" "$body" >&2
    exit 1
  fi
  printf '%s: HTTP %s; %s\n' "$name" "$status" "$expected_fragment"
}

invalid_signature="$(request \
  --request POST "$endpoint" \
  --header 'Content-Type: application/json' \
  --header "x-vercel-protection-bypass: ${vercel_bypass_secret}" \
  --header "x-request-id: invalid-${timestamp}" \
  --header "x-signature: ts=${timestamp},v1=invalid" \
  --data "{\"type\":\"payment\",\"data\":{\"id\":\"invalid-${timestamp}\"}}")"
assert_response 'assinatura payment inválida (sem ação)' '401' 'Assinatura inválida ou expirada.' "$invalid_signature"

unsupported_topic="$(request \
  --request POST "$endpoint" \
  --header 'Content-Type: application/json' \
  --header "x-vercel-protection-bypass: ${vercel_bypass_secret}" \
  --data "{\"type\":\"unsupported_test_topic\",\"data\":{\"id\":\"unsupported-${timestamp}\"}}")"
assert_response 'tópico não suportado' '200' 'unsupported_topic' "$unsupported_topic"

point_topic="$(request \
  --request POST "$endpoint" \
  --header 'Content-Type: application/json' \
  --header "x-vercel-protection-bypass: ${vercel_bypass_secret}" \
  --data "{\"type\":\"point_integration\",\"data\":{\"id\":\"point-${timestamp}\"}}")"
assert_response 'tópico Point não suportado' '200' 'unsupported_topic' "$point_topic"

shipment_topic="$(request \
  --request POST "$endpoint" \
  --header 'Content-Type: application/json' \
  --header "x-vercel-protection-bypass: ${vercel_bypass_secret}" \
  --data "{\"type\":\"shipment\",\"data\":{\"id\":\"shipment-${timestamp}\"}}")"
assert_response 'alias Envios não suportado' '200' 'unsupported_topic' "$shipment_topic"

merchant_first="$(request \
  --request POST "$endpoint" \
  --header 'Content-Type: application/json' \
  --header "x-vercel-protection-bypass: ${vercel_bypass_secret}" \
  --header "x-request-id: ${merchant_request_id}" \
  --header "x-signature: ts=${timestamp},v1=${signature}" \
  --data "{\"type\":\"merchant_order\",\"data\":{\"id\":\"${merchant_event_id}\"}}")"
assert_response 'primeiro merchant_order válido' '200' 'merchant_order_not_enabled' "$merchant_first"

merchant_duplicate="$(request \
  --request POST "$endpoint" \
  --header 'Content-Type: application/json' \
  --header "x-vercel-protection-bypass: ${vercel_bypass_secret}" \
  --header "x-request-id: ${merchant_request_id}" \
  --header "x-signature: ts=${timestamp},v1=${signature}" \
  --data "{\"type\":\"merchant_order\",\"data\":{\"id\":\"${merchant_event_id}\"}}")"
assert_response 'merchant_order duplicado' '200' '"duplicate":true' "$merchant_duplicate"

printf 'Matriz concluída. merchant_event_id=%s\n' "$merchant_event_id"
