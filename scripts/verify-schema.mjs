import { lookup } from "node:dns/promises";
import { Client } from "pg";

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) throw new Error("SUPABASE_DB_URL não foi informado.");

const connectionUrl = new URL(connectionString);
const { address: ipv4Address } = await lookup(connectionUrl.hostname, { family: 4 });
connectionUrl.hostname = ipv4Address;

const expectedTables = [
  "profiles", "categories", "products", "product_images", "inventory_movements",
  "events", "event_products", "event_registrations", "orders", "order_items",
  "payments", "order_status_history", "email_deliveries", "automation_jobs",
];

const client = new Client({ connectionString: connectionUrl.toString(), ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  const tables = await client.query(
    "select tablename from pg_tables where schemaname = 'public' and tablename = any($1::text[]) order by tablename",
    [expectedTables],
  );
  const policies = await client.query(
    "select count(*)::int as total from pg_policies where schemaname = 'public' and tablename = any($1::text[])",
    [expectedTables],
  );
  const rls = await client.query(
    "select count(*)::int as total from pg_tables t join pg_class c on c.relname = t.tablename join pg_namespace n on n.oid = c.relnamespace where t.schemaname = 'public' and n.nspname = 'public' and t.tablename = any($1::text[]) and c.relrowsecurity",
    [expectedTables],
  );

  if (tables.rowCount !== expectedTables.length) {
    throw new Error(`Tabelas encontradas: ${tables.rowCount}/${expectedTables.length}.`);
  }
  if (Number(policies.rows[0].total) < 20) {
    throw new Error("Número insuficiente de políticas RLS aplicadas.");
  }
  if (Number(rls.rows[0].total) !== expectedTables.length) {
    throw new Error("RLS não está habilitado em todas as tabelas esperadas.");
  }

  console.log(`Esquema validado: ${tables.rowCount} tabelas, ${policies.rows[0].total} políticas e RLS em ${rls.rows[0].total} tabelas.`);
} finally {
  await client.end();
}
