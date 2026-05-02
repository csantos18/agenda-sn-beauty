let services = [];
let professionals = [];
let paymentMethods = [];
let appointments = [];
let adminAuthenticated = false;
let editingAppointmentId = null;

const adminForm = document.querySelector("#adminForm");
const adminPinInput = document.querySelector("#adminPinInput");
const adminDateInput = document.querySelector("#adminDateInput");
const adminStatusFilter = document.querySelector("#adminStatusFilter");
const adminSearchInput = document.querySelector("#adminSearchInput");
const adminStats = document.querySelector("#adminStats");
const adminWeekPanel = document.querySelector("#adminWeekPanel");
const adminMessage = document.querySelector("#adminMessage");
const adminLockButton = document.querySelector("#adminLockButton");
const adminExportButton = document.querySelector("#adminExportButton");
const adminBackupButton = document.querySelector("#adminBackupButton");
const adminStatus = document.querySelector("#adminStatus");
const adminMonitorPanel = document.querySelector("#adminMonitorPanel");
const adminAuditList = document.querySelector("#adminAuditList");
const appointmentsList = document.querySelector("#appointmentsList");
const adminEditPanel = document.querySelector("#adminEditPanel");
const adminRescheduleForm = document.querySelector("#adminRescheduleForm");
const cancelEditButton = document.querySelector("#cancelEditButton");
const editClientName = document.querySelector("#editClientName");
const editClientPhone = document.querySelector("#editClientPhone");
const editServiceSelect = document.querySelector("#editServiceSelect");
const editProfessionalSelect = document.querySelector("#editProfessionalSelect");
const editPaymentSelect = document.querySelector("#editPaymentSelect");
const editDateInput = document.querySelector("#editDateInput");
const editTimeSelect = document.querySelector("#editTimeSelect");
const editNotesInput = document.querySelector("#editNotesInput");
const BUSINESS_TIME_ZONE = "America/Sao_Paulo";
const DEPOSIT_RATE = 0.2;

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function api(path, options = {}) {
  const { headers = {}, ...fetchOptions } = options;
  const response = await fetch(path, {
    credentials: "include",
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
  if (!adminMessage) {
    alert(message);
    return;
  }

  adminMessage.textContent = message;
  adminMessage.hidden = false;
  clearTimeout(showMessage.timeoutId);
  showMessage.timeoutId = setTimeout(() => {
    adminMessage.hidden = true;
  }, 5200);
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

function actionLabel(action) {
  const labels = {
    admin_backup_export: "Backup exportado",
    admin_csv_export: "CSV exportado",
    admin_login: "Login administrativo",
    admin_logout: "Painel bloqueado",
    appointment_cancelled: "Agendamento desmarcado",
    appointment_completed: "Agendamento concluído",
    appointment_confirmed: "Agendamento confirmado",
    appointment_created: "Novo pedido recebido",
    appointment_deleted: "Agendamento removido",
    appointment_rescheduled: "Agendamento remarcado",
    notification_failed: "Notificação falhou",
    notification_sent: "Notificação enviada",
    review_created: "Nova avaliação",
  };
  return labels[action] || action;
}

function normalizeStatus(status) {
  return status === "agendado" ? "pendente" : status;
}

function appointmentValue(appointment) {
  return appointment.service?.price || 0;
}

function appointmentDeposit(appointment) {
  return appointmentValue(appointment) * DEPOSIT_RATE;
}

function addDays(date, amount) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + amount);
  return next.toISOString().slice(0, 10);
}

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function appointmentMatchesSearch(appointment, term) {
  if (!term) return true;
  const digits = term.replace(/\D/g, "");
  const text = normalizeSearch(`${appointment.client} ${appointment.phone} ${appointment.service?.name || ""}`);
  return text.includes(term) || (digits && String(appointment.phone || "").replace(/\D/g, "").includes(digits));
}

function updateAdminStatus(message) {
  adminStatus.textContent =
    message || (adminAuthenticated ? "Painel administrativo liberado neste navegador." : "Digite a senha para abrir a agenda completa.");
  adminPinInput.value = adminAuthenticated ? "********" : "";
}

function renderMonitor(data) {
  if (!adminAuthenticated || !data) {
    adminMonitorPanel.innerHTML = "";
    return;
  }

  adminMonitorPanel.innerHTML = `
    <article>
      <span>Banco</span>
      <strong>${escapeHtml(data.storage === "supabase" ? "Supabase ativo" : "Arquivo local")}</strong>
    </article>
    <article>
      <span>Hoje</span>
      <strong>${escapeHtml(String(data.todayAppointments))} atendimento${data.todayAppointments === 1 ? "" : "s"}</strong>
    </article>
    <article>
      <span>Pendências</span>
      <strong>${escapeHtml(String(data.pendingAppointments))} pedido${data.pendingAppointments === 1 ? "" : "s"}</strong>
    </article>
    <article>
      <span>Auditoria</span>
      <strong>${data.auditAvailable ? "Ativa" : "Pendente no Supabase"}</strong>
    </article>
    <article>
      <span>Notificação</span>
      <strong>${data.notificationsConfigured ? "Webhook ativo" : "Configurar webhook"}</strong>
    </article>
    <article>
      <span>Backup</span>
      <strong>${data.storage === "supabase" ? "Exportação segura" : "Somente local"}</strong>
    </article>
  `;
}

function renderAudit(logs) {
  if (!adminAuthenticated) {
    adminAuditList.innerHTML = '<div class="empty-state">Abra o painel para ver a auditoria.</div>';
    return;
  }

  if (!logs.length) {
    adminAuditList.innerHTML = '<div class="empty-state">Nenhum evento de auditoria registrado ainda.</div>';
    return;
  }

  adminAuditList.innerHTML = logs
    .map(
      (log) => `
        <article class="audit-item">
          <strong>${escapeHtml(actionLabel(log.action))}</strong>
          <span>${escapeHtml(new Date(log.createdAt).toLocaleString("pt-BR"))}</span>
          <p>${escapeHtml(log.summary || "")}</p>
        </article>
      `,
    )
    .join("");
}

async function loadMonitor() {
  if (!adminAuthenticated) {
    renderMonitor(null);
    return;
  }

  try {
    renderMonitor(await api("/api/admin/monitor"));
  } catch (error) {
    adminMonitorPanel.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

async function loadAudit() {
  if (!adminAuthenticated) {
    renderAudit([]);
    return;
  }

  try {
    const data = await api("/api/admin/audit");
    renderAudit(data.logs || []);
  } catch (error) {
    adminAuditList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

function renderOptions() {
  editServiceSelect.innerHTML = services
    .map((service) => `<option value="${service.id}">${escapeHtml(service.name)} - ${service.duration} min - ${money(service.price)}</option>`)
    .join("");
  editProfessionalSelect.innerHTML = professionals.map((professional) => `<option>${escapeHtml(professional)}</option>`).join("");
  editPaymentSelect.innerHTML = paymentMethods.map((payment) => `<option>${escapeHtml(payment)}</option>`).join("");
}

function renderAdminStats(items, selectedDate) {
  if (!adminAuthenticated) {
    adminStats.innerHTML = "";
    return;
  }

  const active = items.filter((appointment) => normalizeStatus(appointment.status) !== "cancelado");
  const pending = items.filter((appointment) => normalizeStatus(appointment.status) === "pendente");
  const confirmed = items.filter((appointment) => normalizeStatus(appointment.status) === "confirmado");
  const completed = items.filter((appointment) => normalizeStatus(appointment.status) === "concluido");
  const canceled = items.filter((appointment) => normalizeStatus(appointment.status) === "cancelado");
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

function renderWeekPanel(selectedDate) {
  if (!adminAuthenticated) {
    adminWeekPanel.innerHTML = "";
    return;
  }

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(selectedDate, index);
    const dayAppointments = appointments.filter(
      (appointment) => appointment.date === date && normalizeStatus(appointment.status) !== "cancelado",
    );
    const pending = dayAppointments.filter((appointment) => normalizeStatus(appointment.status) === "pendente").length;
    const revenue = dayAppointments.reduce((sum, appointment) => sum + appointmentValue(appointment), 0);
    return { date, total: dayAppointments.length, pending, revenue };
  });

  adminWeekPanel.innerHTML = `
    <div class="section-heading compact">
      <p class="eyebrow">Próximos dias</p>
      <h2>Resumo da semana</h2>
    </div>
    <div class="week-grid">
      ${days
        .map(
          (day) => `
            <button class="week-card ${day.date === selectedDate ? "selected" : ""}" type="button" data-week-date="${day.date}" aria-pressed="${day.date === selectedDate}">
              <span>${formatDate(day.date)}</span>
              <strong>${day.total} atendimento${day.total === 1 ? "" : "s"}</strong>
              <small>${day.pending} pendente${day.pending === 1 ? "" : "s"} | ${money(day.revenue)}</small>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function selectWeekDate(date) {
  adminDateInput.value = date;
  renderAppointments();
  appointmentsList.scrollIntoView({ behavior: "smooth", block: "start" });
}

function visibleAppointments() {
  const selectedAdminDate = adminDateInput.value || todayBusinessISO();
  const selectedStatus = adminStatusFilter.value || "todos";
  const searchTerm = normalizeSearch(adminSearchInput?.value || "");
  return appointments
    .filter(
      (appointment) =>
        appointment.date === selectedAdminDate &&
        (selectedStatus === "todos" || normalizeStatus(appointment.status) === selectedStatus) &&
        appointmentMatchesSearch(appointment, searchTerm),
    )
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function buildClientWhatsAppUrl(appointment, mode = "contact") {
  const digits = String(appointment.phone || "").replace(/\D/g, "");
  const serviceName = appointment.service?.name || "seu atendimento";
  const messages = {
    confirm: [
      `Olá, ${appointment.client}!`,
      `Seu horário no Sarah Neves Beauty Studio foi confirmado para ${formatDate(appointment.date)} às ${appointment.time}.`,
      `Serviço: ${serviceName}.`,
      `Sinal de 20% para reservar: ${money(appointmentDeposit(appointment))}.`,
      `Restante no atendimento: ${money(appointmentValue(appointment) - appointmentDeposit(appointment))}.`,
      "Qualquer imprevisto, me avise por aqui.",
    ],
    contact: [
      `Olá, ${appointment.client}!`,
      `Estou entrando em contato sobre seu agendamento de ${serviceName} no dia ${formatDate(appointment.date)} às ${appointment.time}.`,
      `O sinal de 20% desse procedimento fica em ${money(appointmentDeposit(appointment))}.`,
    ],
  };
  return `https://wa.me/55${digits}?text=${encodeURIComponent((messages[mode] || messages.contact).join("\n"))}`;
}

function renderAppointments() {
  if (!adminAuthenticated) {
    appointments = [];
    renderAdminStats([], adminDateInput.value || todayBusinessISO());
    renderWeekPanel(adminDateInput.value || todayBusinessISO());
    appointmentsList.innerHTML = '<div class="empty-state">Digite a senha administrativa para ver a agenda completa.</div>';
    return;
  }

  const selectedAdminDate = adminDateInput.value || todayBusinessISO();
  const sorted = visibleAppointments();
  renderAdminStats(sorted, selectedAdminDate);
  renderWeekPanel(selectedAdminDate);

  if (!sorted.length) {
    const hasSearch = Boolean((adminSearchInput?.value || "").trim());
    appointmentsList.innerHTML = `<div class="empty-state">${
      hasSearch
        ? `Nenhum agendamento encontrado para essa busca em ${formatDate(selectedAdminDate)}.`
        : `Nenhum agendamento registrado para ${formatDate(selectedAdminDate)}.`
    }</div>`;
    return;
  }

  appointmentsList.innerHTML = sorted
    .map(
      (appointment) => `
        <article class="appointment-card">
          <div class="appointment-time">${escapeHtml(appointment.time)}</div>
          <div>
            <h3>${escapeHtml(appointment.client)}</h3>
            <p>${escapeHtml(appointment.service?.name || "Serviço")} com ${escapeHtml(appointment.professional)} em ${formatDate(appointment.date)}</p>
            <p>${escapeHtml(appointment.phone)} | ${escapeHtml(appointment.paymentMethod)} | ${money(appointment.service?.price)} | sinal ${money(appointmentDeposit(appointment))} | ${appointment.service?.duration || ""} min</p>
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
}

async function loadAppointments() {
  if (!adminAuthenticated) {
    renderAppointments();
    return;
  }

  appointments = await api("/api/appointments");
  renderAppointments();
  await Promise.all([loadMonitor(), loadAudit()]);
}

async function loadEditAvailability() {
  if (!editDateInput.value || !editProfessionalSelect.value || !editServiceSelect.value) return;
  const params = new URLSearchParams({
    date: editDateInput.value,
    professional: editProfessionalSelect.value,
    serviceId: editServiceSelect.value,
    excludeId: editingAppointmentId || "",
  });
  const availability = await api(`/api/availability?${params.toString()}`);
  editTimeSelect.innerHTML = availability.times.length
    ? ['<option value="">Selecione o horário</option>', ...availability.times.map((time) => `<option>${time}</option>`)].join("")
    : '<option value="">Não há horário disponível para esse serviço nesta data</option>';
}

async function openEditPanel(appointment) {
  editingAppointmentId = appointment.id;
  editClientName.value = appointment.client;
  editClientPhone.value = appointment.phone;
  editServiceSelect.value = appointment.serviceId;
  editProfessionalSelect.value = appointment.professional;
  editPaymentSelect.value = appointment.paymentMethod;
  editDateInput.value = appointment.date;
  editNotesInput.value = appointment.notes || "";
  adminEditPanel.hidden = false;
  await loadEditAvailability();
  editTimeSelect.value = appointment.time;
  adminEditPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeEditPanel() {
  editingAppointmentId = null;
  adminEditPanel.hidden = true;
  adminRescheduleForm.reset();
}

appointmentsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const appointment = appointments.find((item) => item.id === id);
  if (!appointment) return;

  if (button.dataset.action === "reschedule") {
    await openEditPanel(appointment);
    return;
  }

  const actions = {
    cancel: ["cancel", "Agendamento desmarcado com sucesso."],
    confirm: ["confirm", "Agendamento confirmado no painel."],
    complete: ["complete", "Agendamento marcado como concluído."],
  };
  const action = actions[button.dataset.action];
  if (!action) return;

  try {
    await api(`/api/appointments/${id}/${action[0]}`, { method: "PATCH" });
    showMessage(action[1]);
    await loadAppointments();
    await loadEditAvailability();
  } catch (error) {
    showMessage(error.message);
  }
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
      body: JSON.stringify({ password }),
    });
    adminAuthenticated = true;
    await loadAppointments();
    updateAdminStatus();
  } catch (error) {
    adminAuthenticated = false;
    appointments = [];
    closeEditPanel();
    renderAppointments();
    updateAdminStatus(error.message === "Senha administrativa inválida." ? "Senha administrativa inválida. Confira a senha do salão." : error.message);
  }
});

adminLockButton.addEventListener("click", async () => {
  adminAuthenticated = false;
  appointments = [];
  closeEditPanel();
  try {
    await api("/api/admin/logout", { method: "POST" });
  } catch {
    // The UI should still lock even if the logout request cannot complete.
  }
  renderAppointments();
  renderMonitor(null);
  renderAudit([]);
  updateAdminStatus("Painel bloqueado neste navegador.");
});

adminExportButton.addEventListener("click", () => {
  if (!adminAuthenticated) {
    updateAdminStatus("Abra o painel antes de exportar a agenda.");
    return;
  }

  window.location.href = "/api/admin/export";
});

adminBackupButton.addEventListener("click", () => {
  if (!adminAuthenticated) {
    updateAdminStatus("Abra o painel antes de exportar o backup.");
    return;
  }

  window.location.href = "/api/admin/backup";
});

adminStatusFilter.addEventListener("change", renderAppointments);
adminDateInput.addEventListener("change", renderAppointments);
adminSearchInput.addEventListener("input", renderAppointments);
adminWeekPanel.addEventListener("click", (event) => {
  const dayButton = event.target.closest("button[data-week-date]");
  if (!dayButton) return;
  selectWeekDate(dayButton.dataset.weekDate);
});
cancelEditButton.addEventListener("click", closeEditPanel);

[editServiceSelect, editProfessionalSelect, editDateInput].forEach((element) => {
  element.addEventListener("change", loadEditAvailability);
});

adminRescheduleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!editingAppointmentId) return;

  try {
    await api(`/api/appointments/${editingAppointmentId}/reschedule`, {
      method: "PATCH",
      body: JSON.stringify({
        client: editClientName.value.trim(),
        phone: editClientPhone.value.trim(),
        serviceId: Number(editServiceSelect.value),
        professional: editProfessionalSelect.value,
        paymentMethod: editPaymentSelect.value,
        date: editDateInput.value,
        time: editTimeSelect.value,
        notes: editNotesInput.value.trim(),
      }),
    });
    showMessage("Agendamento remarcado com sucesso.");
    closeEditPanel();
    await loadAppointments();
  } catch (error) {
    showMessage(error.message);
  }
});

async function init() {
  const today = todayBusinessISO();
  adminDateInput.value = today;
  editDateInput.min = today;

  try {
    services = await api("/api/services");
    professionals = await api("/api/professionals");
    paymentMethods = await api("/api/payment-methods");
    renderOptions();
    const session = await api("/api/admin/session");
    adminAuthenticated = Boolean(session.authenticated);
    updateAdminStatus();
    await loadAppointments();
  } catch (error) {
    updateAdminStatus(`Erro ao iniciar o painel: ${error.message}`);
  }
}

init();
