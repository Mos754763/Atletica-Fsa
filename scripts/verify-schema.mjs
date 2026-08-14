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
  "payments", "order_status_history", "email_deliveries", "automation_jobs", "sectors", "sector_memberships", "permission_grants",
  "product_variants", "sales_batches", "store_pickup_settings", "inventory_reservations", "email_outbox", "email_templates", "automation_rules", "automation_runs",
  "custom_tables", "custom_table_fields", "custom_table_records", "custom_table_views", "audit_logs", "event_ticket_lots", "event_tickets",
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
  const settlement = await client.query(
    "select exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'inventory_committed_at') as has_column, exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'settle_paid_order_inventory') as has_function",
  );
  const profileRoleGrant = await client.query(
    "select has_column_privilege('authenticated', 'public.profiles', 'role', 'update') as can_update_role, has_column_privilege('authenticated', 'public.profiles', 'display_name', 'update') as can_update_display_name",
  );
  const governance = await client.query(
    "select exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_president') as has_president, (select count(*) from public.sectors where deleted_at is null) as sector_count",
  );
  const builder = await client.query(
    "select exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'can_table_action') as has_access_function, exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'audit_custom_builder') as has_audit_function",
  );
  const ticketing = await client.query(
    "select exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'create_event_registration_ticket') as has_issue_function, exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'settle_paid_event_ticket') as has_settlement_function, exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'check_in_event_ticket') as has_checkin_function",
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
  if (!settlement.rows[0].has_column || !settlement.rows[0].has_function) {
    throw new Error("Liquidação transacional de estoque não está presente no banco.");
  }
  if (profileRoleGrant.rows[0].can_update_role || !profileRoleGrant.rows[0].can_update_display_name) {
    throw new Error("Privilégios de atualização de perfis não protegem a elevação de papel.");
  }
  if (!governance.rows[0].has_president || Number(governance.rows[0].sector_count) < 5) {
    throw new Error("Fundação de governança por presidente e setores não está completa.");
  }
  if (!builder.rows[0].has_access_function || !builder.rows[0].has_audit_function) {
    throw new Error("Construtor de Tabelas e sua auditoria não estão completos.");
  }
  if (!ticketing.rows[0].has_issue_function || !ticketing.rows[0].has_settlement_function || !ticketing.rows[0].has_checkin_function) {
    throw new Error("Emissão, liquidação ou check-in atômico de ingressos não está presente no banco.");
  }

  console.log(`Esquema validado: ${tables.rowCount} tabelas, ${policies.rows[0].total} políticas, RLS em ${rls.rows[0].total} tabelas, liquidação, proteção de papéis, governança, Construtor e ingressos disponíveis.`);
} finally {
  await client.end();
}
