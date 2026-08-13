import { readFile } from "node:fs/promises";
import { Client } from "pg";

const configPath = process.argv[2];
if (!configPath) throw new Error("Informe o caminho de uma configuração temporária de conexão.");

const { connectionString } = JSON.parse(await readFile(configPath, "utf8"));
if (!connectionString) throw new Error("Configuração de conexão inválida.");

const migrationPath = new URL("../supabase/migrations/20260813203000_catalog_assets_bucket.sql", import.meta.url);
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(await readFile(migrationPath, "utf8"));
  console.log("Bucket catalog-assets configurado com sucesso.");
} finally {
  await client.end();
}
