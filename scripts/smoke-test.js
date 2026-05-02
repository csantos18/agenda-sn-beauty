const fs = require("fs");
const path = require("path");

loadLocalEnv();

const BASE_URL = (process.env.BASE_URL || "http://localhost:5175").replace(/\/$/, "");
const ADMIN_PIN = cleanEnvValue(process.env.ADMIN_PIN);
const TEST_DATE = process.env.SMOKE_TEST_DATE || tomorrowISO();
const TEST_TIME = process.env.SMOKE_TEST_TIME || "08:00";
const OVERLAP_TIME = process.env.SMOKE_TEST_OVERLAP_TIME || "08:30";
const PROFESSIONAL = process.env.SMOKE_TEST_PROFESSIONAL || "Jacinta Santos";

const results = [];

async function main() {
  await checkGet("home", "/");
  await checkGet("health", "/api/health");
  const services = await checkJson("services", "/api/services");
  await checkJson("professionals", "/api/professionals");
  await checkJson("payment methods", "/api/payment-methods");
  await checkJson("reviews", "/api/reviews");
  await expectAdminRouteProtected();

  const service = Array.isArray(services) ? services[0] : null;
  assert("service fixture available", Boolean(service?.id), "first service must exist");
  await expectBusinessHours(service.id);

  const appointment = await createAppointment(service.id);
  await expectDuplicateBlocked(service.id);
  await expectOverlapBlocked(service.id);
  await expectTimeUnavailable(service.id);
  await expectClientLookupFindsAppointment(appointment.id);

  if (ADMIN_PIN) {
    const cookie = await loginAdmin();
    await expectAdminSeesAppointment(cookie, appointment.id);
    await confirmAppointment(cookie, appointment.id);
    await exportCsv(cookie);
    await cancelAppointment(cookie, appointment.id);
    await cleanupLocalAppointment(cookie, appointment.id);
  } else {
    record("admin flow skipped", true, "ADMIN_PIN not configured for smoke test");
  }

  printResults();

  if (results.some((item) => !item.ok)) {
    process.exitCode = 1;
  }
}

async function checkGet(name, route) {
  const response = await request(route);
  record(name, response.ok, `status=${response.status}`);
  return response;
}

async function checkJson(name, route) {
  const response = await request(route);
  const data = await response.json();
  record(name, response.ok, `status=${response.status}`);
  return data;
}

async function expectAdminRouteProtected() {
  const response = await request("/api/appointments");
  record("admin route blocks public access", response.status === 401, `status=${response.status}`);
}

async function expectBusinessHours(serviceId) {
  const sunday = nextWeekdayISO(0);
  const monday = nextWeekdayISO(1);
  const holiday = "2026-05-01";

  const sundayAvailability = await availabilityFor(sunday, serviceId);
  const mondayAvailability = await availabilityFor(monday, serviceId);
  const holidayAvailability = await availabilityFor(holiday, serviceId);

  record(
    "sunday closes at 14:00",
    sundayAvailability.closes === "14:00" && !sundayAvailability.times.includes("14:00"),
    `closes=${sundayAvailability.closes}`,
  );
  record(
    "holiday closes at 14:00",
    holidayAvailability.closes === "14:00" && !holidayAvailability.times.includes("14:00"),
    `closes=${holidayAvailability.closes}`,
  );
  record(
    "weekday closes at 18:00",
    mondayAvailability.closes === "18:00" && !mondayAvailability.times.includes("18:00"),
    `closes=${mondayAvailability.closes}`,
  );
}

async function availabilityFor(date, serviceId) {
  const params = new URLSearchParams({ date, professional: PROFESSIONAL, serviceId: String(serviceId) });
  const response = await request(`/api/availability?${params.toString()}`);
  return response.json();
}

async function createAppointment(serviceId) {
  const response = await request("/api/appointments", {
    method: "POST",
    body: JSON.stringify(testPayload(serviceId)),
  });
  const data = await response.json();
  record("create appointment", response.status === 201 && Boolean(data.id), `status=${response.status} id=${data.id || ""}`);
  return data;
}

async function expectDuplicateBlocked(serviceId) {
  const response = await request("/api/appointments", {
    method: "POST",
    body: JSON.stringify(testPayload(serviceId)),
  });
  record("duplicate appointment blocked", response.status === 409, `status=${response.status}`);
}

