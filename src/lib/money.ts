export function brlInputToCents(value: unknown) {
  const raw = String(value ?? "").trim().replace(/^R\$\s*/i, "");
  if (!raw) return Number.NaN;

  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : Number.NaN;
}

export function centsToBrlInput(cents: number | null | undefined) {
  return ((cents ?? 0) / 100).toFixed(2).replace(".", ",");
}
