const slugSeparator = /[^a-z0-9]+/g;

/**
 * Produz um identificador técnico previsível a partir do rótulo informado pelo operador.
 * O identificador não é uma decisão de negócio: ele existe apenas para a chave interna.
 */
export function toBuilderSlug(value: string, fallback = "campo") {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(slugSeparator, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return normalized || fallback;
}
