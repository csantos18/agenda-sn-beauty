let services = [];
let professionals = [];
let paymentMethods = [];
let appointments = [];
let reviews = [];
let availableTimes = [];
let editingAppointmentId = null;
let adminAuthenticated = false;

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
const appointmentsList = document.querySelector("#appointmentsList");
const todayCount = document.querySelector("#todayCount");
const adminForm = document.querySelector("#adminForm");
const adminPinInput = document.querySelector("#adminPinInput");
const adminDateInput = document.querySelector("#adminDateInput");
const adminStatusFilter = document.querySelector("#adminStatusFilter");
const adminStats = document.querySelector("#adminStats");
const adminLockButton = document.querySelector("#adminLockButton");
const adminExportButton = document.querySelector("#adminExportButton");
const adminStatus = document.querySelector("#adminStatus");
const reviewForm = document.querySelector("#reviewForm");
const reviewsList = document.querySelector("#reviewsList");
const ratingScore = document.querySelector("#ratingScore");
const ratingCount = document.querySelector("#ratingCount");
const confirmationBox = document.querySelector("#confirmationBox");
const bookingWhatsAppLink = document.querySelector("#bookingWhatsAppLink");
const confirmationDetails = document.querySelector("#confirmationDetails");
const LOCAL_API_ORIGIN = "http://localhost:5175";
const SALON_WHATSAPP = "5561981561421";

