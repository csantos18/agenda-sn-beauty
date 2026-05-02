const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

loadLocalEnv();

const SUPABASE_URL = cleanEnvValue(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para verificar a auditoria.");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.from("audit_logs").select("id").limit(1);

  if (error) {
    throw new Error(`Auditoria pendente no Supabase: ${error.message}. Execute o supabase-schema.sql atualizado.`);
  }

  console.log("Auditoria do Supabase confirmada: tabela audit_logs acessível.");
}

function loadLocalEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function cleanEnvValue(value) {
  return typeof value === "string" ? value.trim().replace(/^["']|["']$/g, "") : value;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
