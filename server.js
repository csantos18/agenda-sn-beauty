const express = require("express");
const crypto = require("crypto");
const fsSync = require("fs");
const fs = require("fs/promises");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

loadLocalEnv();

const app = express();
const PORT = process.env.PORT || 5175;
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DB_PATH = path.join(DATA_DIR, "database.json");
const SEED_DB_PATH = path.join(__dirname, "database.json");
const ADMIN_PIN = cleanEnvValue(process.env.ADMIN_PIN);
const ADMIN_SESSION_SECRET = cleanEnvValue(process.env.ADMIN_SESSION_SECRET) || ADMIN_PIN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NOTIFICATION_WEBHOOK_URL = process.env.NOTIFICATION_WEBHOOK_URL;
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
const PUBLIC_WRITE_LIMIT = createRateLimit({ windowMs: 15 * 60 * 1000, max: 40 });
const ADMIN_WRITE_LIMIT = createRateLimit({ windowMs: 15 * 60 * 1000, max: 80 });
const ADMIN_LOGIN_LIMIT = createRateLimit({ windowMs: 15 * 60 * 1000, max: 12 });
const ADMIN_SESSION_COOKIE = "sn_admin_session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const weekdayTimes = buildTimes("08:00", "18:00", 30);
const shortDayTimes = buildTimes("08:00", "14:00", 30);
const paymentMethods = ["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito"];
const holidayDates = ["2026-01-01", "2026-04-03", "2026-04-21", "2026-05-01", "2026-09-07", "2026-10-12", "2026-11-02", "2026-11-15", "2026-12-25"];

app.set("trust proxy", 1);
app.use(localDevCors);
app.use(securityHeaders);
app.use(express.json({ limit: "20kb" }));
app.use(express.static(__dirname));

if (!ADMIN_PIN) {
  console.warn("ADMIN_PIN não configurado. O painel administrativo ficará bloqueado.");
}

if (!ADMIN_SESSION_SECRET) {
  console.warn("ADMIN_SESSION_SECRET não configurado. Configure ADMIN_PIN ou ADMIN_SESSION_SECRET no Render.");
}

function loadLocalEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fsSync.existsSync(envPath)) return;

  const lines = fsSync.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
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
  return typeof value === "string" ? value.trim() : value;
}

async function readDb() {
  if (supabase) {
    return readSupabaseDb();
  }

  await ensureDb();
  const raw = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

async function writeDb(db) {
  if (supabase) {
    await writeSupabaseDb(db);
    return;
  }

  await ensureDb();
  await fs.writeFile(DB_PATH, `${JSON.stringify(db, null, 2)}\n`, "utf-8");
}

async function ensureDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.copyFile(SEED_DB_PATH, DB_PATH);
  }
}

function nextId(items) {
  return items.length ? Math.max(...items.map((item) => Number(item.id))) + 1 : 1;
}

