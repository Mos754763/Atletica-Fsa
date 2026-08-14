export type BuilderField = { slug: string; fieldType: "text" | "number" | "date" | "single_select" | "multi_select" | "person" | "checkbox"; required: boolean };

export function normalizeBuilderRecord(fields: readonly BuilderField[], values: Record<string, string[]>) {
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = values[field.slug] ?? [];
    const first = raw[0]?.trim() ?? "";
    if (field.required && !first) throw new Error(`Preencha o campo obrigatório: ${field.slug}.`);
    if (!first && field.fieldType !== "checkbox") continue;
    if (field.fieldType === "number") data[field.slug] = Number(first);
    else if (field.fieldType === "checkbox") data[field.slug] = first === "on";
    else if (field.fieldType === "multi_select") data[field.slug] = raw.filter(Boolean);
    else data[field.slug] = first;
  }
  return data;
}
