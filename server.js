const express = require("express");
const crypto = require("crypto");
const fsSync = require("fs");
const fs = require("fs/promises");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

loadLocalEnv();

const app = express();
wrapAsyncRoutes(app);
const PORT = process.env.PORT || 5175;
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DB_PATH = path.join(DATA_DIR, "database.json");
const SEED_DB_PATH = path.join(__dirname, "database.json");
const ADMIN_PIN = normalizeSecret(process.env.ADMIN_PIN);
const ADMIN_SESSION_SECRET = normalizeSecret(process.env.ADMIN_SESSION_SECRET) || ADMIN_PIN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NOTIFICATION_WEBHOOK_URL = process.env.NOTIFICATION_WEBHOOK_URL;
const PRODUCTION_ORIGIN = cleanEnvValue(process.env.PRODUCTION_ORIGIN) || "https://agenda-sn-beauty.onrender.com";
const LOCAL_REDIRECT_TO_PRODUCTION = cleanEnvValue(process.env.LOCAL_REDIRECT_TO_PRODUCTION) === "true";
const BUSINESS_TIME_ZONE = process.env.BUSINESS_TIME_ZONE || "America/Sao_Paulo";
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
const PUBLIC_WRITE_LIMIT = createRateLimit({ windowMs: 15 * 60 * 1000, max: 25 });
const PUBLIC_LOOKUP_LIMIT = createRateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
const REVIEW_WRITE_LIMIT = createRateLimit({ windowMs: 60 * 60 * 1000, max: 6 });
const ADMIN_WRITE_LIMIT = createRateLimit({ windowMs: 15 * 60 * 1000, max: 80 });
const ADMIN_LOGIN_LIMIT = createRateLimit({ windowMs: 15 * 60 * 1000, max: 12 });
const ADMIN_SESSION_COOKIE = "sn_admin_session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const AUDIT_LOG_LIMIT = 200;
let mutationQueue = Promise.resolve();
let localAuditLogs = [];

const weekdayTimes = buildTimes("08:00", "18:00", 30);
const shortDayTimes = buildTimes("08:00", "14:00", 30);
const schedules = {
  regular: { opens: "08:00", closes: "18:00" },
  short: { opens: "08:00", closes: "14:00" },
};
const appointmentStatuses = ["pendente", "confirmado", "cancelado", "concluido"];
const paymentMethods = ["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito"];
const holidayDates = ["2026-01-01", "2026-04-03", "2026-04-21", "2026-05-01", "2026-09-07", "2026-10-12", "2026-11-02", "2026-11-15", "2026-12-25"];
const DEPOSIT_RATE = 0.2;

app.set("trust proxy", 1);
app.use(localDevCors);
app.use(securityHeaders);
app.use(express.json({ limit: "20kb" }));
app.use(redirectLocalToProduction);
app.use(blockProjectFiles);
app.use(
  express.static(__dirname, {
    dotfiles: "deny",
    extensions: ["html"],
    index: "index.html",
    setHeaders: setStaticCacheHeaders,
  }),
);

if (!ADMIN_PIN) {
  console.warn("ADMIN_PIN não configurado. O painel administrativo ficará bloqueado.");
}

if (!ADMIN_SESSION_SECRET) {
  console.warn("ADMIN_SESSION_SECRET não configurado. Configure ADMIN_PIN ou ADMIN_SESSION_SECRET no Render.");
}