function money(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
    "Pode confirmar meu horário, por favor?",
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/${SALON_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

function buildClientWhatsAppUrl(appointment, mode = "contact") {
  const digits = String(appointment.phone || "").replace(/\D/g, "");
  const serviceName = appointment.service?.name || "seu atendimento";
  const messages = {
    confirm: [
      `Olá, ${appointment.client}!`,
      `Seu horário no Sarah Neves Beauty Studio foi confirmado para ${formatDate(appointment.date)} às ${appointment.time}.`,
      `Serviço: ${serviceName}.`,
      "Qualquer imprevisto, me avise por aqui.",
    ],
    contact: [
      `Olá, ${appointment.client}!`,
      `Estou entrando em contato sobre seu agendamento de ${serviceName} no dia ${formatDate(appointment.date)} às ${appointment.time}.`,
    ],
  };
  return `https://wa.me/55${digits}?text=${encodeURIComponent((messages[mode] || messages.contact).join("\n"))}`;
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

function updateAdminStatus(message) {
  adminStatus.textContent =
    message || (adminAuthenticated ? "Painel administrativo liberado neste navegador." : "Painel protegido. Apenas a profissional deve acessar a agenda completa.");
  adminPinInput.value = adminAuthenticated ? "********" : "";
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
  if (editingAppointmentId) {
    params.set("excludeId", editingAppointmentId);
  }
  const availability = await api(`/api/availability?${params.toString()}`);
  availableTimes = availability.times;
  const editingAppointment = appointments.find((appointment) => appointment.id === editingAppointmentId);
  if (
    editingAppointment &&
    editingAppointment.date === dateInput.value &&
    editingAppointment.professional === professionalSelect.value &&
    !availableTimes.includes(editingAppointment.time)
  ) {
    availableTimes = [...availableTimes, editingAppointment.time].sort();
  }
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

function appointmentValue(appointment) {
  return appointment.service?.price || 0;
}

function renderAdminStats(items, selectedDate) {
  if (!adminStats) return;

  if (!adminAuthenticated) {
    adminStats.innerHTML = "";
    return;
  }

  const active = items.filter((appointment) => normalizeStatus(appointment.status) !== "cancelado");
  const pending = items.filter((appointment) => normalizeStatus(appointment.status) === "pendente");
  const confirmed = items.filter((appointment) => normalizeStatus(appointment.status) === "confirmado");
  const completed = items.filter((appointment) => appointment.status === "concluido");
  const canceled = items.filter((appointment) => appointment.status === "cancelado");
  const expectedRevenue = active.reduce((sum, appointment) => sum + appointmentValue(appointment), 0);
  const completedRevenue = completed.reduce((sum, appointment) => sum + appointmentValue(appointment), 0);

  adminStats.innerHTML = [
    ["Data", formatDate(selectedDate)],
    ["Ativos", String(active.length)],
    ["Pendentes", String(pending.length)],
    ["Confirmados", String(confirmed.length)],
    ["Concluídos", String(completed.length)],
    ["Cancelados", String(canceled.length)],
    ["Previsto", money(expectedRevenue)],
    ["Realizado", money(completedRevenue)],
  ]
    .map(
      ([label, value]) => `
        <article class="stat-card">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </article>
      `,
    )
    .join("");
}

function renderAppointments() {
  if (!adminAuthenticated) {
    appointments = [];
    renderAdminStats([], new Date().toISOString().slice(0, 10));
    appointmentsList.innerHTML = '<div class="empty-state">Digite a senha administrativa para ver a agenda completa.</div>';
    todayCount.textContent = "Agendamento online";
    return;
  }

  const selectedAdminDate = adminDateInput.value || new Date().toISOString().slice(0, 10);
  const selectedStatus = adminStatusFilter?.value || "todos";
  const visibleAppointments = appointments.filter(
    (appointment) =>
      appointment.date === selectedAdminDate &&
      (selectedStatus === "todos" || normalizeStatus(appointment.status) === selectedStatus),
  );
  const sorted = [...visibleAppointments].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  renderAdminStats(sorted, selectedAdminDate);
  if (!sorted.length) {
    appointmentsList.innerHTML = `<div class="empty-state">Nenhum agendamento registrado para ${formatDate(selectedAdminDate)}.</div>`;
    todayCount.textContent = "0 horários";
    return;
  }

  appointmentsList.innerHTML = sorted
    .map(
      (appointment) => `
        <article class="appointment-card">
          <div class="appointment-time">${escapeHtml(appointment.time)}</div>
          <div>
            <h3>${escapeHtml(appointment.client)}</h3>
            <p>${escapeHtml(appointment.service.name)} com ${escapeHtml(appointment.professional)} em ${formatDate(appointment.date)}</p>
            <p>${escapeHtml(appointment.phone)} | ${escapeHtml(appointment.paymentMethod)} | ${money(appointment.service.price)} | ${appointment.service.duration} min</p>
            ${appointment.notes ? `<p class="appointment-notes"><strong>Obs.:</strong> ${escapeHtml(appointment.notes)}</p>` : ""}
          </div>
          <div class="appointment-actions">
            <span class="status ${escapeHtml(normalizeStatus(appointment.status))}">${escapeHtml(statusLabel(appointment.status))}</span>
            ${
              normalizeStatus(appointment.status) === "pendente"
                ? `<button class="secondary-button" type="button" data-action="confirm" data-id="${appointment.id}">Confirmar</button>`
                : ""
            }
            <a class="secondary-button admin-whatsapp" href="${buildClientWhatsAppUrl(appointment, "confirm")}" target="_blank" rel="noopener">Confirmar WhatsApp</a>
            <a class="ghost-button admin-whatsapp" href="${buildClientWhatsAppUrl(appointment)}" target="_blank" rel="noopener">Chamar cliente</a>
            ${
              !["cancelado", "concluido"].includes(normalizeStatus(appointment.status))
                ? `<button class="secondary-button" type="button" data-action="complete" data-id="${appointment.id}">Concluir</button>`
                : ""
            }
            <button class="secondary-button" type="button" data-action="reschedule" data-id="${appointment.id}">Remarcar</button>
            <button class="ghost-button" type="button" data-action="cancel" data-id="${appointment.id}">Desmarcar</button>
          </div>
        </article>
      `,
    )
    .join("");

  todayCount.textContent = `${sorted.length} horários`;
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
  const today = new Date().toISOString().slice(0, 10);
  dateInput.value = today;
  dateInput.min = today;
  if (adminDateInput) {
    adminDateInput.value = today;
  }
}

async function loadAppointments() {
  if (!adminAuthenticated) {
    renderAppointments();
    return;
  }

  appointments = await api("/api/appointments", { admin: true });
  renderAppointments();
}

async function loadReviews() {
  const data = await api("/api/reviews");
  reviews = data.reviews;
  renderReviews(data.average);
}

function resetBookingForm() {
  editingAppointmentId = null;
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
    if (editingAppointmentId) {
      const updatedAppointment = await api(`/api/appointments/${editingAppointmentId}/reschedule`, {
        method: "PATCH",
        admin: true,
        body: JSON.stringify(payload),
      });
      showBookingConfirmation(updatedAppointment);
      showMessage("Agendamento remarcado com sucesso.");
    } else {
      const createdAppointment = await api("/api/appointments", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showBookingConfirmation({ ...payload, ...createdAppointment });
      showMessage("Seu horário foi solicitado. Aguarde confirmação da profissional pelo WhatsApp.");
    }

    resetBookingForm();
    await loadAvailability();
    if (adminAuthenticated) {
      await loadAppointments();
    }
    renderSummary();
  } catch (error) {
    showMessage(error.message);
  }
});

appointmentsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const appointment = appointments.find((item) => item.id === id);
  if (!appointment) return;

  if (button.dataset.action === "cancel") {
    try {
      await api(`/api/appointments/${id}/cancel`, { method: "PATCH", admin: true });
      showMessage("Agendamento desmarcado com sucesso.");
      await loadAppointments();
      await loadAvailability();
      renderSummary();
    } catch (error) {
      showMessage(error.message);
    }
    return;
  }

  if (button.dataset.action === "confirm") {
    try {
      await api(`/api/appointments/${id}/confirm`, { method: "PATCH", admin: true });
      showMessage("Agendamento confirmado no painel.");
      await loadAppointments();
      await loadAvailability();
      renderSummary();
    } catch (error) {
      showMessage(error.message);
    }
    return;
  }

  if (button.dataset.action === "complete") {
    try {
      await api(`/api/appointments/${id}/complete`, { method: "PATCH", admin: true });
      showMessage("Agendamento marcado como concluído.");
      await loadAppointments();
      await loadAvailability();
      renderSummary();
    } catch (error) {
      showMessage(error.message);
    }
    return;
  }

  editingAppointmentId = id;
  document.querySelector("#clientName").value = appointment.client;
  document.querySelector("#clientPhone").value = appointment.phone;
  notesInput.value = appointment.notes || "";
  serviceSelect.value = appointment.serviceId;
  professionalSelect.value = appointment.professional;
  paymentSelect.value = appointment.paymentMethod;
  dateInput.value = appointment.date;
  await loadAvailability();
  timeSelect.value = appointment.time;
  renderSummary();
  document.querySelector("#agendar").scrollIntoView({ behavior: "smooth" });
});

document.querySelector("#clientPhone").addEventListener("input", (event) => {
  event.target.value = formatPhone(event.target.value);
});

adminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = adminPinInput.value.trim();

  if (!password || password === "********") {
    updateAdminStatus("Digite a senha administrativa para abrir o painel.");
    return;
  }

  try {
    await api("/api/admin/login", {
      method: "POST",
      admin: true,
      body: JSON.stringify({ password }),
    });
    adminAuthenticated = true;
    await loadAppointments();
    updateAdminStatus();
  } catch (error) {
    adminAuthenticated = false;
    appointments = [];
    renderAppointments();
    const message =
      error.message === "Senha administrativa inválida."
        ? "Senha administrativa inválida. Confira se o ADMIN_PIN do Render está igual à senha combinada."
        : error.message;
    updateAdminStatus(message);
  }
});