async function readSeedDb() {
  const raw = await fs.readFile(SEED_DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function fromSupabaseAppointment(row) {
  return {
    id: row.id,
    client: row.client,
    phone: row.phone,
    serviceId: row.service_id,
    professional: row.professional,
    date: row.date,
    time: row.time,
    paymentMethod: row.payment_method,
    notes: row.notes || "",
    status: row.status,
  };
}

function toSupabaseAppointment(appointment) {
  return {
    id: appointment.id,
    client: appointment.client,
    phone: appointment.phone,
    service_id: appointment.serviceId,
    professional: appointment.professional,
    date: appointment.date,
    time: appointment.time,
    payment_method: appointment.paymentMethod,
    notes: appointment.notes || "",
    status: appointment.status,
  };
}

async function readSupabaseDb() {
  const seed = await readSeedDb();
  const [{ data: appointments, error: appointmentsError }, { data: reviews, error: reviewsError }] =
    await Promise.all([
      supabase.from("appointments").select("*").order("date", { ascending: true }).order("time", { ascending: true }),
      supabase.from("reviews").select("*").order("id", { ascending: false }),
    ]);

  if (appointmentsError) throw appointmentsError;
  if (reviewsError) throw reviewsError;

  return {
    ...seed,
    appointments: (appointments || []).map(fromSupabaseAppointment),
    reviews: reviews || [],
  };
}

async function writeSupabaseDb(db) {
  const { error: deleteAppointmentsError } = await supabase
    .from("appointments")
    .delete()
    .not("id", "is", null);
  if (deleteAppointmentsError) throw deleteAppointmentsError;

  const { error: deleteReviewsError } = await supabase.from("reviews").delete().not("id", "is", null);
  if (deleteReviewsError) throw deleteReviewsError;

  if (db.appointments.length) {
    const { error } = await supabase.from("appointments").insert(db.appointments.map(toSupabaseAppointment));
    if (error) throw error;
  }

  if (db.reviews.length) {
    const { error } = await supabase.from("reviews").insert(db.reviews);
    if (error) throw error;
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function createRateLimit({ windowMs, max }) {
  const attempts = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${req.method}:${req.path}`;
    const current = attempts.get(key);

    if (!current || current.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    current.count += 1;

    if (current.count > max) {
      res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
      return;
    }

    next();
  };
}

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' https://images.unsplash.com data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  );
  next();
}

function localDevCors(req, res, next) {
  const origin = req.get("origin");
  const isLocalDevOrigin =
    origin === "null" || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || "");

  if (isLocalDevOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-pin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!ADMIN_PIN) {
    res.status(503).json({ error: "Painel administrativo bloqueado. Configure ADMIN_PIN no Render." });
    return;
  }

  if (!isValidAdminSession(req)) {
    res.status(401).json({ error: "Acesso administrativo não autorizado." });
    return;
  }

  next();
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.get("cookie") || "")
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const separator = item.indexOf("=");
        return separator === -1
          ? [decodeURIComponent(item), ""]
          : [decodeURIComponent(item.slice(0, separator)), decodeURIComponent(item.slice(separator + 1))];
      }),
  );
}

function signSession(payload) {
  return crypto.createHmac("sha256", ADMIN_SESSION_SECRET).update(payload).digest("base64url");
}

function createAdminSession() {
  const expiresAt = Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
  const nonce = crypto.randomBytes(16).toString("base64url");
  const payload = `${expiresAt}.${nonce}`;
  return `${payload}.${signSession(payload)}`;
}

function isValidAdminSession(req) {
  if (!ADMIN_SESSION_SECRET) return false;

  const token = parseCookies(req)[ADMIN_SESSION_COOKIE];
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [expiresAt, nonce, signature] = parts;
  const payload = `${expiresAt}.${nonce}`;
  const expected = signSession(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false;
  }

  return Number(expiresAt) > Date.now();
}

function setAdminSessionCookie(res) {
  const secure = process.env.NODE_ENV === "production";
  const cookie = [
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(createAdminSession())}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${ADMIN_SESSION_MAX_AGE_SECONDS}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
  res.setHeader("Set-Cookie", cookie);
}

function clearAdminSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
}

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function buildTimes(start, end, stepMinutes) {
  const times = [];
  for (let current = toMinutes(start); current <= toMinutes(end); current += stepMinutes) {
    const hours = String(Math.floor(current / 60)).padStart(2, "0");
    const minutes = String(current % 60).padStart(2, "0");
    times.push(`${hours}:${minutes}`);
  }
  return times;
}

function isShortDay(date) {
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.getDay() === 0 || holidayDates.includes(date);
}

function allowedTimes(date) {
  return isShortDay(date) ? shortDayTimes : weekdayTimes;
}

function isISODate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
}

function cleanString(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function publicAppointment(appointment, services) {
  return {
    id: appointment.id,
    serviceId: appointment.serviceId,
    service: services.find((service) => service.id === appointment.serviceId),
    professional: appointment.professional,
    date: appointment.date,
    time: appointment.time,
    status: appointment.status,
  };
}

function enrichAppointment(appointment, services) {
  return {
    ...appointment,
    service: services.find((service) => service.id === appointment.serviceId),
  };
}

function appointmentNotificationPayload(appointment, services) {
  const service = services.find((item) => item.id === appointment.serviceId);

  return {
    type: "appointment_created",
    title: "Novo agendamento recebido",
    appointment: {
      id: appointment.id,
      client: appointment.client,
      phone: appointment.phone,
      service: service?.name || "Serviço não encontrado",
      professional: appointment.professional,
      date: appointment.date,
      time: appointment.time,
      paymentMethod: appointment.paymentMethod,
      notes: appointment.notes || "",
      status: appointment.status,
    },
    message: [
      "Novo agendamento recebido no Agenda SN Beauty.",
      `Cliente: ${appointment.client}`,
      `Telefone: ${appointment.phone}`,
      `Serviço: ${service?.name || "Serviço não encontrado"}`,
      `Data: ${appointment.date}`,
      `Horário: ${appointment.time}`,
      `Pagamento: ${appointment.paymentMethod}`,
      appointment.notes ? `Observações: ${appointment.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

async function notifyAppointmentCreated(appointment, services) {
  if (!NOTIFICATION_WEBHOOK_URL) return;

  try {
    const response = await fetch(NOTIFICATION_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(appointmentNotificationPayload(appointment, services)),
    });

    if (!response.ok) {
      console.warn(`Falha ao enviar notificação de agendamento: ${response.status}`);
    }
  } catch (error) {
    console.warn(`Falha ao enviar notificação de agendamento: ${error.message}`);
  }
}

function validateAppointment(payload, db, currentId) {
  const required = ["client", "phone", "serviceId", "professional", "date", "time", "paymentMethod"];
  const missing = required.filter((field) => !payload[field]);

  if (missing.length) {
    return `Campos obrigatórios ausentes: ${missing.join(", ")}.`;
  }

  if (!db.services.some((service) => service.id === Number(payload.serviceId))) {
    return "Serviço inválido.";
  }

  if (!db.professionals.includes(payload.professional)) {
    return "Profissional inválida.";
  }

  if (!paymentMethods.includes(payload.paymentMethod)) {
    return "Forma de pagamento inválida.";
  }

  if (!isISODate(payload.date)) {
    return "Data inválida.";
  }

  if (payload.date < todayISO()) {
    return "Não é permitido agendar em datas antigas.";
  }

  if (!allowedTimes(payload.date).includes(payload.time)) {
    return "Horário fora do funcionamento do salão.";
  }

  const conflict = db.appointments.some(
    (appointment) =>
      appointment.id !== currentId &&
      appointment.date === payload.date &&
      appointment.time === payload.time &&
      appointment.professional === payload.professional &&
      appointment.status !== "cancelado",
  );

  if (conflict) {
    return "Esse horário já foi agendado para essa profissional.";
  }

  return "";
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Agenda SN Beauty" });
});

app.get("/api/admin/session", (req, res) => {
  res.json({ authenticated: isValidAdminSession(req) });
});

app.post("/api/admin/login", ADMIN_LOGIN_LIMIT, (req, res) => {
  if (!ADMIN_PIN) {
    res.status(503).json({ error: "Painel administrativo bloqueado. Configure ADMIN_PIN no Render." });
    return;
  }

  if (cleanString(req.body.password, 120) !== ADMIN_PIN) {
    res.status(401).json({ error: "Senha administrativa inválida." });
    return;
  }

  setAdminSessionCookie(res);
  res.json({ authenticated: true });
});

app.post("/api/admin/logout", (req, res) => {
  clearAdminSessionCookie(res);
  res.json({ authenticated: false });
});

app.get("/api/services", async (req, res) => {
  const db = await readDb();
  res.json(db.services);
});

app.get("/api/professionals", async (req, res) => {
  const db = await readDb();
  res.json(db.professionals);
});

app.get("/api/payment-methods", (req, res) => {
  res.json(paymentMethods);
});

app.get("/api/availability", async (req, res) => {
  const { date, professional } = req.query;
  if (!date) {
    res.status(400).json({ error: "Informe a data." });
    return;
  }

  if (!isISODate(date)) {
    res.status(400).json({ error: "Data inválida." });
    return;
  }

  const db = await readDb();
  const times = allowedTimes(date);
  const blocked = professional
    ? db.appointments
        .filter(
          (appointment) =>
            appointment.date === date &&
            appointment.professional === professional &&
            appointment.status !== "cancelado",
        )
        .map((appointment) => appointment.time)
    : [];
  const available = times.filter((time) => !blocked.includes(time));

  res.json({ times: available, shortDay: isShortDay(date), closed: available.length === 0 });
});

app.get("/api/appointments", requireAdmin, async (req, res) => {
  const db = await readDb();
  res.json(db.appointments.map((appointment) => enrichAppointment(appointment, db.services)));
});

app.post("/api/appointments", PUBLIC_WRITE_LIMIT, async (req, res) => {
  const db = await readDb();
  const payload = {
    ...req.body,
    client: cleanString(req.body.client, 80),
    phone: cleanString(req.body.phone, 30),
    serviceId: Number(req.body.serviceId),
    professional: cleanString(req.body.professional, 80),
    date: cleanString(req.body.date, 10),
    time: cleanString(req.body.time, 5),
    paymentMethod: req.body.paymentMethod,
    notes: cleanString(req.body.notes, 250),
    status: "agendado",
  };
  const error = validateAppointment(payload, db);

  if (error) {
    res.status(400).json({ error });
    return;
  }

  const appointment = { id: nextId(db.appointments), ...payload };
  db.appointments.unshift(appointment);
  await writeDb(db);
  await notifyAppointmentCreated(appointment, db.services);
  res.status(201).json(publicAppointment(appointment, db.services));
});

app.patch("/api/appointments/:id/cancel", requireAdmin, ADMIN_WRITE_LIMIT, async (req, res) => {
  const db = await readDb();
  const id = Number(req.params.id);
  const appointment = db.appointments.find((item) => item.id === id);

  if (!appointment) {
    res.status(404).json({ error: "Agendamento não encontrado." });
    return;
  }

  appointment.status = "cancelado";
  await writeDb(db);
  res.json(enrichAppointment(appointment, db.services));
});

app.patch("/api/appointments/:id/complete", requireAdmin, ADMIN_WRITE_LIMIT, async (req, res) => {
  const db = await readDb();
  const id = Number(req.params.id);
  const appointment = db.appointments.find((item) => item.id === id);

  if (!appointment) {
    res.status(404).json({ error: "Agendamento não encontrado." });
    return;
  }

  appointment.status = "concluido";
  await writeDb(db);
  res.json(enrichAppointment(appointment, db.services));
});

app.patch("/api/appointments/:id/reschedule", requireAdmin, ADMIN_WRITE_LIMIT, async (req, res) => {
  const db = await readDb();
  const id = Number(req.params.id);
  const appointment = db.appointments.find((item) => item.id === id);

  if (!appointment) {
    res.status(404).json({ error: "Agendamento não encontrado." });
    return;
  }

  const payload = {
    ...appointment,
    serviceId: Number(req.body.serviceId || appointment.serviceId),
    professional: cleanString(req.body.professional || appointment.professional, 80),
    date: cleanString(req.body.date || appointment.date, 10),
    time: cleanString(req.body.time || appointment.time, 5),
    client: cleanString(req.body.client || appointment.client, 80),
    phone: cleanString(req.body.phone || appointment.phone, 30),
    paymentMethod: req.body.paymentMethod || appointment.paymentMethod,
    notes: cleanString(req.body.notes, 250),
    status: "agendado",
  };
  const error = validateAppointment(payload, db, id);

  if (error) {
    res.status(400).json({ error });
    return;
  }

  Object.assign(appointment, payload);
  await writeDb(db);
  res.json(enrichAppointment(appointment, db.services));
});

app.get("/api/reviews", async (req, res) => {
  const db = await readDb();
  const average = db.reviews.length
    ? db.reviews.reduce((sum, review) => sum + Number(review.rating), 0) / db.reviews.length
    : 0;
  res.json({ reviews: db.reviews, average });
});

app.post("/api/reviews", PUBLIC_WRITE_LIMIT, async (req, res) => {
  const db = await readDb();
  const rating = Number(req.body.rating);
  const name = cleanString(req.body.name, 60);
  const comment = cleanString(req.body.comment, 280);

  if (!name || !comment || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Informe nome, comentário e nota entre 1 e 5." });
    return;
  }

  const review = {
    id: nextId(db.reviews),
    name,
    rating,
    comment,
  };

  db.reviews.unshift(review);
  await writeDb(db);
  res.status(201).json(review);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Agenda SN Beauty rodando em http://localhost:${PORT}`);
});