function wrapAsyncRoutes(expressApp) {
  for (const method of ["get", "post", "patch", "delete"]) {
    const original = expressApp[method].bind(expressApp);
    expressApp[method] = (pathOrRoute, ...handlers) =>
      original(
        pathOrRoute,
        ...handlers.map((handler) => {
          if (typeof handler !== "function") return handler;
          return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
        }),
      );
  }
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

function redirectLocalToProduction(req, res, next) {
  if (!LOCAL_REDIRECT_TO_PRODUCTION || req.method !== "GET") return next();
  if (!["localhost", "127.0.0.1"].includes(req.hostname)) return next();
  if (req.path.startsWith("/api/health")) return next();

  const target = new URL(req.originalUrl, PRODUCTION_ORIGIN);
  res.redirect(302, target.toString());
}

function cleanEnvValue(value) {
  return typeof value === "string" ? value.trim().replace(/^["']|["']$/g, "") : value;
}

function normalizeSecret(value) {
  if (typeof value !== "string") return value;
  return cleanEnvValue(value)
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

function safeEqualSecret(first, second) {
  const firstHash = crypto.createHash("sha256").update(String(first || "")).digest();
  const secondHash = crypto.createHash("sha256").update(String(second || "")).digest();
  return crypto.timingSafeEqual(firstHash, secondHash);
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

async function withMutationLock(task) {
  const previous = mutationQueue;
  let release;
  mutationQueue = new Promise((resolve) => {
    release = resolve;
  });

  await previous.catch(() => {});
  try {
    return await task();
  } finally {
    release();
  }
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

function fromSupabaseAuditLog(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    actor: row.actor,
    action: row.action,
    appointmentId: row.appointment_id,
    summary: row.summary,
    metadata: row.metadata || {},
  };
}

function toSupabaseAuditLog(entry) {
  return {
    id: entry.id,
    created_at: entry.createdAt,
    actor: entry.actor,
    action: entry.action,
    appointment_id: entry.appointmentId || null,
    summary: entry.summary,
    metadata: entry.metadata || {},
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
    reviews: (reviews || []).map((review) => ({
      ...review,
      name: normalizeLegacyEncoding(review.name),
      comment: normalizeLegacyEncoding(review.comment),
    })),
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

async function persistAppointment(db, appointment) {
  if (!supabase) {
    await writeDb(db);
    return;
  }

  const { error } = await supabase
    .from("appointments")
    .upsert(toSupabaseAppointment(appointment), { onConflict: "id" });
  if (error) throw error;
}

async function removeAppointment(db, id) {
  if (!supabase) {
    await writeDb(db);
    return;
  }

  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
}

async function persistReview(db, review) {
  if (!supabase) {
    await writeDb(db);
    return;
  }

  const { error } = await supabase.from("reviews").insert(review);
  if (error) throw error;
}

async function removeReview(db, id) {
  if (!supabase) {
    await writeDb(db);
    return;
  }

  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw error;
}

async function readAuditLogs(limit = 30) {
  if (supabase) {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn(`Auditoria indisponível no Supabase: ${error.message}`);
      return [];
    }

    return (data || []).map(fromSupabaseAuditLog);
  }

  return localAuditLogs.slice(0, limit);
}

async function isAuditAvailable() {
  if (!supabase) return true;

  const { error } = await supabase.from("audit_logs").select("id").limit(1);
  if (error) {
    console.warn(`Monitor de auditoria pendente no Supabase: ${error.message}`);
    return false;
  }

  return true;
}

async function recordAudit(action, details = {}) {
  const entry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    actor: details.actor || "system",
    action,
    appointmentId: details.appointment?.id || details.appointmentId || null,
    summary: cleanString(details.summary || action, 180),
    metadata: details.metadata || {},
  };

  if (supabase) {
    const { error } = await supabase.from("audit_logs").insert(toSupabaseAuditLog(entry));
    if (error) {
      console.warn(`Falha ao gravar auditoria: ${error.message}`);
    }
    return entry;
  }

  localAuditLogs = [entry, ...localAuditLogs].slice(0, AUDIT_LOG_LIMIT);
  return entry;
}

function todayISO() {
  return isoDateInTimeZone(new Date(), BUSINESS_TIME_ZONE);
}

function isoDateInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
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

function setStaticCacheHeaders(res, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if ([".html", ".js", ".css"].includes(extension)) {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
}

function blockProjectFiles(req, res, next) {
  const pathname = safeDecodePath((req.path || "").split("?")[0]).replace(/\\/g, "/");
  const lowerPathname = pathname.toLowerCase();
  const protectedPaths = [
    "/.env",
    "/.env.example",
    "/database.json",
    "/package-lock.json",
    "/package.json",
    "/render.yaml",
    "/server.js",
    "/supabase-schema.sql",
  ];
  const protectedPrefixes = ["/.git/", "/node_modules/", "/scripts/"];
  const protectedExtensions = [".json", ".lock", ".log", ".md", ".sql", ".yaml", ".yml"];

  const blocked =
    lowerPathname.startsWith("/.") ||
    protectedPaths.includes(lowerPathname) ||
    protectedPrefixes.some((prefix) => lowerPathname.startsWith(prefix)) ||
    protectedExtensions.some((extension) => lowerPathname.endsWith(extension));

  if (blocked) {
    res.status(404).send("Not found");
    return;
  }

  next();
}

function safeDecodePath(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

function localDevCors(req, res, next) {
  if (process.env.NODE_ENV === "production") {
    next();
    return;
  }

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

function isSecureRequest(req) {
  return req.secure || req.get("x-forwarded-proto") === "https" || process.env.NODE_ENV === "production";
}

function setAdminSessionCookie(req, res) {
  const secure = isSecureRequest(req);
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

function clearAdminSessionCookie(req, res) {
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${isSecureRequest(req) ? "; Secure" : ""}`,
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

function scheduleForDate(date) {
  return isShortDay(date) ? schedules.short : schedules.regular;
}

function allowedTimes(date) {
  return isShortDay(date) ? shortDayTimes : weekdayTimes;
}

function allowedStartTimes(date, duration) {
  const schedule = scheduleForDate(date);
  const closeMinutes = toMinutes(schedule.closes);
  return allowedTimes(date).filter((time) => toMinutes(time) + duration <= closeMinutes);
}

function isISODate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
}

function cleanString(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function phoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeLegacyEncoding(value) {
  if (typeof value !== "string") return value;
  const replacements = {
    "\u00C3\u00A1": "á",
    "\u00C3\u00A0": "à",
    "\u00C3\u00A2": "â",
    "\u00C3\u00A3": "ã",
    "\u00C3\u00A9": "é",
    "\u00C3\u00AA": "ê",
    "\u00C3\u00AD": "í",
    "\u00C3\u00B3": "ó",
    "\u00C3\u00B4": "ô",
    "\u00C3\u00B5": "õ",
    "\u00C3\u00BA": "ú",
    "\u00C3\u00A7": "ç",
    "\u00C3\u0081": "Á",
    "\u00C3\u0089": "É",
    "\u00C3\u0093": "Ó",
    "\u00C3\u0087": "Ç",
  };
  return Object.entries(replacements).reduce((text, [broken, fixed]) => text.replaceAll(broken, fixed), value);
}

function normalizeAppointmentStatus(status) {
  return status === "agendado" ? "pendente" : status;
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function depositForService(service) {
  return Number(service?.price || 0) * DEPOSIT_RATE;
}

function publicAppointment(appointment, services) {
  return {
    id: appointment.id,
    serviceId: appointment.serviceId,
    service: services.find((service) => service.id === appointment.serviceId),
    professional: appointment.professional,
    date: appointment.date,
    time: appointment.time,
    status: normalizeAppointmentStatus(appointment.status),
  };
}

function publicClientAppointment(appointment, services) {
  const service = services.find((item) => item.id === Number(appointment.serviceId));
  return {
    id: appointment.id,
    service: service
      ? {
          name: service.name,
          price: service.price,
          duration: service.duration,
        }
      : null,
    depositAmount: depositForService(service),
    remainingAmount: Number(service?.price || 0) - depositForService(service),
    professional: appointment.professional,
    date: appointment.date,
    time: appointment.time,
    status: normalizeAppointmentStatus(appointment.status),
  };
}

function enrichAppointment(appointment, services) {
  return {
    ...appointment,
    status: normalizeAppointmentStatus(appointment.status),
    service: services.find((service) => service.id === appointment.serviceId),
  };
}

function activeAppointmentsFor(db, date, professional, currentId) {
  return db.appointments.filter(
    (appointment) =>
      appointment.id !== currentId &&
      appointment.date === date &&
      appointment.professional === professional &&
      normalizeAppointmentStatus(appointment.status) !== "cancelado",
  );
}

function appointmentWindow(appointment, services) {
  const service = services.find((item) => item.id === Number(appointment.serviceId));
  const start = toMinutes(appointment.time);
  const duration = Number(service?.duration || 30);
  return { start, end: start + duration };
}

function windowsOverlap(first, second) {
  return first.start < second.end && second.start < first.end;
}

function hasAppointmentConflict(db, payload, currentId) {
  const candidate = appointmentWindow(payload, db.services);
  return activeAppointmentsFor(db, payload.date, payload.professional, currentId).some((appointment) =>
    windowsOverlap(candidate, appointmentWindow(appointment, db.services)),
  );
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
      depositAmount: depositForService(service),
      remainingAmount: Number(service?.price || 0) - depositForService(service),
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
      `Sinal de 20%: ${depositForService(service).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
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
      await recordAudit("notification_failed", {
        actor: "system",
        appointment,
        summary: `Falha ao notificar novo agendamento #${appointment.id}.`,
        metadata: { status: response.status },
      });
      return;
    }

    await recordAudit("notification_sent", {
      actor: "system",
      appointment,
      summary: `Notificação enviada para o agendamento #${appointment.id}.`,
    });
  } catch (error) {
    console.warn(`Falha ao enviar notificação de agendamento: ${error.message}`);
    await recordAudit("notification_failed", {
      actor: "system",
      appointment,
      summary: `Falha ao notificar novo agendamento #${appointment.id}.`,
      metadata: { message: cleanString(error.message, 120) },
    });
  }
}

function validateAppointment(payload, db, currentId) {
  const required = ["client", "phone", "serviceId", "professional", "date", "time", "paymentMethod"];
  const missing = required.filter((field) => !payload[field]);

  if (missing.length) {
    return `Campos obrigatórios ausentes: ${missing.join(", ")}.`;
  }

  const service = db.services.find((item) => item.id === Number(payload.serviceId));

  if (!service) {
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

  if (!allowedStartTimes(payload.date, service.duration).includes(payload.time)) {
    return "Horário indisponível para a duração do serviço dentro do expediente.";
  }

  const digits = phoneDigits(payload.phone);
  if (digits.length < 10 || digits.length > 11) {
    return "Informe um telefone válido com DDD.";
  }

  const conflict = hasAppointmentConflict(db, payload, currentId);

  if (conflict) {
    return "Esse horário conflita com outro atendimento dessa profissional.";
  }

  return "";
}

function appointmentValidationStatus(error) {
  return error.includes("conflita") ? 409 : 400;
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Agenda SN Beauty", storage: supabase ? "supabase" : "local-file" });
});

app.get("/api/admin/monitor", requireAdmin, async (req, res) => {
  const db = await readDb();
  const today = todayISO();
  const todayAppointments = db.appointments.filter((appointment) => appointment.date === today);
  const pending = db.appointments.filter((appointment) => normalizeAppointmentStatus(appointment.status) === "pendente");
  const auditAvailable = await isAuditAvailable();

  res.json({
    status: "ok",
    storage: supabase ? "supabase" : "local-file",
    supabaseConfigured: Boolean(supabase),
    notificationsConfigured: Boolean(NOTIFICATION_WEBHOOK_URL),
    today,
    appointments: db.appointments.length,
    todayAppointments: todayAppointments.length,
    pendingAppointments: pending.length,
    reviews: db.reviews.length,
    auditAvailable,
    checkedAt: new Date().toISOString(),
  });
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get(["/termos", "/privacidade"], (req, res) => {
  res.sendFile(path.join(__dirname, "termos.html"));
});

app.get("/api/admin/session", (req, res) => {
  res.json({ authenticated: isValidAdminSession(req) });
});

app.post("/api/admin/login", ADMIN_LOGIN_LIMIT, async (req, res) => {
  if (!ADMIN_PIN) {
    res.status(503).json({ error: "Painel administrativo bloqueado. Configure ADMIN_PIN no Render." });
    return;
  }

  if (!safeEqualSecret(normalizeSecret(cleanString(req.body.password, 120)), ADMIN_PIN)) {
    res.status(401).json({ error: "Senha administrativa inválida." });
    return;
  }

  setAdminSessionCookie(req, res);
  await recordAudit("admin_login", { actor: "admin", summary: "Login administrativo realizado." });
  res.json({ authenticated: true });
});

app.post("/api/admin/logout", async (req, res) => {
  const wasAuthenticated = isValidAdminSession(req);
  clearAdminSessionCookie(req, res);
  if (wasAuthenticated) {
    await recordAudit("admin_logout", { actor: "admin", summary: "Painel administrativo bloqueado." });
  }
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
  const { date, professional, serviceId, excludeId } = req.query;
  if (!date) {
    res.status(400).json({ error: "Informe a data." });
    return;
  }

  if (!isISODate(date)) {
    res.status(400).json({ error: "Data inválida." });
    return;
  }

  const db = await readDb();
  const service = db.services.find((item) => item.id === Number(serviceId));
  if (serviceId && !service) {
    res.status(400).json({ error: "Serviço inválido." });
    return;
  }

  if (professional && !db.professionals.includes(cleanString(professional, 80))) {
    res.status(400).json({ error: "Profissional inválida." });
    return;
  }

  const duration = service?.duration || 30;
  const times = allowedStartTimes(date, duration);
  const currentId = Number(excludeId) || undefined;
  const available = times.filter((time) => {
    if (!professional) return true;
    return !hasAppointmentConflict(db, { serviceId: service?.id || 0, professional, date, time }, currentId);
  });

  res.json({
    times: available,
    shortDay: isShortDay(date),
    closed: available.length === 0,
    opens: scheduleForDate(date).opens,
    closes: scheduleForDate(date).closes,
  });
});

app.get("/api/client/appointments", PUBLIC_LOOKUP_LIMIT, async (req, res) => {
  const phone = cleanString(req.query.phone, 30);
  const date = cleanString(req.query.date, 10);
  const digits = phoneDigits(phone);

  if (digits.length < 10 || digits.length > 11) {
    res.status(400).json({ error: "Informe um telefone válido com DDD." });
    return;
  }

  if (!isISODate(date)) {
    res.status(400).json({ error: "Informe uma data válida." });
    return;
  }

  const db = await readDb();
  const matches = db.appointments
    .filter((appointment) => appointment.date === date && phoneDigits(appointment.phone) === digits)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .map((appointment) => publicClientAppointment(appointment, db.services));

  res.json({ appointments: matches });
});

app.get("/api/appointments", requireAdmin, async (req, res) => {
  const db = await readDb();
  res.json(db.appointments.map((appointment) => enrichAppointment(appointment, db.services)));
});

app.get("/api/admin/audit", requireAdmin, async (req, res) => {
  const logs = await readAuditLogs(30);
  res.json({ logs });
});

app.get("/api/admin/backup", requireAdmin, async (req, res) => {
  const db = await readDb();
  const auditLogs = await readAuditLogs(AUDIT_LOG_LIMIT);
  const backup = {
    generatedAt: new Date().toISOString(),
    storage: supabase ? "supabase" : "local-file",
    services: db.services,
    professionals: db.professionals,
    appointments: db.appointments,
    reviews: db.reviews,
    auditLogs,
  };

  await recordAudit("admin_backup_export", { actor: "admin", summary: "Backup JSON exportado pelo painel administrativo." });
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=agenda-sn-beauty-backup-${todayISO()}.json`);
  res.json(backup);
});

app.get("/api/admin/reviews", requireAdmin, async (req, res) => {
  const db = await readDb();
  const average = db.reviews.length
    ? db.reviews.reduce((sum, review) => sum + Number(review.rating), 0) / db.reviews.length
    : 0;
  res.json({ reviews: db.reviews, average });
});

app.post("/api/appointments", PUBLIC_WRITE_LIMIT, async (req, res) => {
  await withMutationLock(async () => {
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
      status: "pendente",
    };
    const error = validateAppointment(payload, db);

    if (error) {
      res.status(appointmentValidationStatus(error)).json({ error });
      return;
    }

    const appointment = { id: nextId(db.appointments), ...payload };
    db.appointments.unshift(appointment);
    await persistAppointment(db, appointment);
    await recordAudit("appointment_created", {
      actor: "client",
      appointment,
      summary: `Novo pedido para ${payload.date} às ${payload.time}.`,
      metadata: { serviceId: payload.serviceId, status: payload.status },
    });
    await notifyAppointmentCreated(appointment, db.services);
    res.status(201).json(publicAppointment(appointment, db.services));
  });
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
  await persistAppointment(db, appointment);
  await recordAudit("appointment_cancelled", {
    actor: "admin",
    appointment,
    summary: `Agendamento #${appointment.id} desmarcado.`,
  });
  res.json(enrichAppointment(appointment, db.services));
});

app.patch("/api/appointments/:id/confirm", requireAdmin, ADMIN_WRITE_LIMIT, async (req, res) => {
  const db = await readDb();
  const id = Number(req.params.id);
  const appointment = db.appointments.find((item) => item.id === id);

  if (!appointment) {
    res.status(404).json({ error: "Agendamento não encontrado." });
    return;
  }

  appointment.status = "confirmado";
  await persistAppointment(db, appointment);
  await recordAudit("appointment_confirmed", {
    actor: "admin",
    appointment,
    summary: `Agendamento #${appointment.id} confirmado.`,
  });
  res.json(enrichAppointment(appointment, db.services));
});

app.delete("/api/appointments/:id", requireAdmin, ADMIN_WRITE_LIMIT, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Exclusão definitiva indisponível em produção. Cancele o agendamento." });
    return;
  }

  const db = await readDb();
  const id = Number(req.params.id);
  const index = db.appointments.findIndex((item) => item.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Agendamento não encontrado." });
    return;
  }

  db.appointments.splice(index, 1);
  await removeAppointment(db, id);
  await recordAudit("appointment_deleted", {
    actor: "admin",
    appointmentId: id,
    summary: `Agendamento #${id} removido no ambiente local.`,
  });
  res.status(204).end();
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
  await persistAppointment(db, appointment);
  await recordAudit("appointment_completed", {
    actor: "admin",
    appointment,
    summary: `Agendamento #${appointment.id} concluído.`,
  });
  res.json(enrichAppointment(appointment, db.services));
});

app.patch("/api/appointments/:id/reschedule", requireAdmin, ADMIN_WRITE_LIMIT, async (req, res) => {
  await withMutationLock(async () => {
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
      status: "pendente",
    };
    const error = validateAppointment(payload, db, id);

    if (error) {
      res.status(appointmentValidationStatus(error)).json({ error });
      return;
    }

    Object.assign(appointment, payload);
    await persistAppointment(db, appointment);
    await recordAudit("appointment_rescheduled", {
      actor: "admin",
      appointment,
      summary: `Agendamento #${appointment.id} remarcado para ${appointment.date} às ${appointment.time}.`,
      metadata: { status: appointment.status },
    });
    res.json(enrichAppointment(appointment, db.services));
  });
});

app.get("/api/admin/export", requireAdmin, async (req, res) => {
  const db = await readDb();
  const rows = db.appointments.map((appointment) => enrichAppointment(appointment, db.services));
  const header = ["id", "cliente", "telefone", "servico", "profissional", "data", "horario", "pagamento", "valor", "sinal_20", "restante", "duracao_min", "status", "observacoes"];
  const csv = [
    header.join(","),
    ...rows.map((appointment) =>
      [
        appointment.id,
        appointment.client,
        appointment.phone,
        appointment.service?.name || "",
        appointment.professional,
        appointment.date,
        appointment.time,
        appointment.paymentMethod,
        appointment.service?.price || 0,
        depositForService(appointment.service),
        Number(appointment.service?.price || 0) - depositForService(appointment.service),
        appointment.service?.duration || "",
        appointment.status,
        appointment.notes || "",
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\n");

  await recordAudit("admin_csv_export", { actor: "admin", summary: "CSV da agenda exportado." });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=agenda-sn-beauty.csv");
  res.send(`\uFEFF${csv}`);
});

app.get("/api/reviews", async (req, res) => {
  const db = await readDb();
  const average = db.reviews.length
    ? db.reviews.reduce((sum, review) => sum + Number(review.rating), 0) / db.reviews.length
    : 0;
  res.json({ reviews: db.reviews, average });
});

app.post("/api/reviews", REVIEW_WRITE_LIMIT, async (req, res) => {
  const db = await readDb();
  const rating = Number(req.body.rating);
  const name = cleanString(req.body.name, 60);
  const comment = cleanString(req.body.comment, 280);

  if (cleanString(req.body.website, 120)) {
    res.status(400).json({ error: "Avaliação não aceita." });
    return;
  }

  if (!name || !comment || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Informe nome, comentário e nota entre 1 e 5." });
    return;
  }

  const repeated = db.reviews.some(
    (review) =>
      cleanString(review.name, 60).toLowerCase() === name.toLowerCase() &&
      cleanString(review.comment, 280).toLowerCase() === comment.toLowerCase(),
  );

  if (repeated) {
    res.status(409).json({ error: "Essa avaliação já foi registrada." });
    return;
  }

  const review = {
    id: nextId(db.reviews),
    name,
    rating,
    comment,
  };

  db.reviews.unshift(review);
  await persistReview(db, review);
  await recordAudit("review_created", {
    actor: "client",
    summary: `Nova avaliação pública com nota ${rating}.`,
    metadata: { rating },
  });
  res.status(201).json(review);
});

app.delete("/api/admin/reviews/:id", requireAdmin, ADMIN_WRITE_LIMIT, async (req, res) => {
  const db = await readDb();
  const id = Number(req.params.id);
  const index = db.reviews.findIndex((review) => Number(review.id) === id);

  if (index === -1) {
    res.status(404).json({ error: "Avaliação não encontrada." });
    return;
  }

  const [review] = db.reviews.splice(index, 1);
  await removeReview(db, id);
  await recordAudit("review_deleted", {
    actor: "admin",
    summary: `Avaliação #${id} removida do site público.`,
    metadata: { rating: review.rating },
  });
  res.status(204).end();
});

app.use((err, req, res, next) => {
  console.error(`Erro em ${req.method} ${req.path}:`, err);
  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(500).json({ error: "Erro interno. Tente novamente em alguns instantes." });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Agenda SN Beauty rodando em http://localhost:${PORT}`);
});