adminLockButton.addEventListener("click", async () => {
  adminAuthenticated = false;
  editingAppointmentId = null;
  appointments = [];
  try {
    await api("/api/admin/logout", { method: "POST", admin: true });
  } catch {
    // The UI should still lock even if the logout request cannot complete.
  }
  renderAppointments();
  updateAdminStatus("Painel bloqueado neste navegador.");
});

adminStatusFilter.addEventListener("change", renderAppointments);

adminExportButton.addEventListener("click", () => {
  if (!adminAuthenticated) {
    updateAdminStatus("Abra o painel antes de exportar a agenda.");
    return;
  }

  window.location.href = apiUrl("/api/admin/export");
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

adminDateInput.addEventListener("change", renderAppointments);

async function init() {
  try {
    setInitialDate();
    services = await api("/api/services");
    professionals = await api("/api/professionals");
    paymentMethods = await api("/api/payment-methods");
    renderServices();
    renderProfessionals();
    renderPaymentMethods();
    await loadAvailability();
    const session = await api("/api/admin/session", { admin: true });
    adminAuthenticated = Boolean(session.authenticated);
    updateAdminStatus();
    await loadAppointments();
    await loadReviews();
    renderSummary();
  } catch (error) {
    showMessage(`Erro ao iniciar o aplicativo: ${error.message}`);
  }
}

init();


