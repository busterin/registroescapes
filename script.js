const AUTH_REMEMBER_KEY = "registroescapes.auth.remember.v1";
const API_ENDPOINT = "api/records.php";
const API_LOGIN_ENDPOINT = "api/login.php";
const API_SESSION_ENDPOINT = "api/session.php";
const LOCAL_AUTH_SESSION_KEY = "registroescapes.auth.local.ok.v1";
const LOCAL_RECORDS_KEY = "registroescapes.records.local.v1";
const LOCAL_PASSWORD_HASH = "9d52ba92196b776a74185722f763a61a3be138d67239c1272e1e86fe4ed0edf9";
const USE_BACKEND = !window.location.hostname.endsWith("github.io");
const CATEGORY_PRICES_BASE = Object.freeze({
  "2a5p": 85,
  "6p": 100,
  "7p": 120,
  "2a6(filo)": 75,
  "7a12(filo)": 120,
  guiado: 120,
  merienda: 170,
});
const CATEGORY_PRICES_AGENCY = Object.freeze({
  "2a5p": 70,
  "6p": 82,
  "7p": 99,
  "2a6(filo)": 62,
  "7a12(filo)": 99,
});

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

const state = {
  records: [],
  editingId: null,
  isBooted: false,
  toastTimer: null,
};

const els = {
  authGate: document.getElementById("auth-gate"),
  appRoot: document.getElementById("app-root"),
  authForm: document.getElementById("auth-form"),
  authPassword: document.getElementById("auth-password"),
  authTogglePassword: document.getElementById("auth-toggle-password"),
  authRemember: document.getElementById("auth-remember"),
  authError: document.getElementById("auth-error"),
  appToast: document.getElementById("app-toast"),

  tabs: document.querySelectorAll(".tab-btn"),
  panels: document.querySelectorAll(".panel"),

  form: document.getElementById("registro-form"),
  sala: document.getElementById("sala"),
  mes: document.getElementById("mes"),
  anio: document.getElementById("anio"),
  categoria: document.getElementById("categoria"),
  sesiones: document.getElementById("sesiones"),
  checkNocturna: document.getElementById("check-nocturna"),
  checkEscapeUp: document.getElementById("check-escapeup"),
  checkAgencia: document.getElementById("check-agencia"),

  filtroRegistroMes: document.getElementById("filtro-registro-mes"),
  filtroRegistroAnio: document.getElementById("filtro-registro-anio"),
  registrosBody: document.getElementById("registros-body"),
  registrosEmpty: document.getElementById("registros-empty"),
  registrosTotal: document.getElementById("registros-total"),

  sesionesModo: document.getElementById("sesiones-modo"),
  sesionesMes: document.getElementById("sesiones-mes"),
  sesionesAnio: document.getElementById("sesiones-anio"),
  totalGlobal: document.getElementById("total-global"),
  sesionesFrankie: document.getElementById("sesiones-frankie"),
  sesionesMagia: document.getElementById("sesiones-magia"),
  sesionesFilosofal: document.getElementById("sesiones-filosofal"),
  sesionesVampiro: document.getElementById("sesiones-vampiro"),

  compAModo: document.getElementById("comp-a-modo"),
  compAMes: document.getElementById("comp-a-mes"),
  compAAnio: document.getElementById("comp-a-anio"),
  compBModo: document.getElementById("comp-b-modo"),
  compBMes: document.getElementById("comp-b-mes"),
  compBAnio: document.getElementById("comp-b-anio"),
  compSala: document.getElementById("comp-sala"),
  pieChartSessions: document.getElementById("pie-chart-sessions"),
  pieChartBilling: document.getElementById("pie-chart-billing"),
  compareMeta: document.getElementById("compare-meta"),
};

init();

async function init() {
  bindAuthEvents();
  els.authRemember.checked = localStorage.getItem(AUTH_REMEMBER_KEY) === "1";

  const loggedIn = await isAuthenticated();
  if (loggedIn) {
    unlockApp();
    await bootApp();
    return;
  }

  lockApp();
}

