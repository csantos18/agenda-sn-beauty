let services = [];
let professionals = [];
let paymentMethods = [];
let appointments = [];
let reviews = [];
let availableTimes = [];
let editingAppointmentId = null;
let adminPin = sessionStorage.getItem("adminPin") || "";

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
const adminStats = document.querySelector("#adminStats");
const adminLockButton = document.querySelector("#adminLockButton");
const adminStatus = document.querySelector("#adminStatus");
const reviewForm = document.querySelector("#reviewForm");
const reviewsList = document.querySelector("#reviewsList");
const ratingScore = document.querySelector("#ratingScore");
const ratingCount = document.querySelector("#ratingCount");
const confirmationBox = document.querySelector("#confirmationBox");
const bookingWhatsAppLink = document.querySelector("#bookingWhatsAppLink");
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

function adminHeaders() {
  return adminPin ? { "x-admin-pin": adminPin } : {};
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
    headers: { "Content-Type": "application/json", ...(admin ? adminHeaders() : {}), ...headers },
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

function buildBookingWhatsAppUrl(appointment) {
  const service = services.find((item) => item.id === Number(appointment.serviceId));
  const message = [
    "Olá! Fiz um agendamento pelo Agenda SN Beauty.",
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

function showBookingConfirmation(appointment) {
  if (!confirmationBox || !bookingWhatsAppLink) return;

  bookingWhatsAppLink.href = buildBookingWhatsAppUrl(appointment);
  confirmationBox.hidden = false;
}

function hideBookingConfirmation() {
  if (!confirmationBox) return;
  confirmationBox.hidden = true;
}

function updateAdminStatus(message) {
  adminStatus.textContent =
    message || (adminPin ? "Painel administrativo liberado neste navegador." : "Painel protegido. Apenas a profissional deve acessar a agenda completa.");
  adminPinInput.value = adminPin ? "********" : "";
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
    timeSelect.innerHTML = '<option value="">Não há horários disponíveis para esta data</option>';
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
  ];
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

  if (!adminPin) {
    adminStats.innerHTML = "";
    return;
  }

  const active = items.filter((appointment) => appointment.status !== "cancelado");
  const scheduled = items.filter((appointment) => appointment.status === "agendado");
  const completed = items.filter((appointment) => appointment.status === "concluido");
  const canceled = items.filter((appointment) => appointment.status === "cancelado");
  const expectedRevenue = active.reduce((sum, appointment) => sum + appointmentValue(appointment), 0);
  const completedRevenue = completed.reduce((sum, appointment) => sum + appointmentValue(appointment), 0);

  adminStats.innerHTML = [
    ["Data", formatDate(selectedDate)],
    ["Ativos", String(active.length)],
    ["Próximos", String(scheduled.length)],
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
  if (!adminPin) {
    appointments = [];
    renderAdminStats([], new Date().toISOString().slice(0, 10));
    appointmentsList.innerHTML = '<div class="empty-state">Digite o PIN administrativo para ver a agenda completa.</div>';
    todayCount.textContent = "Painel protegido";
    return;
  }

  const selectedAdminDate = adminDateInput.value || new Date().toISOString().slice(0, 10);
  const visibleAppointments = appointments.filter((appointment) => appointment.date === selectedAdminDate);
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
            ${appointment.notes ? `<p>Obs.: ${escapeHtml(appointment.notes)}</p>` : ""}
          </div>
          <div class="appointment-actions">
            <span class="status ${escapeHtml(appointment.status)}">${escapeHtml(appointment.status)}</span>
            ${
              appointment.status !== "cancelado" && appointment.status !== "concluido"
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
  if (!adminPin) {
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
      showMessage("Agendamento confirmado com sucesso. Aguarde confirmação da profissional. Você também pode enviar os dados pelo WhatsApp.");
    }

    resetBookingForm();
    await loadAvailability();
    if (adminPin) {
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

adminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const typedPin = adminPinInput.value.trim();

  if (!typedPin || typedPin === "********") {
    updateAdminStatus("Digite o PIN administrativo para abrir o painel.");
    return;
  }

  adminPin = typedPin;
  sessionStorage.setItem("adminPin", adminPin);

  try {
    await loadAppointments();
    updateAdminStatus();
  } catch (error) {
    adminPin = "";
    sessionStorage.removeItem("adminPin");
    appointments = [];
    renderAppointments();
    updateAdminStatus(error.message);
  }
});

adminLockButton.addEventListener("click", () => {
  adminPin = "";
  editingAppointmentId = null;
  sessionStorage.removeItem("adminPin");
  appointments = [];
  renderAppointments();
  updateAdminStatus("Painel bloqueado neste navegador.");
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
    if (element === professionalSelect || element === dateInput) {
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
    updateAdminStatus();
    await loadAppointments();
    await loadReviews();
    renderSummary();
  } catch (error) {
    showMessage(`Erro ao iniciar o aplicativo: ${error.message}`);
  }
}

init();
