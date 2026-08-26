import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;
const source = "/home/ubuntu/webdev-static-assets/atletica-fsa-rabbit-mascot-transparent.png";
const storageKey = "institutional/fsa-rabbit-mascot-transparent.png";

if (!supabaseUrl || !serviceKey) {
  throw new Error("As credenciais de Storage de Production não estão disponíveis.");
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const bytes = await readFile(source);
const { error } = await supabase.storage
  .from("catalog-assets")
  .upload(storageKey, bytes, {
    contentType: "image/png",
    cacheControl: "31536000",
    upsert: true,
  });

if (error) throw new Error(`Não foi possível publicar o mascote transparente: ${error.message}`);

const { data } = supabase.storage.from("catalog-assets").getPublicUrl(storageKey);
console.log(data.publicUrl);