async function bootApp() {
  if (state.isBooted) return;
  state.isBooted = true;

  bindTabs();
  fillMonthSelects([
    els.mes,
    els.filtroRegistroMes,
    els.sesionesMes,
    els.compAMes,
    els.compBMes,
  ]);
  fillYearSelects();
  setDefaultFilters();
  bindEvents();
  resetFormMode();
  await refreshRecords();
}

function bindAuthEvents() {
  els.authForm.addEventListener("submit", handleAuthSubmit);
  els.authTogglePassword.addEventListener("click", toggleAuthPassword);
}

function toggleAuthPassword() {
  const isHidden = els.authPassword.type === "password";
  els.authPassword.type = isHidden ? "text" : "password";
  els.authTogglePassword.setAttribute(
    "aria-label",
    isHidden ? "Ocultar contraseña" : "Mostrar contraseña"
  );
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  els.authError.classList.add("hidden");

  if (!USE_BACKEND) {
    const hash = await sha256Hex(els.authPassword.value);
    if (!safeEqual(hash, LOCAL_PASSWORD_HASH)) {
      els.authError.classList.remove("hidden");
      return;
    }

    localStorage.setItem(LOCAL_AUTH_SESSION_KEY, "1");
    if (els.authRemember.checked) {
      localStorage.setItem(AUTH_REMEMBER_KEY, "1");
    } else {
      localStorage.removeItem(AUTH_REMEMBER_KEY);
    }

    els.authPassword.value = "";
    unlockApp();
    await bootApp();
    return;
  }

  try {
    await apiLogin(els.authPassword.value, els.authRemember.checked);

    if (els.authRemember.checked) {
      localStorage.setItem(AUTH_REMEMBER_KEY, "1");
    } else {
      localStorage.removeItem(AUTH_REMEMBER_KEY);
    }

    els.authPassword.value = "";
    unlockApp();
    await bootApp();
  } catch {
    els.authError.classList.remove("hidden");
  }
}

async function isAuthenticated() {
  if (!USE_BACKEND) {
    return localStorage.getItem(LOCAL_AUTH_SESSION_KEY) === "1";
  }

  try {
    const data = await apiRequest("GET", null, API_SESSION_ENDPOINT);
    return data.authenticated === true;
  } catch {
    return false;
  }
}

function lockApp() {
  els.authGate.classList.remove("hidden");
  els.appRoot.classList.add("hidden");
}

function unlockApp() {
  els.authGate.classList.add("hidden");
  els.appRoot.classList.remove("hidden");
}

function bindTabs() {
  els.tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.section;
      els.tabs.forEach((b) => b.classList.toggle("active", b === btn));
      els.panels.forEach((panel) => {
        panel.classList.toggle("active", panel.id === target);
      });
    });
  });
}

function bindEvents() {
  els.form.addEventListener("submit", handleSubmit);
  els.registrosBody.addEventListener("click", handleRegistroAction);

  [els.filtroRegistroMes, els.filtroRegistroAnio].forEach((el) => {
    el.addEventListener("change", () => {
      syncRegistroYearFilterState();
      renderRegistroList();
    });
  });

  [els.sesionesModo, els.sesionesMes, els.sesionesAnio].forEach((el) => {
    el.addEventListener("change", () => {
      toggleMonthIfYear(els.sesionesModo, els.sesionesMes);
      renderSesiones();
    });
  });

  [
    els.compAModo,
    els.compAMes,
    els.compAAnio,
    els.compBModo,
    els.compBMes,
    els.compBAnio,
    els.compSala,
  ].forEach((el) => {
    el.addEventListener("change", () => {
      toggleMonthIfYear(els.compAModo, els.compAMes);
      toggleMonthIfYear(els.compBModo, els.compBMes);
      renderComparativa();
    });
  });
}

async function handleSubmit(e) {
  e.preventDefault();

  const payload = {
    room: els.sala.value,
    month: Number(els.mes.value),
    year: Number(els.anio.value),
    category: els.categoria.value,
    sessions: Number(els.sesiones.value),
    nightSession: els.checkNocturna.checked,
    escapeUp: els.checkEscapeUp.checked,
    agency: els.checkAgencia.checked,
  };

  try {
    if (state.editingId) {
      await apiUpdateRecord(state.editingId, payload);
      resetFormMode();
      showToast("Registro actualizado correctamente");
    } else {
      await apiCreateRecord(payload);
      els.sesiones.value = "";
      els.checkNocturna.checked = false;
      els.checkEscapeUp.checked = false;
      els.checkAgencia.checked = false;
      showToast("Registro añadido correctamente");
    }

    await refreshRecords();
  } catch (error) {
    notifyApiError(error);
  }
}