async function expectOverlapBlocked(serviceId) {
  const response = await request("/api/appointments", {
    method: "POST",
    body: JSON.stringify(testPayload(serviceId, OVERLAP_TIME)),
  });
  record("overlapping duration blocked", response.status === 409, `status=${response.status}`);
}

async function expectTimeUnavailable(serviceId) {
  const params = new URLSearchParams({ date: TEST_DATE, professional: PROFESSIONAL, serviceId: String(serviceId) });
  const response = await request(`/api/availability?${params.toString()}`);
  const data = await response.json();
  const bookedUnavailable = Array.isArray(data.times) && !data.times.includes(TEST_TIME);
  const overlapUnavailable = Array.isArray(data.times) && !data.times.includes(OVERLAP_TIME);
  record("booked time unavailable", response.ok && bookedUnavailable, `status=${response.status} contains=${!bookedUnavailable}`);
  record("overlap time unavailable", response.ok && overlapUnavailable, `status=${response.status} contains=${!overlapUnavailable}`);
}

async function expectClientLookupFindsAppointment(id) {
  const params = new URLSearchParams({ date: TEST_DATE, phone: "(61) 99999-0000" });
  const response = await request(`/api/client/appointments?${params.toString()}`);
  const data = await response.json();
  const found = Array.isArray(data.appointments) && data.appointments.some((appointment) => appointment.id === id);
  const exposesPrivateFields = JSON.stringify(data).includes("99999-0000") || JSON.stringify(data).includes("Teste Smoke");
  record("client lookup finds public appointment", response.ok && found && !exposesPrivateFields, `status=${response.status} found=${found} private=${exposesPrivateFields}`);
}

async function loginAdmin() {
  const response = await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password: ADMIN_PIN }),
  });
  const cookie = response.headers.get("set-cookie") || "";
  record("admin login", response.ok && cookie.includes("sn_admin_session="), `status=${response.status}`);
  return cookie;
}

async function expectAdminSeesAppointment(cookie, id) {
  const response = await request("/api/appointments", { headers: { Cookie: cookie } });
  const data = await response.json();
  const found = Array.isArray(data) && data.some((appointment) => appointment.id === id);
  record("admin sees appointment", response.ok && found, `status=${response.status} found=${found}`);
}

async function confirmAppointment(cookie, id) {
  const response = await request(`/api/appointments/${id}/confirm`, {
    method: "PATCH",
    headers: { Cookie: cookie },
  });
  const data = await response.json();
  record("admin confirms appointment", response.ok && data.status === "confirmado", `status=${response.status}`);
}

async function exportCsv(cookie) {
  const response = await request("/api/admin/export", { headers: { Cookie: cookie } });
  const text = await response.text();
  record("admin exports csv", response.ok && text.includes("cliente") && text.includes("telefone"), `status=${response.status}`);
}

async function cancelAppointment(cookie, id) {
  const response = await request(`/api/appointments/${id}/cancel`, {
    method: "PATCH",
    headers: { Cookie: cookie },
  });
  const data = await response.json();
  record("admin cancels test appointment", response.ok && data.status === "cancelado", `status=${response.status}`);
}

async function cleanupLocalAppointment(cookie, id) {
  if (BASE_URL !== "http://localhost:5175" && BASE_URL !== "http://127.0.0.1:5175") {
    record("local cleanup skipped", true, "published smoke test keeps cancelled audit record");
    return;
  }

  const response = await request(`/api/appointments/${id}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
  record("local cleanup removed test appointment", response.status === 204, `status=${response.status}`);
}

async function request(route, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  return fetch(`${BASE_URL}${route}`, { ...options, headers });
}

function testPayload(serviceId, time = TEST_TIME) {
  return {
    client: `Teste Smoke ${Date.now()}`,
    phone: "(61) 99999-0000",
    serviceId,
    professional: PROFESSIONAL,
    paymentMethod: "Pix",
    notes: "Teste automatizado de entrega",
    date: TEST_DATE,
    time,
  };
}

function assert(name, ok, detail) {
  record(name, ok, detail);
  if (!ok) {
    printResults();
    process.exit(1);
  }
}

function record(name, ok, detail) {
  results.push({ name, ok, detail });
}

function printResults() {
  console.table(results);
}

function tomorrowISO() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function nextWeekdayISO(day) {
  const date = new Date();
  const distance = (day - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + distance);
  return date.toISOString().slice(0, 10);
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
  return typeof value === "string" ? value.trim() : value;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
