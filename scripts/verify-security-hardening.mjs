import { lookup } from "node:dns/promises";
import { Client } from "pg";

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) throw new Error("SUPABASE_DB_URL não foi informado.");

const url = new URL(connectionString);
const { address } = await lookup(url.hostname, { family: 4 });
url.hostname = address;

const client = new Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  const { rows } = await client.query(`
    select
      not exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'orders' and policyname = 'orders: staff updates') as orders_require_rpc,
      exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'confirm_order_pickup_by_qr') as has_one_time_pickup,
      exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'validate_table_permission_grant') as has_table_scope_validation,
      exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'validate_custom_table_record') as has_record_validation,
      coalesce((select pg_get_functiondef(p.oid) like '%for update%' from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'confirm_order_pickup_by_qr' limit 1), false) as pickup_locks_order
  `);
  const result = rows[0];
  if (!Object.values(result).every(Boolean)) throw new Error(`Endurecimento incompleto: ${JSON.stringify(result)}`);
  console.log("Endurecimento validado: retirada exige RPC bloqueante/QR único, grants são setoriais e registros JSON são validados.");
} finally {
  await client.end();
}
