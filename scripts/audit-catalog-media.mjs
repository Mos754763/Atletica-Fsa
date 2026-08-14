import { lookup } from "node:dns/promises";
import { Client } from "pg";

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) throw new Error("SUPABASE_DB_URL não foi informado.");

const connectionUrl = new URL(connectionString);
const { address: ipv4Address } = await lookup(connectionUrl.hostname, { family: 4 });
connectionUrl.hostname = ipv4Address;
const client = new Client({ connectionString: connectionUrl.toString(), ssl: { rejectUnauthorized: false } });

async function checkUrl(url) {
  if (!url?.startsWith("https://")) return "url_invalida";
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(8000) });
    return response.ok ? "ok" : `http_${response.status}`;
  } catch {
    return "indisponivel";
  }
}

try {
  await client.connect();
  const { rows } = await client.query(`
    select p.name as product_name, p.is_active, pi.id as image_id, pi.public_url, pi.storage_provider, pi.storage_key, pi.sort_order
      from public.products p
      left join public.product_images pi on pi.product_id = p.id
     order by p.name, pi.sort_order nulls last
  `);
  const report = await Promise.all(rows.map(async (row) => ({
    produto: row.product_name,
    ativo: row.is_active,
    possuiImagem: Boolean(row.image_id),
    provedor: row.storage_provider ?? null,
    ordem: row.sort_order ?? null,
    statusUrl: row.image_id ? await checkUrl(row.public_url) : "sem_imagem",
  })));
  console.table(report);
  const failures = report.filter((item) => !["ok", "sem_imagem"].includes(item.statusUrl));
  console.log(`Resumo: ${report.length} registros de mídia; ${failures.length} URL(s) com falha.`);
  process.exitCode = failures.length ? 2 : 0;
} finally {
  await client.end();
}
