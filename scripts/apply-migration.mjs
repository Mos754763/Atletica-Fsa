import { readFile } from "node:fs/promises";
import { lookup } from "node:dns/promises";
import { Client } from "pg";

const connectionString = process.env.SUPABASE_DB_URL;
const migrationPath = new URL("../supabase/migrations/20260813190000_atletica_fsa_core.sql", import.meta.url);

if (!connectionString) {
  throw new Error("SUPABASE_DB_URL não foi informado.");
}

const migration = await readFile(migrationPath, "utf8");
const connectionUrl = new URL(connectionString);
const { address: ipv4Address } = await lookup(connectionUrl.hostname, { family: 4 });
connectionUrl.hostname = ipv4Address;
const client = new Client({ connectionString: connectionUrl.toString(), ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(migration);
  console.log("Migração core da ATLETICA FSA aplicada com sucesso.");
} finally {
  await client.end();
}
