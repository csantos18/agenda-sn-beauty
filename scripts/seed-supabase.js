const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

loadLocalEnv();

const SUPABASE_URL = cleanEnvValue(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
const DB_PATH = path.join(__dirname, "..", "database.json");

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de importar os dados.");
  }

  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const appointments = (db.appointments || []).map((appointment) => ({
    id: appointment.id,
    client: appointment.client,
    phone: appointment.phone,
    service_id: appointment.serviceId,
    professional: appointment.professional,
    date: appointment.date,
    time: appointment.time,
    payment_method: appointment.paymentMethod,
    notes: appointment.notes || "",
    status: appointment.status || "pendente",
  }));

  const reviews = db.reviews || [];

  if (appointments.length) {
    const { error } = await supabase.from("appointments").upsert(appointments, { onConflict: "id" });
    if (error) throw error;
  }

  if (reviews.length) {
    const { error } = await supabase.from("reviews").upsert(reviews, { onConflict: "id" });
    if (error) throw error;
  }

  console.log(`Importado para Supabase: ${appointments.length} agendamentos, ${reviews.length} avaliações.`);
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
