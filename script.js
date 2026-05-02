let services = [];
let professionals = [];
let paymentMethods = [];
let reviews = [];
let availableTimes = [];

const servicesGrid = document.querySelector("#servicesGrid");
const serviceSelect = document.querySelector("#serviceSelect");
const serviceDetails = document.querySelector("#serviceDetails");
const timeSelect = document.querySelector("#timeSelect");
const dateInput = document.querySelector("#dateInput");
const professionalSelect = document.querySelector("#professionalSelect");
const paymentSelect = document.querySelector("#paymentSelect");
const notesInput = document.querySelector("#notesInput");
const bookingSummary = document.querySelector("#bookingSummary");
const bookingForm = document.querySelector("#bookingForm");
const todayCount = document.querySelector("#todayCount");
const reviewForm = document.querySelector("#reviewForm");
const reviewsList = document.querySelector("#reviewsList");
const ratingScore = document.querySelector("#ratingScore");
const ratingCount = document.querySelector("#ratingCount");
const confirmationBox = document.querySelector("#confirmationBox");
const bookingWhatsAppLink = document.querySelector("#bookingWhatsAppLink");
const confirmationDetails = document.querySelector("#confirmationDetails");
const lookupForm = document.querySelector("#lookupForm");
const lookupPhone = document.querySelector("#lookupPhone");
const lookupDate = document.querySelector("#lookupDate");
const lookupResults = document.querySelector("#lookupResults");
const LOCAL_API_ORIGIN = "http://localhost:5175";
const SALON_WHATSAPP = "5561981561421";
const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

