let services = [];
let professionals = [];
let paymentMethods = [];
let appointments = [];
let reviews = [];
let availableTimes = [];
let editingAppointmentId = null;

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

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
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

function renderServices() {
  servicesGrid.innerHTML = services
    .map(
      (service) => `
        <article class="service-card">
          <h3>${service.name}</h3>
          <p>${service.description}</p>
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
      (service) => `<option value="${service.id}">${service.name} - ${service.duration} min - ${money(service.price)}</option>`,
    ),
  ].join("");
  renderServiceDetails();
}

function renderProfessionals() {
  professionalSelect.innerHTML = professionals
    .map((professional) => `<option>${professional}</option>`)
    .join("");
}

function renderPaymentMethods() {
  paymentSelect.innerHTML = paymentMethods
    .map((paymentMethod) => `<option>${paymentMethod}</option>`)
    .join("");
}

function unavailableTimes() {
  return appointments
    .filter(
      (appointment) =>
        appointment.id !== editingAppointmentId &&
        appointment.date === dateInput.value &&
        appointment.professional === professionalSelect.value &&
        appointment.status !== "cancelado",
    )
    .map((appointment) => appointment.time);
}

async function loadAvailability() {
  if (!dateInput.value) return;
  const availability = await api(`/api/availability?date=${dateInput.value}`);
  availableTimes = availability.times;
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
    <strong>${service.name}</strong>
    <span>${service.description}</span>
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
    .map(([label, value]) => `<div class="summary-line"><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("");
}

function renderAppointments() {
  const sorted = [...appointments].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  appointmentsList.innerHTML = sorted
    .map(
      (appointment) => `
        <article class="appointment-card">
          <div class="appointment-time">${appointment.time}</div>
          <div>
            <h3>${appointment.client}</h3>
            <p>${appointment.service.name} com ${appointment.professional} em ${formatDate(appointment.date)}</p>
            <p>${appointment.phone} | ${appointment.paymentMethod} | ${money(appointment.service.price)} | ${appointment.service.duration} min</p>
            ${appointment.notes ? `<p>Obs.: ${appointment.notes}</p>` : ""}
          </div>
          <div class="appointment-actions">
            <span class="status ${appointment.status}">${appointment.status}</span>
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
          <strong>${review.name}</strong>
          <span>Nota ${review.rating}/5</span>
          <p>${review.comment}</p>
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
  appointments = await api("/api/appointments");
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
    await loadAppointments();
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
      await api(`/api/appointments/${id}/cancel`, { method: "PATCH" });
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
    await loadAppointments();
    await loadReviews();
    renderSummary();
  } catch (error) {
    showMessage(`Erro ao iniciar o aplicativo: ${error.message}`);
  }
}

init();
