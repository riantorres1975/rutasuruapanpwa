import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const name = process.argv.slice(2).join(" ").trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const secretKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

if (!name || name.length < 2 || name.length > 120) {
  throw new Error('Indica un nombre: pnpm api-key:create -- "Nombre de la integración"');
}
if (!url || !secretKey) {
  throw new Error("Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY.");
}

const apiKey = `urugo_sk_${randomBytes(32).toString("base64url")}`;
const keyHash = createHash("sha256").update(apiKey).digest("hex");
const keyPrefix = apiKey.slice(0, 20);
const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});

const { data, error } = await supabase
  .from("community_api_clients")
  .insert({ key_hash: keyHash, key_prefix: keyPrefix, name })
  .select("id,name,hourly_limit")
  .single();

if (error || !data) {
  throw new Error(`No se pudo crear la credencial: ${error?.message ?? "sin respuesta"}`);
}

console.log(`Integración: ${data.name}`);
console.log(`ID: ${data.id}`);
console.log(`Cuota: ${data.hourly_limit} reportes por hora`);
console.log(`API key (se muestra una sola vez): ${apiKey}`);
