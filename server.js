const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5175;
const DB_PATH = path.join(__dirname, "database.json");

const weekdayTimes = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const shortDayTimes = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00"];
const paymentMethods = ["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito"];
const holidayDates = [];

app.use(express.json());
app.use(express.static(__dirname));

async function readDb() {
  const raw = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

async function writeDb(db) {
  await fs.writeFile(DB_PATH, `${JSON.stringify(db, null, 2)}\n`, "utf-8");
}

function nextId(items) {
  return items.length ? Math.max(...items.map((item) => Number(item.id))) + 1 : 1;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isShortDay(date) {
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.getDay() === 0 || holidayDates.includes(date);
}

function allowedTimes(date) {
  return isShortDay(date) ? shortDayTimes : weekdayTimes;
}

function enrichAppointment(appointment, services) {
  return {
    ...appointment,
    service: services.find((service) => service.id === appointment.serviceId),
  };
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

app.get("/api/availability", (req, res) => {
  const { date } = req.query;
  if (!date) {
    res.status(400).json({ error: "Informe a data." });
    return;
  }
  res.json({ times: allowedTimes(date), shortDay: isShortDay(date) });
});

app.get("/api/appointments", async (req, res) => {
  const db = await readDb();
  res.json(db.appointments.map((appointment) => enrichAppointment(appointment, db.services)));
});

app.post("/api/appointments", async (req, res) => {
  const db = await readDb();
  const payload = {
    ...req.body,
    serviceId: Number(req.body.serviceId),
    paymentMethod: req.body.paymentMethod,
    notes: req.body.notes?.trim() || "",
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
  res.status(201).json(enrichAppointment(appointment, db.services));
});

app.patch("/api/appointments/:id/cancel", async (req, res) => {
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

app.patch("/api/appointments/:id/reschedule", async (req, res) => {
  const db = await readDb();
  const id = Number(req.params.id);
  const appointment = db.appointments.find((item) => item.id === id);

  if (!appointment) {
    res.status(404).json({ error: "Agendamento não encontrado." });
    return;
  }

  const payload = {
    ...appointment,
    serviceId: Number(req.body.serviceId ?? appointment.serviceId),
    professional: req.body.professional ?? appointment.professional,
    date: req.body.date ?? appointment.date,
    time: req.body.time ?? appointment.time,
    client: req.body.client ?? appointment.client,
    phone: req.body.phone ?? appointment.phone,
    paymentMethod: req.body.paymentMethod ?? appointment.paymentMethod,
    notes: req.body.notes ?? appointment.notes ?? "",
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

app.post("/api/reviews", async (req, res) => {
  const db = await readDb();
  const rating = Number(req.body.rating);

  if (!req.body.name || !req.body.comment || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Informe nome, comentário e nota entre 1 e 5." });
    return;
  }

  const review = {
    id: nextId(db.reviews),
    name: req.body.name.trim(),
    rating,
    comment: req.body.comment.trim(),
  };

  db.reviews.unshift(review);
  await writeDb(db);
  res.status(201).json(review);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Agenda SN Beauty rodando em http://localhost:${PORT}`);
});