async function handleRegistroAction(e) {
  const button = e.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  if (!id) return;

  if (action === "delete") {
    const ok = window.confirm("¿Eliminar este registro?");
    if (!ok) return;

    try {
      await apiDeleteRecord(id);
      if (state.editingId === id) resetFormMode();
      await refreshRecords();
      showToast("Registro eliminado");
    } catch (error) {
      notifyApiError(error);
    }
    return;
  }

  if (action === "edit") {
    const record = state.records.find((r) => r.id === id);
    if (!record) return;

    els.sala.value = record.room;
    els.mes.value = String(record.month);
    els.anio.value = String(record.year);
    els.categoria.value = record.category;
    els.sesiones.value = String(record.sessions);
    els.checkNocturna.checked = record.nightSession === true;
    els.checkEscapeUp.checked = record.escapeUp === true;
    els.checkAgencia.checked = record.agency === true;

    state.editingId = id;
    setSubmitLabel("Actualizar registro");

    document.getElementById("registro").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function setSubmitLabel(text) {
  const submitButton = els.form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.textContent = text;
}

function resetFormMode() {
  state.editingId = null;
  setSubmitLabel("Guardar registro");
}

async function refreshRecords() {
  const rows = await apiListRecords();
  state.records = rows.map(normalizeRecord);
  refreshYearSelectsWithData();
  renderAll();
}

function normalizeRecord(r) {
  return {
    id: String(r.id),
    room: String(r.sala ?? r.room ?? ""),
    category: String(r.categoria ?? r.category ?? ""),
    month: Number(r.mes ?? r.month ?? 0),
    year: Number(r.anio ?? r.year ?? 0),
    sessions: Number(r.sesiones ?? r.sessions ?? 0),
    nightSession: toBoolFlag(r.nocturna ?? r.nightSession ?? false),
    escapeUp: toBoolFlag(r.escape_up ?? r.escapeUp ?? false),
    agency: toBoolFlag(r.agencia ?? r.agency ?? false),
    createdAt: String(r.created_at ?? r.createdAt ?? new Date().toISOString()),
  };
}

async function apiListRecords() {
  if (!USE_BACKEND) {
    return localListRecords();
  }
  const data = await apiRequest("GET");
  return Array.isArray(data.records) ? data.records : [];
}

async function apiCreateRecord(payload) {
  if (!USE_BACKEND) {
    localCreateRecord(payload);
    return;
  }
  await apiRequest("POST", payload);
}

async function apiUpdateRecord(id, payload) {
  if (!USE_BACKEND) {
    localUpdateRecord(id, payload);
    return;
  }
  await apiRequest("PUT", { id: Number(id), ...payload });
}

async function apiDeleteRecord(id) {
  if (!USE_BACKEND) {
    localDeleteRecord(id);
    return;
  }
  await apiRequest("DELETE", { id: Number(id) });
}

async function apiLogin(password, remember) {
  await apiRequest("POST", { password, remember }, API_LOGIN_ENDPOINT);
}

async function apiRequest(method, body, endpoint = API_ENDPOINT) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "same-origin",
    cache: "no-store",
  };

  if (method !== "GET") {
    options.body = JSON.stringify(body || {});
  }

  const response = await fetch(endpoint, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    if (response.status === 401) {
      lockApp();
    }
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}

function notifyApiError(error) {
  console.error(error);
  alert(`Error de servidor: ${error.message}`);
}

function showToast(message) {
  if (!els.appToast) return;

  els.appToast.textContent = message;
  els.appToast.classList.remove("hidden");

  if (state.toastTimer) {
    clearTimeout(state.toastTimer);
  }

  state.toastTimer = setTimeout(() => {
    els.appToast.classList.add("hidden");
    state.toastTimer = null;
  }, 1800);
}

function localListRecords() {
  const raw = localStorage.getItem(LOCAL_RECORDS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function localSaveRecords(records) {
  localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(records));
}

function localCreateRecord(payload) {
  const records = localListRecords();
  records.unshift({
    id: createLocalId(),
    sala: payload.room,
    categoria: payload.category,
    mes: payload.month,
    anio: payload.year,
    sesiones: payload.sessions,
    nocturna: payload.nightSession ? 1 : 0,
    escape_up: payload.escapeUp ? 1 : 0,
    agencia: payload.agency ? 1 : 0,
    created_at: new Date().toISOString(),
  });
  localSaveRecords(records);
}

function localUpdateRecord(id, payload) {
  const records = localListRecords();
  const updated = records.map((r) =>
    String(r.id) === String(id)
      ? {
          ...r,
          sala: payload.room,
          categoria: payload.category,
          mes: payload.month,
          anio: payload.year,
          sesiones: payload.sessions,
          nocturna: payload.nightSession ? 1 : 0,
          escape_up: payload.escapeUp ? 1 : 0,
          agencia: payload.agency ? 1 : 0,
        }
      : r
  );
  localSaveRecords(updated);
}

function localDeleteRecord(id) {
  const records = localListRecords().filter((r) => String(r.id) !== String(id));
  localSaveRecords(records);
}

function createLocalId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function fillMonthSelects(selects) {
  selects.forEach((select) => {
    select.innerHTML = MONTHS.map(
      (name, i) => `<option value="${i + 1}">${name}</option>`
    ).join("");
  });
}

function getYearOptions() {
  const years = new Set([currentYear, currentYear - 1, currentYear + 1]);
  state.records.forEach((r) => years.add(Number(r.year)));
  return [...years].sort((a, b) => a - b);
}

function fillYearSelects() {
  const yearOptions = getYearOptions();
  const selects = [
    els.anio,
    els.filtroRegistroAnio,
    els.sesionesAnio,
    els.compAAnio,
    els.compBAnio,
  ];

  selects.forEach((select) => {
    select.innerHTML = yearOptions
      .map((year) => `<option value="${year}">${year}</option>`)
      .join("");
  });
}

function refreshYearSelectsWithData() {
  const previous = {
    anio: els.anio.value,
    filtroRegistroAnio: els.filtroRegistroAnio.value,
    sesionesAnio: els.sesionesAnio.value,
    compAAnio: els.compAAnio.value,
    compBAnio: els.compBAnio.value,
  };

  fillYearSelects();

  Object.entries(previous).forEach(([key, value]) => {
    if (els[key] && value) els[key].value = value;
  });
}

function setDefaultFilters() {
  els.mes.value = String(currentMonth);
  els.anio.value = String(currentYear);

  els.filtroRegistroMes.value = String(currentMonth);
  els.filtroRegistroAnio.value = String(currentYear);

  els.sesionesModo.value = "mes";
  els.sesionesMes.value = String(currentMonth);
  els.sesionesAnio.value = String(currentYear);

  els.compAModo.value = "mes";
  els.compAMes.value = String(currentMonth);
  els.compAAnio.value = String(currentYear - 1);

  els.compBModo.value = "mes";
  els.compBMes.value = String(currentMonth);
  els.compBAnio.value = String(currentYear);

  toggleMonthIfYear(els.sesionesModo, els.sesionesMes);
  toggleMonthIfYear(els.compAModo, els.compAMes);
  toggleMonthIfYear(els.compBModo, els.compBMes);

  // Opcion especial solo para el listado de "Ultimos registros"
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "Todos los registros";
  els.filtroRegistroMes.prepend(allOption);
  syncRegistroYearFilterState();
}

function syncRegistroYearFilterState() {
  const isAll = els.filtroRegistroMes.value === "all";
  els.filtroRegistroAnio.disabled = isAll;
}

function toggleMonthIfYear(modeSelect, monthSelect) {
  monthSelect.disabled = modeSelect.value === "anio";
}

function renderAll() {
  renderRegistroList();
  renderSesiones();
  renderComparativa();
}

function filterByPeriod(records, mode, month, year) {
  return records.filter((r) => {
    if (Number(r.year) !== Number(year)) return false;
    if (mode === "anio") return true;
    return Number(r.month) === Number(month);
  });
}

function renderRegistroList() {
  const monthValue = els.filtroRegistroMes.value;
  const year = Number(els.filtroRegistroAnio.value);

  const rows = state.records
    .filter((r) => {
      if (monthValue === "all") return true;
      return Number(r.month) === Number(monthValue) && Number(r.year) === year;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  els.registrosBody.innerHTML = rows
    .map(
      (r) => `
      <tr>
        <td>${formatRecordPeriod(r)}</td>
        <td><span class="room-tag ${roomClassName(r.room)}">${displayRoomName(r.room)}</span></td>
        <td>${r.category}</td>
        <td>${formatCurrency(appliedUnitPrice(r))} / sesión${toBoolFlag(r.escapeUp) ? " (-12%)" : ""}</td>
        <td>${r.sessions}</td>
        <td>${formatCurrency(recordBilling(r))}</td>
        <td>
          <div class="row-actions">
            <button type="button" class="btn-row" data-action="edit" data-id="${r.id}">Editar</button>
            <button type="button" class="btn-row btn-row-danger" data-action="delete" data-id="${r.id}">Eliminar</button>
          </div>
        </td>
      </tr>`
    )
    .join("");

  els.registrosEmpty.classList.toggle("hidden", rows.length > 0);
  const totalBilling = rows.reduce((acc, r) => acc + recordBilling(r), 0);
  const filterText =
    monthValue === "all"
      ? "todos los registros"
      : `${MONTHS[Number(monthValue) - 1]} ${year}`;
  els.registrosTotal.textContent = `Facturación total (${filterText}): ${formatCurrency(totalBilling)}`;
}

function roomClassName(room) {
  if (room === "Frankie") return "room-frankie";
  if (room === "Magia") return "room-magia";
  if (room === "Filosofal") return "room-filosofal";
  if (room === "El regreso del vampiro") return "room-vampiro";
  return "";
}

function displayRoomName(room) {
  if (room === "El regreso del vampiro") return "Vampiro";
  return room;
}

function renderSesiones() {
  const mode = els.sesionesModo.value;
  const month = Number(els.sesionesMes.value);
  const year = Number(els.sesionesAnio.value);
  const filtered = filterByPeriod(state.records, mode, month, year);

  const totalGlobal = filtered.reduce((acc, r) => acc + Number(r.sessions), 0);
  const totalBilling = filtered.reduce((acc, r) => acc + recordBilling(r), 0);
  const periodText =
    mode === "anio" ? `Año ${year}` : `${MONTHS[month - 1]} ${year}`;

  els.totalGlobal.innerHTML = `Total global (${periodText}): ${totalGlobal} sesiones<br>Facturación global: ${formatCurrency(totalBilling)}`;

  renderRoomBreakdown(els.sesionesFrankie, filtered, "Frankie");
  renderRoomBreakdown(els.sesionesMagia, filtered, "Magia");
  renderRoomBreakdown(els.sesionesFilosofal, filtered, "Filosofal");
  renderRoomBreakdown(els.sesionesVampiro, filtered, "El regreso del vampiro");
}

function renderRoomBreakdown(container, records, room) {
  const roomRows = records.filter((r) => r.room === room);

  if (!roomRows.length) {
    container.innerHTML = '<p class="empty">Sin datos para este periodo.</p>';
    return;
  }

  const byCategory = new Map();
  roomRows.forEach((r) => {
    const prev = byCategory.get(r.category) || { sessions: 0, billing: 0 };
    byCategory.set(r.category, {
      sessions: prev.sessions + Number(r.sessions),
      billing: prev.billing + recordBilling(r),
    });
  });

  const totalRoom = roomRows.reduce((acc, r) => acc + Number(r.sessions), 0);
  const totalRoomBilling = roomRows.reduce((acc, r) => acc + recordBilling(r), 0);
  const categoryRows = [...byCategory.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(
      ([category, totals]) => `
        <tr>
          <td>${category}</td>
          <td>${totals.sessions}</td>
          <td>${formatCurrency(totals.billing)}</td>
        </tr>`
    )
    .join("");

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Categoría</th>
            <th>Sesiones</th>
            <th>Facturación</th>
          </tr>
        </thead>
        <tbody>${categoryRows}</tbody>
      </table>
    </div>
    <p><strong>Total ${displayRoomName(room)}: ${totalRoom} sesiones | ${formatCurrency(totalRoomBilling)}</strong></p>
  `;
}

function renderComparativa() {
  const scopeRoom = els.compSala.value;

  const totalsA = getCompareTotals(
    els.compAModo.value,
    Number(els.compAMes.value),
    Number(els.compAAnio.value),
    scopeRoom
  );

  const totalsB = getCompareTotals(
    els.compBModo.value,
    Number(els.compBMes.value),
    Number(els.compBAnio.value),
    scopeRoom
  );

  const labelA = periodLabel(
    els.compAModo.value,
    Number(els.compAMes.value),
    Number(els.compAAnio.value)
  );
  const labelB = periodLabel(
    els.compBModo.value,
    Number(els.compBMes.value),
    Number(els.compBAnio.value)
  );

  const totalSessions = totalsA.sessions + totalsB.sessions;
  const totalBilling = totalsA.billing + totalsB.billing;

  drawPieChart(
    els.pieChartSessions,
    totalsA.sessions,
    totalsB.sessions,
    `${totalSessions} ses.`
  );
  drawPieChart(
    els.pieChartBilling,
    totalsA.billing,
    totalsB.billing,
    formatCurrency(totalBilling)
  );
  renderCompareMeta(labelA, labelB, totalsA, totalsB, scopeRoom);
}

function getCompareTotals(mode, month, year, roomScope) {
  let rows = filterByPeriod(state.records, mode, month, year);
  if (roomScope !== "Todas") {
    rows = rows.filter((r) => r.room === roomScope);
  }
  return {
    sessions: rows.reduce((acc, r) => acc + Number(r.sessions), 0),
    billing: rows.reduce((acc, r) => acc + recordBilling(r), 0),
  };
}

function periodLabel(mode, month, year) {
  return mode === "anio" ? `Año ${year}` : `${MONTHS[month - 1]} ${year}`;
}

function drawPieChart(canvas, a, b, centerText) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const radius = Math.min(width, height) * 0.27;
  const x = width / 2;
  const y = height / 2;
  const total = a + b;

  ctx.clearRect(0, 0, width, height);

  if (total <= 0) {
    ctx.fillStyle = "#8e8778";
    ctx.font = "16px Avenir Next";
    ctx.textAlign = "center";
    ctx.fillText("Sin datos para comparar", x, y);
    return;
  }

  const start = -Math.PI / 2;
  const angleA = (a / total) * Math.PI * 2;
  const pctA = (a / total) * 100;
  const pctB = (b / total) * 100;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, radius, start, start + angleA);
  ctx.closePath();
  ctx.fillStyle = "#b84e2f";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, radius, start + angleA, start + Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = "#3f6f5b";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();

  ctx.fillStyle = "#22201c";
  ctx.font = "700 18px Avenir Next";
  ctx.textAlign = "center";
  ctx.fillText(centerText, x, y + 6);

  drawPieLabel(ctx, x, y, radius, start + angleA / 2, `${pctA.toFixed(1)}%`, "#b84e2f");
  drawPieLabel(
    ctx,
    x,
    y,
    radius,
    start + angleA + (Math.PI * 2 - angleA) / 2,
    `${pctB.toFixed(1)}%`,
    "#3f6f5b"
  );
}

function drawPieLabel(ctx, centerX, centerY, radius, angle, text, color) {
  const lineStart = radius + 6;
  const lineEnd = radius + 14;
  const labelOffset = radius + 20;
  const margin = 14;

  const sx = centerX + Math.cos(angle) * lineStart;
  const sy = centerY + Math.sin(angle) * lineStart;
  const ex = centerX + Math.cos(angle) * lineEnd;
  const ey = centerY + Math.sin(angle) * lineEnd;
  const rawLx = centerX + Math.cos(angle) * labelOffset;
  const ly = centerY + Math.sin(angle) * labelOffset;
  const isRight = Math.cos(angle) >= 0;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  ctx.fillStyle = "#22201c";
  ctx.font = "700 13px Avenir Next";
  const textWidth = ctx.measureText(text).width;
  const minX = margin + (isRight ? 0 : textWidth);
  const maxX = ctx.canvas.width - margin - (isRight ? textWidth : 0);
  const lx = Math.min(Math.max(rawLx, minX), maxX);
  ctx.textAlign = isRight ? "left" : "right";
  ctx.fillText(text, lx, ly + 4);
}

function renderCompareMeta(labelA, labelB, totalsA, totalsB, roomScope) {
  const diffSessions = totalsB.sessions - totalsA.sessions;
  const trendSessions =
    diffSessions === 0 ? "Sin variación" : diffSessions > 0 ? `+${diffSessions}` : `${diffSessions}`;
  const totalSessions = totalsA.sessions + totalsB.sessions;
  const pctSessionsA = totalSessions > 0 ? ((totalsA.sessions / totalSessions) * 100).toFixed(1) : "0.0";
  const pctSessionsB = totalSessions > 0 ? ((totalsB.sessions / totalSessions) * 100).toFixed(1) : "0.0";

  const diffBilling = totalsB.billing - totalsA.billing;
  const trendBilling =
    diffBilling === 0
      ? "Sin variación"
      : diffBilling > 0
        ? `+${formatCurrency(diffBilling)}`
        : `${formatCurrency(diffBilling)}`;
  const totalBilling = totalsA.billing + totalsB.billing;
  const pctBillingA = totalBilling > 0 ? ((totalsA.billing / totalBilling) * 100).toFixed(1) : "0.0";
  const pctBillingB = totalBilling > 0 ? ((totalsB.billing / totalBilling) * 100).toFixed(1) : "0.0";

  els.compareMeta.innerHTML = `
    <div class="meta-item"><span class="dot" style="background:#b84e2f"></span><strong>${labelA}</strong> - Sesiones: ${totalsA.sessions} (${pctSessionsA}%) | Facturación: ${formatCurrency(totalsA.billing)} (${pctBillingA}%)</div>
    <div class="meta-item"><span class="dot" style="background:#3f6f5b"></span><strong>${labelB}</strong> - Sesiones: ${totalsB.sessions} (${pctSessionsB}%) | Facturación: ${formatCurrency(totalsB.billing)} (${pctBillingB}%)</div>
    <div class="meta-item"><strong>Sala:</strong> ${displayRoomName(roomScope)}</div>
    <div class="meta-item"><strong>Diferencia sesiones (B - A):</strong> ${trendSessions}</div>
    <div class="meta-item"><strong>Diferencia facturación (B - A):</strong> ${trendBilling}</div>
  `;
}

function normalizeCategory(category) {
  return String(category || "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

function toBoolFlag(value) {
  return value === true || value === 1 || value === "1";
}

function categoryPrice(category, isAgency) {
  const normalized = normalizeCategory(category);
  if (isAgency && CATEGORY_PRICES_AGENCY[normalized] != null) {
    return CATEGORY_PRICES_AGENCY[normalized];
  }
  return CATEGORY_PRICES_BASE[normalized] || 0;
}

function appliedUnitPrice(record) {
  const agency = toBoolFlag(record.agency);
  const nightSession = toBoolFlag(record.nightSession);
  let unit = categoryPrice(record.category, agency);
  if (nightSession) {
    unit += 20;
  }
  return unit;
}

function recordBilling(record) {
  const sessions = Number(record.sessions);
  const unit = appliedUnitPrice(record);
  const escapeUp = toBoolFlag(record.escapeUp);

  let total = sessions * unit;
  if (escapeUp) {
    total *= 0.88;
  }
  return Number(total.toFixed(2));
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRecordPeriod(record) {
  const month = Number(record.month);
  const year = Number(record.year);
  if (!Number.isFinite(month) || !Number.isFinite(year) || month < 1 || month > 12) {
    return "-";
  }
  return `${MONTHS[month - 1]} ${year}`;
}
