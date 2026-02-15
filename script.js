const STORAGE_KEY = "registroescapes.records.v1";

const ROOMS = ["Frankie", "Magia", "Filosofal"];
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
  records: loadRecords(),
};

const els = {
  tabs: document.querySelectorAll(".tab-btn"),
  panels: document.querySelectorAll(".panel"),

  form: document.getElementById("registro-form"),
  sala: document.getElementById("sala"),
  mes: document.getElementById("mes"),
  anio: document.getElementById("anio"),
  categoria: document.getElementById("categoria"),
  sesiones: document.getElementById("sesiones"),

  filtroRegistroMes: document.getElementById("filtro-registro-mes"),
  filtroRegistroAnio: document.getElementById("filtro-registro-anio"),
  registrosBody: document.getElementById("registros-body"),
  registrosEmpty: document.getElementById("registros-empty"),

  sesionesModo: document.getElementById("sesiones-modo"),
  sesionesMes: document.getElementById("sesiones-mes"),
  sesionesAnio: document.getElementById("sesiones-anio"),
  totalGlobal: document.getElementById("total-global"),
  sesionesFrankie: document.getElementById("sesiones-frankie"),
  sesionesMagia: document.getElementById("sesiones-magia"),
  sesionesFilosofal: document.getElementById("sesiones-filosofal"),

  compAModo: document.getElementById("comp-a-modo"),
  compAMes: document.getElementById("comp-a-mes"),
  compAAnio: document.getElementById("comp-a-anio"),
  compBModo: document.getElementById("comp-b-modo"),
  compBMes: document.getElementById("comp-b-mes"),
  compBAnio: document.getElementById("comp-b-anio"),
  compSala: document.getElementById("comp-sala"),
  pieChart: document.getElementById("pie-chart"),
  compareMeta: document.getElementById("compare-meta"),
};

init();

function init() {
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
  renderAll();
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

  [els.filtroRegistroMes, els.filtroRegistroAnio].forEach((el) => {
    el.addEventListener("change", renderRegistroList);
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

function handleSubmit(e) {
  e.preventDefault();

  const item = {
    id: crypto.randomUUID(),
    room: els.sala.value,
    month: Number(els.mes.value),
    year: Number(els.anio.value),
    category: els.categoria.value,
    sessions: Number(els.sesiones.value),
    createdAt: new Date().toISOString(),
  };

  state.records.push(item);
  saveRecords();
  refreshYearSelectsWithData();

  els.sesiones.value = "";

  renderAll();
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidRecord);
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
}

function isValidRecord(record) {
  return (
    record &&
    typeof record.room === "string" &&
    typeof record.category === "string" &&
    Number.isInteger(Number(record.month)) &&
    Number.isInteger(Number(record.year)) &&
    Number.isFinite(Number(record.sessions))
  );
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
    if (els[key] && value) {
      els[key].value = value;
    }
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
}

function toggleMonthIfYear(modeSelect, monthSelect) {
  const isYear = modeSelect.value === "anio";
  monthSelect.disabled = isYear;
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
  const month = Number(els.filtroRegistroMes.value);
  const year = Number(els.filtroRegistroAnio.value);

  const rows = state.records
    .filter((r) => Number(r.month) === month && Number(r.year) === year)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 30);

  els.registrosBody.innerHTML = rows
    .map(
      (r) => `
      <tr>
        <td>${formatDate(r.createdAt)}</td>
        <td>${r.room}</td>
        <td>${r.category}</td>
        <td>${r.sessions}</td>
      </tr>`
    )
    .join("");

  els.registrosEmpty.classList.toggle("hidden", rows.length > 0);
}

function renderSesiones() {
  const mode = els.sesionesModo.value;
  const month = Number(els.sesionesMes.value);
  const year = Number(els.sesionesAnio.value);
  const filtered = filterByPeriod(state.records, mode, month, year);

  const totalGlobal = filtered.reduce((acc, r) => acc + Number(r.sessions), 0);
  const periodText =
    mode === "anio"
      ? `Año ${year}`
      : `${MONTHS[month - 1]} ${year}`;

  els.totalGlobal.textContent = `Total global (${periodText}): ${totalGlobal} sesiones`;

  renderRoomBreakdown(els.sesionesFrankie, filtered, "Frankie");
  renderRoomBreakdown(els.sesionesMagia, filtered, "Magia");
  renderRoomBreakdown(els.sesionesFilosofal, filtered, "Filosofal");
}

function renderRoomBreakdown(container, records, room) {
  const roomRows = records.filter((r) => r.room === room);

  if (!roomRows.length) {
    container.innerHTML = "<p class=\"empty\">Sin datos para este periodo.</p>";
    return;
  }

  const byCategory = new Map();
  roomRows.forEach((r) => {
    const prev = byCategory.get(r.category) || 0;
    byCategory.set(r.category, prev + Number(r.sessions));
  });

  const totalRoom = roomRows.reduce((acc, r) => acc + Number(r.sessions), 0);
  const categoryRows = [...byCategory.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(
      ([category, total]) => `
        <tr>
          <td>${category}</td>
          <td>${total}</td>
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
          </tr>
        </thead>
        <tbody>${categoryRows}</tbody>
      </table>
    </div>
    <p><strong>Total ${room}: ${totalRoom}</strong></p>
  `;
}

function renderComparativa() {
  const scopeRoom = els.compSala.value;

  const totalA = getCompareTotal(
    els.compAModo.value,
    Number(els.compAMes.value),
    Number(els.compAAnio.value),
    scopeRoom
  );

  const totalB = getCompareTotal(
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

  drawPieChart(totalA, totalB);
  renderCompareMeta(labelA, labelB, totalA, totalB, scopeRoom);
}

function getCompareTotal(mode, month, year, roomScope) {
  let rows = filterByPeriod(state.records, mode, month, year);
  if (roomScope !== "Todas") {
    rows = rows.filter((r) => r.room === roomScope);
  }
  return rows.reduce((acc, r) => acc + Number(r.sessions), 0);
}

function periodLabel(mode, month, year) {
  return mode === "anio" ? `Año ${year}` : `${MONTHS[month - 1]} ${year}`;
}

function drawPieChart(a, b) {
  const canvas = els.pieChart;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const radius = Math.min(width, height) * 0.36;
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

  const angleA = (a / total) * Math.PI * 2;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + angleA);
  ctx.closePath();
  ctx.fillStyle = "#b84e2f";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, radius, -Math.PI / 2 + angleA, -Math.PI / 2 + Math.PI * 2);
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
  ctx.fillText(`${total} ses.`, x, y + 6);
}

function renderCompareMeta(labelA, labelB, totalA, totalB, roomScope) {
  const diff = totalB - totalA;
  const trend = diff === 0 ? "Sin variación" : diff > 0 ? `+${diff}` : `${diff}`;

  els.compareMeta.innerHTML = `
    <div class="meta-item"><span class="dot" style="background:#b84e2f"></span><strong>${labelA}</strong>: ${totalA} sesiones</div>
    <div class="meta-item"><span class="dot" style="background:#3f6f5b"></span><strong>${labelB}</strong>: ${totalB} sesiones</div>
    <div class="meta-item"><strong>Sala:</strong> ${roomScope}</div>
    <div class="meta-item"><strong>Diferencia (B - A):</strong> ${trend}</div>
  `;
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
