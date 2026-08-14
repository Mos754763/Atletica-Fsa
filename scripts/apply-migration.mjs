import { readFile } from "node:fs/promises";
import { lookup } from "node:dns/promises";
import { resolve } from "node:path";
import { Client } from "pg";

const connectionString = process.env.SUPABASE_DB_URL;
const migrationPath = process.argv[2];

if (!connectionString) {
  throw new Error("SUPABASE_DB_URL não foi informado.");
}
if (!migrationPath) {
  throw new Error("Informe o caminho da migração SQL.");
}

const migration = await readFile(resolve(migrationPath), "utf8");
const connectionUrl = new URL(connectionString);
const { address: ipv4Address } = await lookup(connectionUrl.hostname, { family: 4 });
connectionUrl.hostname = ipv4Address;
const client = new Client({ connectionString: connectionUrl.toString(), ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(migration);
  console.log(`Migração aplicada: ${migrationPath}`);
} finally {
  await client.end();
}
