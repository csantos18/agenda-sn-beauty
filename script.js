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
const adminLockButton = document.querySelector("#adminLockButton");
const adminStatus = document.querySelector("#adminStatus");
const reviewForm = document.querySelector("#reviewForm");
const reviewsList = document.querySelector("#reviewsList");
const ratingScore = document.querySelector("#ratingScore");
const ratingCount = document.querySelector("#ratingCount");

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

async function api(path, options = {}) {
  const { admin = false, headers = {}, ...fetchOptions } = options;
  const response = await fetch(path, {
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

function renderAppointments() {
  if (!adminPin) {
    appointments = [];
    appointmentsList.innerHTML = '<div class="empty-state">Digite o PIN administrativo para ver a agenda completa.</div>';
    todayCount.textContent = "Painel protegido";
    return;
  }

  const sorted = [...appointments].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  if (!sorted.length) {
    appointmentsList.innerHTML = '<div class="empty-state">Nenhum agendamento registrado.</div>';
    todayCount.textContent = "0 horarios";
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
            <button class="secondary-button" type="button" data-action="reschedule" data-id="${appointment.id}">Remarcar</button>
            <button class="ghost-button" type="button" data-action="cancel" data-id="${appointment.id}">Desmarcar</button>
          </div>
        </article>
      `,
    )
    .join("");

  const today = new Date().toISOString().slice(0, 10);
  const totalToday = appointments.filter((appointment) => appointment.date === today).length;
  todayCount.textContent = `${totalToday} horários`;
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
      await api(`/api/appointments/${editingAppointmentId}/reschedule`, {
        method: "PATCH",
        admin: true,
        body: JSON.stringify(payload),
      });
      showMessage("Agendamento remarcado com sucesso.");
    } else {
      await api("/api/appointments", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showMessage("Agendamento confirmado com sucesso.");
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
    if (element === professionalSelect || element === dateInput) {
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