function money(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pluralize(count, singular, plural) {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`;
}

function todayBusinessISO() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function apiUrl(path) {
  const isLocalHost = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
  const isNodeServer = window.location.port === "5175";

  if (window.location.protocol === "file:" || (isLocalHost && !isNodeServer)) {
    return `${LOCAL_API_ORIGIN}${path}`;
  }

  return path;
}

async function api(path, options = {}) {
  const { admin = false, headers = {}, ...fetchOptions } = options;
  const response = await fetch(apiUrl(path), {
    credentials: admin ? "include" : "same-origin",
    headers: { "Content-Type": "application/json", ...headers },
    ...fetchOptions,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Não foi possível concluir a operação.");
  }

  return data;
}

function showMessage(message) {
  alert(message);
}

function statusLabel(status) {
  const labels = {
    pendente: "Pendente",
    confirmado: "Confirmado",
    cancelado: "Cancelado",
    concluido: "Concluído",
    agendado: "Pendente",
  };
  return labels[status] || status;
}

function normalizeStatus(status) {
  return status === "agendado" ? "pendente" : status;
}

function formatPhone(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function buildBookingWhatsAppUrl(appointment) {
  const service = services.find((item) => item.id === Number(appointment.serviceId));
  const message = [
    "Olá! Fiz um agendamento pelo Agenda SN Beauty.",
    appointment.id ? `Protocolo: #${appointment.id}` : "",
    "",
    `Nome: ${appointment.client}`,
    `Telefone: ${appointment.phone}`,
    `Serviço: ${service ? service.name : "Selecionado no site"}`,
    `Profissional: ${appointment.professional}`,
    `Data: ${formatDate(appointment.date)}`,
    `Horário: ${appointment.time}`,
    `Pagamento: ${appointment.paymentMethod}`,
    appointment.notes ? `Observações: ${appointment.notes}` : "",
    "",
    "Pode confirmar se esse horário está disponível, por favor?",
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/${SALON_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

function showBookingConfirmation(appointment) {
  if (!confirmationBox || !bookingWhatsAppLink) return;

  bookingWhatsAppLink.href = buildBookingWhatsAppUrl(appointment);
  if (confirmationDetails) {
    const service = services.find((item) => item.id === Number(appointment.serviceId));
    confirmationDetails.innerHTML = [
      appointment.id ? ["Protocolo", `#${appointment.id}`] : null,
      ["Status", statusLabel(appointment.status || "pendente")],
      ["Serviço", service ? service.name : "Serviço selecionado"],
      ["Data", formatDate(appointment.date)],
      ["Horário", appointment.time],
    ]
      .filter(Boolean)
      .map(([label, value]) => `<span><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`)
      .join("");
  }
  confirmationBox.hidden = false;
}

function hideBookingConfirmation() {
  if (!confirmationBox) return;
  confirmationBox.hidden = true;
}

function renderServices() {
  servicesGrid.innerHTML = services
    .map(
      (service) => `
        <article class="service-card">
          <h3>${escapeHtml(service.name)}</h3>
          <p>${escapeHtml(service.description)}</p>
          <div class="service-meta">
            <span>${money(service.price)}</span>
            <span>${service.duration} min</span>
          </div>
        </article>
      `,
    )
    .join("");

  serviceSelect.innerHTML = [
    '<option value="">Selecione o serviço</option>',
    ...services.map(
      (service) => `<option value="${service.id}">${escapeHtml(service.name)} - ${service.duration} min - ${money(service.price)}</option>`,
    ),
  ].join("");
  renderServiceDetails();
}

function renderProfessionals() {
  professionalSelect.innerHTML = professionals
    .map((professional) => `<option>${escapeHtml(professional)}</option>`)
    .join("");
}

function renderPaymentMethods() {
  paymentSelect.innerHTML = paymentMethods
    .map((paymentMethod) => `<option>${escapeHtml(paymentMethod)}</option>`)
    .join("");
}

function unavailableTimes() {
  return [];
}

async function loadAvailability() {
  if (!dateInput.value) return;
  const params = new URLSearchParams({
    date: dateInput.value,
    professional: professionalSelect.value,
  });
  const service = selectedService();
  if (service) {
    params.set("serviceId", service.id);
  }
  const availability = await api(`/api/availability?${params.toString()}`);
  availableTimes = availability.times;
  renderTimes();
}

function renderTimes() {
  const blocked = unavailableTimes();
  if (!availableTimes.length) {
    timeSelect.innerHTML = '<option value="">Não há horário disponível para esse serviço nesta data</option>';
    return;
  }

  timeSelect.innerHTML = [
    '<option value="">Selecione o horário</option>',
    ...availableTimes.map((time) => {
      const disabled = blocked.includes(time) ? "disabled" : "";
      const label = blocked.includes(time) ? `${time} indisponível` : time;
      return `<option value="${time}" ${disabled}>${label}</option>`;
    }),
  ].join("");
}

function selectedService() {
  return services.find((service) => service.id === Number(serviceSelect.value));
}

function renderServiceDetails() {
  const service = selectedService();
  if (!serviceDetails) return;

  if (!service) {
    serviceDetails.innerHTML = "Escolha um serviço para ver descrição, duração e valor antes de confirmar.";
    return;
  }

  serviceDetails.innerHTML = `
    <strong>${escapeHtml(service.name)}</strong>
    <span>${escapeHtml(service.description)}</span>
    <small>${service.duration} min | ${money(service.price)}</small>
  `;
}

function currentSummary() {
  const service = selectedService();
  if (!service) return [];

  return [
    ["Serviço", service.name],
    ["Profissional", professionalSelect.value],
    ["Data", dateInput.value ? formatDate(dateInput.value) : "Selecione"],
    ["Horário", timeSelect.value || "Selecione"],
    ["Pagamento", paymentSelect.value || "Selecione"],
    ["Observações", notesInput.value.trim() || "Nenhuma"],
    ["Valor", money(service.price)],
    ["Duração", `${service.duration} min`],
    ["Funcionamento", isShortDaySelected() ? "08:00 às 14:00" : "08:00 às 18:00"],
  ];
}

function isShortDaySelected() {
  if (!dateInput.value) return false;
  const day = new Date(`${dateInput.value}T12:00:00`).getDay();
  const holidays = ["2026-01-01", "2026-04-03", "2026-04-21", "2026-05-01", "2026-09-07", "2026-10-12", "2026-11-02", "2026-11-15", "2026-12-25"];
  return day === 0 || holidays.includes(dateInput.value);
}

function renderSummary() {
  bookingSummary.innerHTML = currentSummary()
    .map(([label, value]) => `<div class="summary-line"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("");
}

function renderReviews(average) {
  reviewsList.innerHTML = reviews
    .map(
      (review) => `
        <article class="review-card">
          <strong>${escapeHtml(review.name)}</strong>
          <span>Nota ${review.rating}/5</span>
          <p>${escapeHtml(review.comment)}</p>
        </article>
      `,
    )
    .join("");

  ratingScore.textContent = average.toFixed(1);
  ratingCount.textContent = `${reviews.length} avaliações registradas`;
}

function setInitialDate() {
  const today = todayBusinessISO();
  dateInput.value = today;
  dateInput.min = today;
  if (lookupDate) {
    lookupDate.value = today;
    lookupDate.min = today;
  }
}

async function loadReviews() {
  const data = await api("/api/reviews");
  reviews = data.reviews;
  renderReviews(data.average);
}

async function loadTodayAvailabilitySummary() {
  if (!todayCount || !services.length || !professionals.length) return;

  try {
    const params = new URLSearchParams({
      date: todayBusinessISO(),
      professional: professionals[0],
      serviceId: String(services[0].id),
    });
    const availability = await api(`/api/availability?${params.toString()}`);
    todayCount.textContent = availability.times.length
      ? pluralize(availability.times.length, "horário", "horários")
      : "Agenda cheia";
  } catch {
    todayCount.textContent = "Consultar horários";
  }
}

function resetBookingForm() {
  bookingForm.reset();
  setInitialDate();
}

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    client: document.querySelector("#clientName").value.trim(),
    phone: document.querySelector("#clientPhone").value.trim(),
    serviceId: Number(serviceSelect.value),
    professional: professionalSelect.value,
    date: dateInput.value,
    time: timeSelect.value,
    paymentMethod: paymentSelect.value,
    notes: notesInput.value.trim(),
  };

  try {
    const createdAppointment = await api("/api/appointments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    showBookingConfirmation({ ...payload, ...createdAppointment });
    showMessage("Pedido enviado. Aguarde a confirmação da profissional pelo WhatsApp.");

    resetBookingForm();
    await loadAvailability();
    renderSummary();
  } catch (error) {
    showMessage(error.message);
  }
});

document.querySelector("#clientPhone").addEventListener("input", (event) => {
  event.target.value = formatPhone(event.target.value);
});

lookupPhone.addEventListener("input", (event) => {
  event.target.value = formatPhone(event.target.value);
});

reviewForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await api("/api/reviews", {
      method: "POST",
      body: JSON.stringify({
        name: document.querySelector("#reviewName").value.trim(),
        rating: Number(document.querySelector("#reviewRating").value),
        comment: document.querySelector("#reviewComment").value.trim(),
        website: document.querySelector("#reviewWebsite").value.trim(),
      }),
    });
    reviewForm.reset();
    await loadReviews();
    showMessage("Avaliação enviada com sucesso.");
  } catch (error) {
    showMessage(error.message);
  }
});

function renderLookupResults(items) {
  if (!items.length) {
    lookupResults.innerHTML = '<div class="empty-state">Nenhum pedido encontrado para esse telefone e data. Confira os dados ou fale com o salão pelo WhatsApp.</div>';
    return;
  }

  lookupResults.innerHTML = items
    .map(
      (appointment) => `
        <article class="lookup-card">
          <div>
            <span class="status ${escapeHtml(normalizeStatus(appointment.status))}">${escapeHtml(statusLabel(appointment.status))}</span>
            <h3>${escapeHtml(appointment.service?.name || "Serviço")}</h3>
            <p>${formatDate(appointment.date)} às ${escapeHtml(appointment.time)} com ${escapeHtml(appointment.professional)}</p>
            <p>${appointment.service ? `${money(appointment.service.price)} | ${appointment.service.duration} min` : ""}</p>
          </div>
        </article>
      `,
    )
    .join("");
}

lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const params = new URLSearchParams({
      phone: lookupPhone.value.trim(),
      date: lookupDate.value,
    });
    const data = await api(`/api/client/appointments?${params.toString()}`);
    renderLookupResults(data.appointments || []);
  } catch (error) {
    lookupResults.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
});

[serviceSelect, professionalSelect, paymentSelect, dateInput, timeSelect, notesInput].forEach((element) => {
  element.addEventListener("change", async () => {
    hideBookingConfirmation();
    if (element === professionalSelect || element === dateInput || element === serviceSelect) {
      await loadAvailability();
    }
    if (element === serviceSelect) {
      renderServiceDetails();
    }
    renderSummary();
  });
});

async function init() {
  try {
    setInitialDate();
    services = await api("/api/services");
    professionals = await api("/api/professionals");
    paymentMethods = await api("/api/payment-methods");
    renderServices();
    renderProfessionals();
    renderPaymentMethods();
    await loadTodayAvailabilitySummary();
    await loadAvailability();
    await loadReviews();
    renderSummary();
  } catch (error) {
    showMessage(`Erro ao iniciar o aplicativo: ${error.message}`);
  }
}

init();


