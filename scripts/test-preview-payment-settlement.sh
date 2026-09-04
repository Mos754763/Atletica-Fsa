#!/usr/bin/env bash
set -euo pipefail

# Exercises a known Mercado Pago sandbox payment notification against a Vercel
# Preview deployment. It does not create payments, orders, or provider settings.
#
# Usage:
# MERCADO_PAGO_WEBHOOK_SECRET=... VERCEL_PROTECTION_BYPASS_SECRET=... \
#   ./scripts/test-preview-payment-settlement.sh https://preview.vercel.app 123456789

export LC_ALL=C

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

if [[ "$#" -ne 2 ]]; then
  fail 'usage: test-preview-payment-settlement.sh <https-preview-base-url> <numeric-payment-id>'
fi

preview_url="$1"
payment_id="$2"

# Restrict this harness to a Vercel Preview origin. The optional trailing slash
# is normalized below; paths, ports, credentials, queries, and fragments are not
# accepted so the webhook target cannot be redirected elsewhere.
if [[ ! "$preview_url" =~ ^https://([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+vercel\.app/?$ ]]; then
  fail 'invalid preview URL: expected an HTTPS .vercel.app origin without a path, query, or fragment'
fi

if [[ ! "$payment_id" =~ ^[0-9]+$ ]]; then
  fail 'invalid payment ID: expected ASCII digits only'
fi

if [[ -z "${MERCADO_PAGO_WEBHOOK_SECRET:-}" ]]; then
  fail 'missing MERCADO_PAGO_WEBHOOK_SECRET environment variable'
fi

if [[ -z "${VERCEL_PROTECTION_BYPASS_SECRET:-}" ]]; then
  fail 'missing VERCEL_PROTECTION_BYPASS_SECRET environment variable'
fi

webhook_secret="$MERCADO_PAGO_WEBHOOK_SECRET"
vercel_bypass_secret="$VERCEL_PROTECTION_BYPASS_SECRET"
endpoint="${preview_url%/}/api/payments/mercado-pago/webhook"
attestation_endpoint="${endpoint}?attest=hml-settlement"
timestamp="$(date +%s)"
request_id="payment-settlement-$(openssl rand -hex 16)"
manifest="id:${payment_id};request-id:${request_id};ts:${timestamp};"
signature="$(printf '%s' "$manifest" | openssl dgst -sha256 -hmac "$webhook_secret" -hex | awk '{print $NF}')"
payload="$(printf '{\"type\":\"payment\",\"data\":{\"id\":%s}}' "$payment_id")"

umask 077
response_file="$(mktemp "${TMPDIR:-/tmp}/test-preview-payment-settlement.XXXXXX")"
attestation_file="$(mktemp "${TMPDIR:-/tmp}/test-preview-payment-attestation.XXXXXX")"
trap 'rm -f -- "$response_file" "$attestation_file"' EXIT
trap 'exit 1' HUP INT TERM
chmod 600 "$response_file" "$attestation_file"

# Fail closed before the first financial POST. Vercel Preview alone is not a
# sufficient boundary: the deployment must also attest that it is connected to
# ATLETICA's dedicated HML Supabase project.
if ! attestation_status="$(curl --silent \
  --connect-timeout 10 \
  --max-time 30 \
  --output "$attestation_file" \
  --write-out '%{http_code}' \
  --header "x-vercel-protection-bypass: ${vercel_bypass_secret}" \
  "$attestation_endpoint")"; then
  fail "preview binding could not be verified (HTTP ${attestation_status:-000})"
fi

if [[ "$attestation_status" != '200' ]] \
  || ! grep -Eq '"vercelEnvironment"[[:space:]]*:[[:space:]]*"preview"' "$attestation_file" \
  || ! grep -Eq '"supabaseProjectRef"[[:space:]]*:[[:space:]]*"gfnbdjdqumewspvfxicl"' "$attestation_file"; then
  fail "preview binding rejected: expected Vercel Preview connected to ATLETICA HML (HTTP ${attestation_status})"
fi

post_notification() {
  curl --silent \
    --connect-timeout 10 \
    --max-time 30 \
    --output "$response_file" \
    --write-out '%{http_code}' \
    --request POST "$endpoint" \
    --header 'Content-Type: application/json' \
    --header "x-vercel-protection-bypass: ${vercel_bypass_secret}" \
    --header "x-request-id: ${request_id}" \
    --header "x-signature: ts=${timestamp},v1=${signature}" \
    --data "$payload"
}

if ! first_status="$(post_notification)"; then
  fail "payment ${payment_id}: first request could not be completed (HTTP ${first_status:-000})"
fi

if [[ "$first_status" != '200' ]] || ! grep -Eq '"status"[[:space:]]*:[[:space:]]*"pago"' "$response_file"; then
  fail "payment ${payment_id}: first request did not settle as pago (HTTP ${first_status})"
fi

if ! second_status="$(post_notification)"; then
  fail "payment ${payment_id}: replay request could not be completed (HTTP ${second_status:-000})"
fi

if [[ "$second_status" != '200' ]] || ! grep -Eq '"duplicate"[[:space:]]*:[[:space:]]*true' "$response_file"; then
  fail "payment ${payment_id}: replay was not persistently deduplicated (HTTP ${second_status})"
fi

printf 'payment %s: settled=pago; replay=duplicate.\n' "$payment_id"
