import { readFile } from "node:fs/promises";
import { lookup } from "node:dns/promises";
import { Client } from "pg";

const migrationFile = process.argv[2];
if (!migrationFile || !/^[a-z0-9_.-]+\.sql$/i.test(migrationFile)) {
  throw new Error("Informe um arquivo SQL simples da pasta supabase/migrations.");
}

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) throw new Error("SUPABASE_DB_URL não foi informado.");

const migrationPath = new URL(`../supabase/migrations/${migrationFile}`, import.meta.url);
const migration = await readFile(migrationPath, "utf8");
const connectionUrl = new URL(connectionString);
const { address: ipv4Address } = await lookup(connectionUrl.hostname, { family: 4 });
connectionUrl.hostname = ipv4Address;

const client = new Client({ connectionString: connectionUrl.toString(), ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  await client.query(migration);
  console.log(`Migração ${migrationFile} aplicada com sucesso.`);
} finally {
  await client.end();
}
