let transactions = [];
let budgets = {};
let casheaPurchases = [];
let gastosChart = null;
let balanceChart = null;
let displayCurrency = "VES";
let savingGoal = 0;

const BCV_API_URL = "https://bcv.today/api/v1/rate.json";

let exchangeRates = {
  VES: 1,
  USD: 36.5,
  EUR: 39.8,
  USDT: 37.1
};

let rateMeta = {
  lastUpdated: null,
  mode: "manual",
  source: "Local"
};

let categories = {
  alimentacion: { name: "Alimentación", emoji: "🍔", custom: false },
  transporte: { name: "Transporte", emoji: "🚗", custom: false },
  servicios: { name: "Servicios", emoji: "📱", custom: false },
  salud: { name: "Salud", emoji: "🏥", custom: false },
  entretenimiento: { name: "Entretenimiento", emoji: "🎮", custom: false },
  educacion: { name: "Educación", emoji: "📚", custom: false },
  trabajo: { name: "Trabajo", emoji: "💼", custom: false },
  otro: { name: "Otro", emoji: "📌", custom: false }
};

const currencyLabels = {
  VES: "Bolívar (VES)",
  USD: "USD BCV (oficial)",
  EUR: "EUR BCV (oficial)",
  USDT: "USDT (manual)"
};

document.addEventListener("DOMContentLoaded", () => {
  cargarTodo();
  inicializarTema();
  actualizarEncabezado();
  configurarFecha();
  inicializarEventos();
  llenarSelectsCategorias();
  llenarMesesReporte();
  pintarFormularioTasas();
  renderTodo();
  actualizarVistaConversion();
});

function mostrarToast(mensaje, tipo = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensaje;

  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

function getCurrencySourceLabel(currency) {
  if (currency === "VES") return "Moneda base";
  if (currency === "USD" || currency === "EUR") {
    return rateMeta.mode === "automatico" ? "BCV oficial" : "Referencia manual";
  }
  if (currency === "USDT") return "Referencia manual";
  return "Referencia";
}

function getRandomSubtitleByHour(hour) {
  const morning = [
    "Empecemos el día con claridad",
    "Hoy puedes organizar todo con calma",
    "Un buen día empieza con cuentas claras"
  ];
  const afternoon = [
    "Revisa tus movimientos de hoy",
    "Organiza tus gastos y avanza con orden",
    "Todo va mejor cuando ves tus números a tiempo"
  ];
  const night = [
    "Cierra el día con tus cuentas al día",
    "Un repaso rápido también cuenta",
    "Deja tus movimientos en orden antes de descansar"
  ];

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  if (hour >= 5 && hour < 12) return pick(morning);
  if (hour >= 12 && hour < 19) return pick(afternoon);
  return pick(night);
}

function cargarTodo() {
  cargarDatos();
  cargarTasas();
  cargarConfiguracionMoneda();
  cargarCategorias();
  cargarMetaAhorro();
}

function configurarFecha() {
  const dateInput = document.getElementById("date");
  if (dateInput && !dateInput.value) dateInput.valueAsDate = new Date();

  const casheaDate = document.getElementById("casheaDate");
  if (casheaDate && !casheaDate.value) casheaDate.valueAsDate = new Date();

  const firstPaymentDate = document.getElementById("casheaFirstPaymentDate");
  if (firstPaymentDate && !firstPaymentDate.value) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    firstPaymentDate.value = convertirFechaInput(nextMonth);
  }
}

function convertirFechaInput(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function inicializarEventos() {
  document.getElementById("transactionForm")?.addEventListener("submit", guardarTransaccion);
  document.getElementById("budgetForm")?.addEventListener("submit", agregarPresupuesto);
  document.getElementById("categoryForm")?.addEventListener("submit", agregarCategoriaPersonalizada);
  document.getElementById("savingGoalForm")?.addEventListener("submit", guardarMetaAhorro);
  document.getElementById("casheaForm")?.addEventListener("submit", guardarCompraCashea);
  document.getElementById("importJsonInput")?.addEventListener("change", importarDatosJSON);

  document.getElementById("filterText")?.addEventListener("input", filtrarTransacciones);
  document.getElementById("filterCategory")?.addEventListener("change", filtrarTransacciones);
  document.getElementById("filterType")?.addEventListener("change", filtrarTransacciones);
  document.getElementById("filterDateFrom")?.addEventListener("change", filtrarTransacciones);
  document.getElementById("filterDateTo")?.addEventListener("change", filtrarTransacciones);

  document.getElementById("amount")?.addEventListener("input", actualizarVistaConversion);
  document.getElementById("transactionCurrency")?.addEventListener("change", actualizarVistaConversion);
}

function actualizarEncabezado() {
  const ahoraCaracas = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Caracas" }));
  const hora = ahoraCaracas.getHours();

  const titulo = document.getElementById("mainGreeting");
  const subtitulo = document.getElementById("mainSubtitle");

  if (titulo) titulo.textContent = "Hola, Paula";
  if (subtitulo) subtitulo.textContent = getRandomSubtitleByHour(hora);
}

function actualizarBotonTema() {
  const button = document.querySelector(".header-buttons .btn.btn-secondary");
  if (!button) return;
  button.textContent = document.body.classList.contains("light-mode") ? "Tema oscuro" : "Tema claro";
}

function renderTodo() {
  llenarSelectsCategorias();
  renderCategoriasPersonalizadas();
  mostrarTransacciones();
  mostrarPresupuestos();
  mostrarAlertasPresupuesto();
  actualizarResumen();
  actualizarResumenAhorro();
  actualizarResumenCashea();
  actualizarResumenMesActual();
  mostrarAlertasCashea();
  mostrarComprasCashea();
  actualizarGraficos();
  actualizarVistaConversion();
  actualizarBotonTema();
  actualizarPanelTasas();
}

function formatMoney(value, currency = displayCurrency) {
  const localeMap = { VES: "es-VE", USD: "en-US", EUR: "es-ES", USDT: "en-US" };
  if (currency === "USDT") return `${Number(value).toFixed(2)} USDT`;

  try {
    return new Intl.NumberFormat(localeMap[currency] || "es-VE", {
      style: "currency",
      currency
    }).format(value);
  } catch {
    return `${Number(value).toFixed(2)} ${currency}`;
  }
}

function formatDateTime(isoString) {
  if (!isoString) return "Sin registro";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Sin registro";

  return date.toLocaleString("es-VE", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function convertToVES(amount, currency) {
  if (currency === "VES") return amount;
  return amount * (exchangeRates[currency] || 1);
}

function convertFromVES(amountVES, currency) {
  if (currency === "VES") return amountVES;
  return amountVES / (exchangeRates[currency] || 1);
}

function actualizarVistaConversion() {
  const amount = parseFloat(document.getElementById("amount")?.value || "0");
  const currency = document.getElementById("transactionCurrency")?.value || "VES";
  const sourceEl = document.getElementById("conversionSource");
  const listEl = document.getElementById("liveConversionList");

  if (!sourceEl || !listEl) return;
  sourceEl.textContent = `Fuente: ${getCurrencySourceLabel(currency)}`;

  if (isNaN(amount) || amount <= 0) {
    listEl.innerHTML = '<p class="empty-message">Ingresa un monto para ver conversiones</p>';
    return;
  }

  const amountVES = convertToVES(amount, currency);
  const currencies = ["VES", "USD", "EUR", "USDT"];

  listEl.innerHTML = `
    <div class="conversion-item">
      <strong>Monto en VES interno:</strong> ${formatMoney(amountVES, "VES")}
    </div>
    ${currencies.filter(code => code !== currency).map(code => `
      <div class="conversion-item">
        <strong>${formatMoney(amount, currency)}</strong> = <strong>${formatMoney(convertFromVES(amountVES, code), code)}</strong>
      </div>
    `).join("")}
  `;
}

function actualizarPanelTasas() {
  const lastUpdatedEl = document.getElementById("ratesLastUpdated");
  const modeEl = document.getElementById("ratesUpdateMode");
  const sourceTextEl = document.getElementById("ratesSourceText");
  const badgeEl = document.getElementById("ratesSourceBadge");

  if (lastUpdatedEl) lastUpdatedEl.textContent = formatDateTime(rateMeta.lastUpdated);
  if (modeEl) modeEl.textContent = rateMeta.mode === "automatico" ? "Automática" : "Manual";
  if (sourceTextEl) sourceTextEl.textContent = rateMeta.source || "Local";

  if (badgeEl) {
    badgeEl.textContent = rateMeta.mode === "automatico" ? "BCV oficial" : "Manual";
    badgeEl.className = `source-badge ${rateMeta.mode === "automatico" ? "external" : "manual"}`;
  }
}

async function actualizarTasasAutomaticamente() {
  const boton = document.getElementById("autoRatesButton");
  const textoOriginal = boton?.textContent || "Actualizar USD/EUR desde BCV";

  try {
    if (boton) {
      boton.disabled = true;
      boton.textContent = "Actualizando...";
    }

    const tasas = await obtenerTasasDesdeBCV();

    if (!tasas || (!tasas.USD && !tasas.EUR)) {
      mostrarToast("No se pudieron actualizar USD y EUR desde BCV.", "error");
      return;
    }

    if (tasas.USD && tasas.USD > 0) exchangeRates.USD = tasas.USD;
    if (tasas.EUR && tasas.EUR > 0) exchangeRates.EUR = tasas.EUR;

    rateMeta = {
      lastUpdated: tasas.capturedAt || new Date().toISOString(),
      mode: "automatico",
      source: tasas.effectiveDate
        ? `BCV oficial · Vigencia ${tasas.effectiveDate}`
        : "BCV oficial"
    };

    guardarTasasEnStorage();
    pintarFormularioTasas();
    renderTodo();
    generarReporteSiExiste();

    mostrarToast("USD y EUR actualizados con la tasa oficial BCV.", "success");
  } catch (error) {
    console.error("Error actualizando tasas BCV:", error);
    mostrarToast("No se pudieron actualizar USD y EUR desde BCV.", "error");
  } finally {
    if (boton) {
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  }
}

async function obtenerTasasDesdeBCV() {
  const response = await fetch(BCV_API_URL, { cache: "no-cache" });
  if (!response.ok) throw new Error("No se pudo consultar la API BCV.");

  const data = await response.json();

  const usd = parseRateValue(data.USD);
  const eur = parseRateValue(data.EUR);
  const effectiveDate = data.date || data.effective_date || null;
  const capturedAt = data.updated_at || data.timestamp || data.captured_at || new Date().toISOString();

  return {
    USD: usd,
    EUR: eur,
    effectiveDate,
    capturedAt
  };
}

function parseRateValue(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value.replace(",", "."));
  if (value && typeof value === "object") {
    if (typeof value.price === "number") return value.price;
    if (typeof value.value === "number") return value.value;
    if (typeof value.rate === "number") return value.rate;
    if (typeof value.price === "string") return parseFloat(value.price.replace(",", "."));
    if (typeof value.value === "string") return parseFloat(value.value.replace(",", "."));
    if (typeof value.rate === "string") return parseFloat(value.rate.replace(",", "."));
  }
  return NaN;
}

async function importarDatosJSON(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const texto = await file.text();
    const parsed = JSON.parse(texto);

    transactions = (parsed.transactions || []).map(t => ({
      ...t,
      id: Number(t.id || Date.now()),
      amountOriginal: Number(t.amountOriginal ?? t.amount ?? t.amountVES ?? 0),
      currency: t.currency || "VES",
      amountVES: Number(t.amountVES ?? convertToVES(Number(t.amountOriginal ?? t.amount ?? 0), t.currency || "VES")),
      notes: t.notes || "",
      origin: t.origin || null,
      casheaPurchaseId: t.casheaPurchaseId ?? null,
      cuotaNumero: t.cuotaNumero ?? null,
      esInicial: Boolean(t.esInicial)
    }));

    budgets = parsed.budgets || {};
    casheaPurchases = (parsed.casheaPurchases || []).map(item => ({
      ...item,
      id: Number(item.id || Date.now()),
      installments: (item.installments || []).map(inst => ({
        ...inst,
        number: Number(inst.number),
        paid: Boolean(inst.paid),
        dueDate: inst.dueDate,
        paidDate: inst.paidDate || null
      }))
    }));

    if (parsed.displayCurrency) displayCurrency = parsed.displayCurrency;
    if (parsed.exchangeRates) exchangeRates = { ...exchangeRates, ...parsed.exchangeRates, VES: 1 };
    if (parsed.exchangeRateMeta) rateMeta = { ...rateMeta, ...parsed.exchangeRateMeta };
    if (parsed.categories) categories = { ...categories, ...parsed.categories };

    if (typeof parsed.savingGoal === "number") {
      savingGoal = parsed.savingGoal;
      localStorage.setItem("savingGoal", JSON.stringify({
        amountVES: savingGoal,
        amountOriginal: savingGoal,
        currency: "VES"
      }));
    }

    guardarDatos();
    guardarTasasEnStorage();
    localStorage.setItem("displayCurrency", displayCurrency);
    localStorage.setItem("categories", JSON.stringify(categories));

    llenarMesesReporte();
    pintarFormularioTasas();
    renderTodo();

    mostrarToast("Datos importados correctamente.", "success");
  } catch (error) {
    console.error(error);
    mostrarToast("No se pudo importar el archivo JSON.", "error");
  } finally {
    event.target.value = "";
  }
}

function getCategoryName(key) {
  return categories[key]?.name || key;
}

function getCategoryEmoji(key) {
  return categories[key]?.emoji || "📁";
}

function llenarSelectsCategorias() {
  const options = Object.entries(categories)
    .map(([key, value]) => `<option value="${key}">${value.emoji} ${value.name}</option>`)
    .join("");

  ["category", "budgetCategory", "filterCategory", "casheaCategory"].forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    const current = select.value;

    select.innerHTML = id === "filterCategory"
      ? `<option value="">Todas las categorías</option>${options}`
      : `<option value="">Selecciona una categoría</option>${options}`;

    if (current && categories[current]) select.value = current;
  });

  const displayCurrencySelect = document.getElementById("displayCurrency");
  if (displayCurrencySelect) displayCurrencySelect.value = displayCurrency;
}

function normalizarClaveCategoria(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function agregarCategoriaPersonalizada(e) {
  e.preventDefault();
  const name = document.getElementById("newCategoryName")?.value.trim();
  const emoji = document.getElementById("newCategoryEmoji")?.value.trim();
  const key = normalizarClaveCategoria(name || "");

  if (!name || !emoji) {
    mostrarToast("Completa el nombre y el emoji.", "error");
    return;
  }
  if (categories[key]) {
    mostrarToast("Ya existe una categoría con ese nombre.", "warning");
    return;
  }

  categories[key] = { name, emoji, custom: true };
  guardarCategorias();
  document.getElementById("categoryForm")?.reset();
  renderTodo();
  mostrarToast("Categoría agregada.", "success");
}

function eliminarCategoriaPersonalizada(key) {
  if (!categories[key] || !categories[key].custom) return;

  const usada = transactions.some(t => t.category === key)
    || Object.prototype.hasOwnProperty.call(budgets, key)
    || casheaPurchases.some(item => item.category === key);

  if (usada) {
    mostrarToast("No puedes eliminar esta categoría porque ya está en uso.", "warning");
    return;
  }
  if (!confirm("¿Deseas eliminar esta categoría personalizada?")) return;

  delete categories[key];
  guardarCategorias();
  renderTodo();
  mostrarToast("Categoría eliminada.", "success");
}

function renderCategoriasPersonalizadas() {
  const contenedor = document.getElementById("customCategoriesList");
  if (!contenedor) return;

  const personalizadas = Object.entries(categories).filter(([, value]) => value.custom);

  if (personalizadas.length === 0) {
    contenedor.innerHTML = '<p class="empty-message">No hay categorías personalizadas</p>';
    return;
  }

  contenedor.innerHTML = personalizadas.map(([key, value]) => `
    <div class="custom-category-item">
      <div>
        <div class="custom-category-name">${value.emoji} ${escapeHtml(value.name)}</div>
        <div class="transaction-date">${key}</div>
      </div>
      <button class="btn btn-danger btn-small" onclick="eliminarCategoriaPersonalizada('${key}')">Eliminar</button>
    </div>
  `).join("");
}

function sumarMeses(fechaTexto, cantidadMeses) {
  const [year, month, day] = fechaTexto.split("-").map(Number);
  const fecha = new Date(year, month - 1 + cantidadMeses, day);
  return convertirFechaInput(fecha);
}

function fechaEstaVencida(fechaTexto) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(`${fechaTexto}T00:00:00`);
  return fecha < hoy;
}

function crearTransaccionDesdeCashea({ description, category, date, amountOriginal, currency, casheaPurchaseId, cuotaNumero = null, esInicial = false }) {
  const existe = transactions.some(t =>
    t.origin === "cashea" &&
    t.casheaPurchaseId === casheaPurchaseId &&
    t.cuotaNumero === cuotaNumero &&
    Boolean(t.esInicial) === Boolean(esInicial)
  );
  if (existe) return;

  transactions.push({
    id: Date.now() + Math.floor(Math.random() * 1000),
    description,
    amountOriginal,
    currency,
    amountVES: convertToVES(amountOriginal, currency),
    category,
    type: "gasto",
    date,
    notes: esInicial ? "Pago inicial de Cashea" : `Pago de cuota ${cuotaNumero} de Cashea`,
    origin: "cashea",
    casheaPurchaseId,
    cuotaNumero,
    esInicial
  });
}

function eliminarTransaccionesDeCompraCashea(casheaPurchaseId) {
  transactions = transactions.filter(t => !(t.origin === "cashea" && t.casheaPurchaseId === casheaPurchaseId));
}

function guardarTransaccion(e) {
  e.preventDefault();

  const id = document.getElementById("transactionId")?.value;
  const description = document.getElementById("description")?.value.trim();
  const amount = parseFloat(document.getElementById("amount")?.value);
  const currency = document.getElementById("transactionCurrency")?.value;
  const category = document.getElementById("category")?.value;
  const type = document.getElementById("type")?.value;
  const date = document.getElementById("date")?.value;
  const notes = document.getElementById("notes")?.value.trim();

  if (!description || !category || !type || !date || !currency || isNaN(amount) || amount <= 0) {
    mostrarToast("Completa todos los campos correctamente.", "error");
    return;
  }

  const payload = {
    description,
    amountOriginal: amount,
    currency,
    amountVES: convertToVES(amount, currency),
    category,
    type,
    date,
    notes: notes || ""
  };

  if (id) {
    const index = transactions.findIndex(t => t.id === Number(id));
    if (index === -1) {
      mostrarToast("No se encontró la transacción a editar.", "error");
      return;
    }
    if (transactions[index].origin === "cashea") {
      mostrarToast("Las transacciones automáticas de Cashea no se editan desde aquí.", "warning");
      return;
    }
    transactions[index] = { ...transactions[index], ...payload };
    mostrarToast("Transacción actualizada.", "success");
  } else {
    transactions.push({ id: Date.now(), ...payload });
    mostrarToast("Transacción agregada.", "success");
  }

  guardarDatos();
  limpiarFormularioTransaccion();
  llenarMesesReporte();
  renderTodo();
  filtrarTransacciones();
}

function editarTransaccion(id) {
  const t = transactions.find(item => item.id === id);
  if (!t) return;
  if (t.origin === "cashea") {
    mostrarToast("Esta transacción se gestiona desde la pestaña Cashea.", "warning");
    return;
  }

  document.getElementById("transactionId").value = String(t.id);
  document.getElementById("description").value = t.description;
  document.getElementById("amount").value = t.amountOriginal ?? t.amountVES;
  document.getElementById("transactionCurrency").value = t.currency || "VES";
  document.getElementById("category").value = t.category;
  document.getElementById("type").value = t.type;
  document.getElementById("date").value = t.date;
  document.getElementById("notes").value = t.notes || "";

  document.getElementById("transactionFormTitle").textContent = "Editando Transacción";
  document.getElementById("submitTransactionBtn").textContent = "Guardar Cambios";
  document.getElementById("cancelEditBtn").classList.remove("hidden");

  const formSection = document.getElementById("transactionForm")?.closest(".form-section");
  if (formSection) formSection.classList.add("editing");

  actualizarVistaConversion();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelarEdicion() {
  limpiarFormularioTransaccion();
  mostrarToast("Edición cancelada.", "info");
}

function limpiarFormularioTransaccion() {
  document.getElementById("transactionForm")?.reset();
  document.getElementById("transactionId").value = "";
  document.getElementById("transactionFormTitle").textContent = "Nueva Transacción";
  document.getElementById("submitTransactionBtn").textContent = "Agregar Transacción";
  document.getElementById("cancelEditBtn").classList.add("hidden");

  const currencySelect = document.getElementById("transactionCurrency");
  if (currencySelect) currencySelect.value = "VES";

  const formSection = document.getElementById("transactionForm")?.closest(".form-section");
  if (formSection) formSection.classList.remove("editing");

  configurarFecha();
  actualizarVistaConversion();
}

function eliminarTransaccion(id) {
  const transaccion = transactions.find(t => t.id === id);
  if (!transaccion) return;
  if (transaccion.origin === "cashea") {
    mostrarToast("Esta transacción fue generada por Cashea.", "warning");
    return;
  }
  if (!confirm("¿Deseas eliminar esta transacción?")) return;

  transactions = transactions.filter(t => t.id !== id);
  guardarDatos();
  llenarMesesReporte();
  renderTodo();
  filtrarTransacciones();
  mostrarToast("Transacción eliminada.", "success");
}

function mostrarTransacciones(listaPersonalizada = null) {
  const lista = document.getElementById("transactionsList");
  if (!lista) return;

  const base = listaPersonalizada || [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (base.length === 0) {
    lista.innerHTML = '<p class="empty-message">No hay transacciones registradas</p>';
    return;
  }

  lista.innerHTML = base.map(t => `
    <div class="transaction-item ${t.type}">
      <div class="transaction-info">
        <div class="transaction-category">${getCategoryEmoji(t.category)} ${escapeHtml(getCategoryName(t.category))}</div>
        <div class="transaction-description">${escapeHtml(t.description)}</div>
        <div class="transaction-date">${formatearFecha(t.date)}</div>
        <div class="transaction-original">
          Original: ${formatMoney(t.amountOriginal ?? t.amountVES, t.currency || "VES")} · ${currencyLabels[t.currency || "VES"]}
        </div>
        ${t.notes ? `<div class="transaction-notes">${escapeHtml(t.notes)}</div>` : ""}
        ${t.origin === "cashea" ? `<div class="transaction-notes">Generada automáticamente desde Cashea</div>` : ""}
      </div>

      <div class="transaction-amount ${t.type}">
        ${t.type === "gasto" ? "-" : "+"}${formatMoney(convertFromVES(t.amountVES, displayCurrency), displayCurrency)}
      </div>

      <div class="transaction-actions">
        <button class="btn btn-warning btn-small" onclick="editarTransaccion(${t.id})">Editar</button>
        <button class="btn btn-danger btn-small" onclick="eliminarTransaccion(${t.id})">Eliminar</button>
      </div>
    </div>
  `).join("");
}

function filtrarTransacciones() {
  const texto = document.getElementById("filterText")?.value.toLowerCase() || "";
  const categoria = document.getElementById("filterCategory")?.value || "";
  const tipo = document.getElementById("filterType")?.value || "";
  const dateFrom = document.getElementById("filterDateFrom")?.value || "";
  const dateTo = document.getElementById("filterDateTo")?.value || "";

  const filtradas = transactions
    .filter(t => {
      const textoBase = `${t.description} ${t.notes || ""} ${getCategoryName(t.category)} ${t.currency || ""}`.toLowerCase();
      const cumpleTexto = textoBase.includes(texto);
      const cumpleCategoria = !categoria || t.category === categoria;
      const cumpleTipo = !tipo || t.type === tipo;
      const cumpleDesde = !dateFrom || t.date >= dateFrom;
      const cumpleHasta = !dateTo || t.date <= dateTo;

      return cumpleTexto && cumpleCategoria && cumpleTipo && cumpleDesde && cumpleHasta;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const list = document.getElementById("transactionsList");
  if (!list) return;

  if (filtradas.length === 0) {
    list.innerHTML = '<p class="empty-message">No hay transacciones que coincidan con los filtros</p>';
    return;
  }

  mostrarTransacciones(filtradas);
}

function reiniciarFiltros() {
  const ids = ["filterText", "filterCategory", "filterType", "filterDateFrom", "filterDateTo"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  mostrarTransacciones();
  mostrarToast("Filtros reiniciados.", "info");
}

function agregarPresupuesto(e) {
  e.preventDefault();

  const category = document.getElementById("budgetCategory")?.value;
  const amount = parseFloat(document.getElementById("budgetAmount")?.value);
  const currency = document.getElementById("budgetCurrency")?.value;

  if (!category || !currency || isNaN(amount) || amount <= 0) {
    mostrarToast("Ingresa un presupuesto válido.", "error");
    return;
  }

  budgets[category] = {
    amountOriginal: amount,
    currency,
    amountVES: convertToVES(amount, currency)
  };

  guardarDatos();
  document.getElementById("budgetForm")?.reset();

  const budgetCurrency = document.getElementById("budgetCurrency");
  if (budgetCurrency) budgetCurrency.value = "VES";

  renderTodo();
  mostrarToast("Presupuesto guardado.", "success");
}

function eliminarPresupuesto(category) {
  if (!confirm("¿Deseas eliminar este presupuesto?")) return;
  delete budgets[category];
  guardarDatos();
  renderTodo();
  mostrarToast("Presupuesto eliminado.", "success");
}

function obtenerEstadoPresupuesto(category) {
  const budgetData = budgets[category];
  const budgetAmountVES = typeof budgetData === "number" ? budgetData : (budgetData?.amountVES || 0);

  const spent = transactions
    .filter(t => t.category === category && t.type === "gasto")
    .reduce((sum, t) => sum + t.amountVES, 0);

  const percent = budgetAmountVES > 0 ? (spent / budgetAmountVES) * 100 : 0;

  return {
    budgetAmountVES,
    budgetOriginalAmount: budgetData?.amountOriginal ?? budgetAmountVES,
    budgetOriginalCurrency: budgetData?.currency ?? "VES",
    spent,
    percent,
    warning: percent >= 80 && percent < 100,
    exceeded: percent >= 100
  };
}

function mostrarPresupuestos() {
  const lista = document.getElementById("budgetsList");
  if (!lista) return;

  const keys = Object.keys(budgets);
  if (keys.length === 0) {
    lista.innerHTML = '<p class="empty-message">No hay presupuestos establecidos</p>';
    return;
  }

  lista.innerHTML = keys.map(category => {
    const estado = obtenerEstadoPresupuesto(category);

    return `
      <div class="budget-item ${estado.warning ? "alerta" : ""} ${estado.exceeded ? "excedido" : ""}">
        <div>
          <div><strong>${getCategoryEmoji(category)} ${escapeHtml(getCategoryName(category))}</strong></div>
          <div class="transaction-original">
            Presupuesto original: ${formatMoney(estado.budgetOriginalAmount, estado.budgetOriginalCurrency)} · ${currencyLabels[estado.budgetOriginalCurrency]}
          </div>
          <div class="budget-progress">
            <div class="budget-progress-bar ${estado.exceeded ? "exceeded" : estado.warning ? "warning" : ""}" style="width:${Math.min(estado.percent, 100)}%"></div>
          </div>
          <small>
            Gastado: ${formatMoney(convertFromVES(estado.spent, displayCurrency), displayCurrency)}
            /
            Presupuesto visible: ${formatMoney(convertFromVES(estado.budgetAmountVES, displayCurrency), displayCurrency)}
          </small>
        </div>
        <div>
          <div>${estado.percent.toFixed(0)}%</div>
          <button class="btn btn-danger btn-small" onclick="eliminarPresupuesto('${category}')">Eliminar</button>
        </div>
      </div>
    `;
  }).join("");
}

function mostrarAlertasPresupuesto() {
  const contenedor = document.getElementById("budgetAlerts");
  if (!contenedor) return;

  const alertas = Object.keys(budgets)
    .map(category => {
      const estado = obtenerEstadoPresupuesto(category);
      if (estado.exceeded) return `<div class="alert-box danger">Has superado el presupuesto de ${escapeHtml(getCategoryName(category))} (${estado.percent.toFixed(0)}%)</div>`;
      if (estado.warning) return `<div class="alert-box warning">Estás cerca del límite en ${escapeHtml(getCategoryName(category))} (${estado.percent.toFixed(0)}%)</div>`;
      return "";
    })
    .filter(Boolean);

  contenedor.innerHTML = alertas.join("");
}

function actualizarResumen() {
  const totalIncomeVES = transactions.filter(t => t.type === "ingreso").reduce((sum, t) => sum + t.amountVES, 0);
  const totalExpenseVES = transactions.filter(t => t.type === "gasto").reduce((sum, t) => sum + t.amountVES, 0);
  const balanceVES = totalIncomeVES - totalExpenseVES;

  const totalIncomeEl = document.getElementById("totalIncome");
  const totalExpenseEl = document.getElementById("totalExpense");
  const balanceEl = document.getElementById("balance");

  if (totalIncomeEl) totalIncomeEl.textContent = formatMoney(convertFromVES(totalIncomeVES, displayCurrency), displayCurrency);
  if (totalExpenseEl) totalExpenseEl.textContent = formatMoney(convertFromVES(totalExpenseVES, displayCurrency), displayCurrency);
  if (balanceEl) balanceEl.textContent = formatMoney(convertFromVES(balanceVES, displayCurrency), displayCurrency);
}

function actualizarResumenMesActual() {
  const hoy = new Date();
  const mesActual = convertirFechaInput(new Date(hoy.getFullYear(), hoy.getMonth(), 1)).slice(0, 7);
  const delMes = transactions.filter(t => t.date.startsWith(mesActual));

  const ingresosVES = delMes.filter(t => t.type === "ingreso").reduce((sum, t) => sum + t.amountVES, 0);
  const gastosVES = delMes.filter(t => t.type === "gasto").reduce((sum, t) => sum + t.amountVES, 0);
  const balanceVES = ingresosVES - gastosVES;

  const monthLabel = document.getElementById("currentMonthLabel");
  const monthIncome = document.getElementById("monthIncome");
  const monthExpense = document.getElementById("monthExpense");
  const monthBalance = document.getElementById("monthBalance");

  if (monthLabel) {
    monthLabel.textContent = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toLocaleDateString("es-VE", {
      month: "long",
      year: "numeric"
    });
  }
  if (monthIncome) monthIncome.textContent = formatMoney(convertFromVES(ingresosVES, displayCurrency), displayCurrency);
  if (monthExpense) monthExpense.textContent = formatMoney(convertFromVES(gastosVES, displayCurrency), displayCurrency);
  if (monthBalance) monthBalance.textContent = formatMoney(convertFromVES(balanceVES, displayCurrency), displayCurrency);
}

function actualizarResumenAhorro() {
  const totalIncomeVES = transactions.filter(t => t.type === "ingreso").reduce((sum, t) => sum + t.amountVES, 0);
  const totalExpenseVES = transactions.filter(t => t.type === "gasto").reduce((sum, t) => sum + t.amountVES, 0);

  const ahorroActualVES = totalIncomeVES - totalExpenseVES;
  const faltanteVES = Math.max(savingGoal - ahorroActualVES, 0);
  const progress = savingGoal > 0 ? Math.min((ahorroActualVES / savingGoal) * 100, 100) : 0;

  const savingGoalAmount = document.getElementById("savingGoalAmount");
  const currentSavings = document.getElementById("currentSavings");
  const remainingSavings = document.getElementById("remainingSavings");
  const savingsProgressText = document.getElementById("savingsProgressText");
  const savingGoalBar = document.getElementById("savingGoalBar");

  if (savingGoalAmount) savingGoalAmount.textContent = formatMoney(convertFromVES(savingGoal, displayCurrency), displayCurrency);
  if (currentSavings) currentSavings.textContent = formatMoney(convertFromVES(ahorroActualVES, displayCurrency), displayCurrency);
  if (remainingSavings) remainingSavings.textContent = formatMoney(convertFromVES(faltanteVES, displayCurrency), displayCurrency);
  if (savingsProgressText) savingsProgressText.textContent = `${progress.toFixed(0)}%`;
  if (savingGoalBar) savingGoalBar.style.width = `${progress}%`;
}

function guardarMetaAhorro(e) {
  e.preventDefault();

  const value = parseFloat(document.getElementById("savingGoalInput")?.value);
  const currency = document.getElementById("savingGoalCurrency")?.value;

  if (isNaN(value) || value < 0 || !currency) {
    mostrarToast("Ingresa una meta válida.", "error");
    return;
  }

  savingGoal = convertToVES(value, currency);

  localStorage.setItem("savingGoal", JSON.stringify({
    amountVES: savingGoal,
    amountOriginal: value,
    currency
  }));

  renderTodo();
  mostrarToast("Meta de ahorro guardada.", "success");
}

function cargarMetaAhorro() {
  const saved = localStorage.getItem("savingGoal");
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);

    if (typeof parsed === "number") {
      savingGoal = parsed;
    } else {
      savingGoal = parsed.amountVES || 0;
      const input = document.getElementById("savingGoalInput");
      const currencySelect = document.getElementById("savingGoalCurrency");

      if (input) input.value = parsed.amountOriginal ?? parsed.amountVES ?? 0;
      if (currencySelect) currencySelect.value = parsed.currency || "VES";
    }
  } catch {
    savingGoal = 0;
  }
}

function obtenerProximaCuota(purchase) {
  return purchase.installments.find(inst => !inst.paid) || null;
}

function obtenerProximoPagoGlobal() {
  let proxima = null;

  casheaPurchases.forEach(purchase => {
    const cuota = obtenerProximaCuota(purchase);
    if (!cuota) return;

    if (!proxima || cuota.dueDate < proxima.dueDate) {
      proxima = { ...cuota, purchaseDescription: purchase.description, currency: purchase.currency };
    }
  });

  return proxima;
}

function mostrarAlertasCashea() {
  const contenedor = document.getElementById("casheaAlerts");
  if (!contenedor) return;

  const alertas = [];

  casheaPurchases.forEach(purchase => {
    purchase.installments.forEach(inst => {
      if (!inst.paid && fechaEstaVencida(inst.dueDate)) {
        alertas.push(`
          <div class="alert-box danger">
            Cuota vencida: ${escapeHtml(purchase.description)} - cuota ${inst.number} (${formatearFecha(inst.dueDate)})
          </div>
        `);
      }
    });
  });

  contenedor.innerHTML = alertas.join("");
}

function editarCompraCashea(id) {
  const purchase = casheaPurchases.find(item => item.id === id);
  if (!purchase) return;

  document.getElementById("casheaPurchaseId").value = String(purchase.id);
  document.getElementById("casheaDescription").value = purchase.description;
  document.getElementById("casheaCategory").value = purchase.category;
  document.getElementById("casheaDate").value = purchase.date;
  document.getElementById("casheaCurrency").value = purchase.currency;
  document.getElementById("casheaTotalAmountInput").value = purchase.totalOriginal;
  document.getElementById("casheaInitialAmountInput").value = purchase.initialOriginal;
  document.getElementById("casheaInstallmentsCount").value = purchase.installmentsCount;
  document.getElementById("casheaInstallmentAmount").value = purchase.installmentOriginal;
  document.getElementById("casheaFirstPaymentDate").value = purchase.firstPaymentDate;
  document.getElementById("casheaNotes").value = purchase.notes || "";

  document.getElementById("casheaFormTitle").textContent = "Editando compra Cashea";
  document.getElementById("casheaSubmitBtn").textContent = "Guardar cambios";
  document.getElementById("cancelCasheaEditBtn").classList.remove("hidden");

  const formSection = document.getElementById("casheaForm")?.closest(".form-section");
  if (formSection) formSection.classList.add("editing");

  cambiarTab("cashea");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelarEdicionCashea() {
  limpiarFormularioCashea();
  mostrarToast("Edición de Cashea cancelada.", "info");
}

function limpiarFormularioCashea() {
  document.getElementById("casheaForm")?.reset();
  document.getElementById("casheaPurchaseId").value = "";
  document.getElementById("casheaFormTitle").textContent = "Nueva compra Cashea";
  document.getElementById("casheaSubmitBtn").textContent = "Guardar compra Cashea";
  document.getElementById("cancelCasheaEditBtn").classList.add("hidden");

  const casheaCurrency = document.getElementById("casheaCurrency");
  if (casheaCurrency) casheaCurrency.value = "VES";

  const formSection = document.getElementById("casheaForm")?.closest(".form-section");
  if (formSection) formSection.classList.remove("editing");

  configurarFecha();
}

function guardarCompraCashea(e) {
  e.preventDefault();

  const existingId = document.getElementById("casheaPurchaseId")?.value;
  const description = document.getElementById("casheaDescription")?.value.trim();
  const category = document.getElementById("casheaCategory")?.value;
  const date = document.getElementById("casheaDate")?.value;
  const currency = document.getElementById("casheaCurrency")?.value;
  const totalOriginal = parseFloat(document.getElementById("casheaTotalAmountInput")?.value);
  const initialOriginal = parseFloat(document.getElementById("casheaInitialAmountInput")?.value);
  const installmentsCount = parseInt(document.getElementById("casheaInstallmentsCount")?.value, 10);
  const installmentOriginal = parseFloat(document.getElementById("casheaInstallmentAmount")?.value);
  const firstPaymentDate = document.getElementById("casheaFirstPaymentDate")?.value;
  const notes = document.getElementById("casheaNotes")?.value.trim();

  if (!description || !category || !date || !currency || !firstPaymentDate || isNaN(totalOriginal) || isNaN(initialOriginal) || isNaN(installmentsCount) || isNaN(installmentOriginal)) {
    mostrarToast("Completa todos los campos de Cashea.", "error");
    return;
  }

  if (totalOriginal <= 0 || initialOriginal < 0 || installmentsCount <= 0 || installmentOriginal < 0) {
    mostrarToast("Los montos de Cashea deben ser válidos.", "error");
    return;
  }

  if (initialOriginal > totalOriginal) {
    mostrarToast("La inicial no puede ser mayor al monto total.", "warning");
    return;
  }

  const totalCalculado = initialOriginal + installmentOriginal * installmentsCount;
  if (Math.abs(totalCalculado - totalOriginal) > 0.01) {
    const confirmar = confirm("La suma de inicial + cuotas no coincide exactamente con el monto total. ¿Deseas guardar de todos modos?");
    if (!confirmar) return;
  }

  const purchaseId = existingId ? Number(existingId) : Date.now();
  const totalVES = convertToVES(totalOriginal, currency);
  const initialVES = convertToVES(initialOriginal, currency);
  const installmentVES = convertToVES(installmentOriginal, currency);

  let installments = Array.from({ length: installmentsCount }, (_, index) => ({
    number: index + 1,
    amountOriginal: installmentOriginal,
    amountVES: installmentVES,
    paid: false,
    dueDate: sumarMeses(firstPaymentDate, index),
    paidDate: null
  }));

  if (existingId) {
    const previous = casheaPurchases.find(item => item.id === purchaseId);
    if (previous) {
      installments = installments.map(newInst => {
        const oldInst = previous.installments.find(i => i.number === newInst.number);
        if (oldInst) {
          return {
            ...newInst,
            paid: oldInst.paid,
            paidDate: oldInst.paidDate || null
          };
        }
        return newInst;
      });
    }

    eliminarTransaccionesDeCompraCashea(purchaseId);
    casheaPurchases = casheaPurchases.filter(item => item.id !== purchaseId);
  }

  const purchase = {
    id: purchaseId,
    description,
    category,
    date,
    currency,
    totalOriginal,
    totalVES,
    initialOriginal,
    initialVES,
    financedVES: totalVES - initialVES,
    installmentOriginal,
    installmentVES,
    installmentsCount,
    firstPaymentDate,
    installments,
    notes: notes || ""
  };

  casheaPurchases.push(purchase);

  if (initialOriginal > 0) {
    crearTransaccionDesdeCashea({
      description: `${description} - Inicial Cashea`,
      category,
      date,
      amountOriginal: initialOriginal,
      currency,
      casheaPurchaseId: purchaseId,
      esInicial: true
    });
  }

  purchase.installments.forEach(inst => {
    if (inst.paid) {
      crearTransaccionDesdeCashea({
        description: `${description} - Cuota ${inst.number} Cashea`,
        category,
        date: inst.paidDate || inst.dueDate,
        amountOriginal: inst.amountOriginal,
        currency,
        casheaPurchaseId: purchaseId,
        cuotaNumero: inst.number,
        esInicial: false
      });
    }
  });

  guardarDatos();
  limpiarFormularioCashea();
  llenarMesesReporte();
  renderTodo();
  mostrarToast(existingId ? "Compra Cashea actualizada." : "Compra Cashea guardada.", "success");
}

function toggleCasheaInstallment(purchaseId, installmentNumber) {
  const purchase = casheaPurchases.find(item => item.id === purchaseId);
  if (!purchase) return;

  const installment = purchase.installments.find(item => item.number === installmentNumber);
  if (!installment) return;

  installment.paid = !installment.paid;
  installment.paidDate = installment.paid ? convertirFechaInput(new Date()) : null;

  if (installment.paid) {
    crearTransaccionDesdeCashea({
      description: `${purchase.description} - Cuota ${installment.number} Cashea`,
      category: purchase.category,
      date: installment.paidDate,
      amountOriginal: installment.amountOriginal,
      currency: purchase.currency,
      casheaPurchaseId: purchase.id,
      cuotaNumero: installment.number,
      esInicial: false
    });
    mostrarToast("Cuota marcada como pagada.", "success");
  } else {
    transactions = transactions.filter(t => !(
      t.origin === "cashea" &&
      t.casheaPurchaseId === purchase.id &&
      t.cuotaNumero === installment.number &&
      !Boolean(t.esInicial)
    ));
    mostrarToast("Pago de cuota revertido.", "info");
  }

  guardarDatos();
  llenarMesesReporte();
  renderTodo();
}

function eliminarCompraCashea(id) {
  if (!confirm("¿Deseas eliminar esta compra Cashea?")) return;

  eliminarTransaccionesDeCompraCashea(id);
  casheaPurchases = casheaPurchases.filter(item => item.id !== id);
  guardarDatos();
  llenarMesesReporte();
  renderTodo();
  mostrarToast("Compra Cashea eliminada.", "success");
}

function calcularResumenCompraCashea(purchase) {
  const paidInstallmentsVES = purchase.installments.filter(item => item.paid).reduce((sum, item) => sum + item.amountVES, 0);
  const paidTotalVES = purchase.initialVES + paidInstallmentsVES;
  const pendingVES = Math.max(purchase.totalVES - paidTotalVES, 0);
  const nextInstallment = purchase.installments.find(item => !item.paid) || null;
  const overdueCount = purchase.installments.filter(item => !item.paid && fechaEstaVencida(item.dueDate)).length;
  const progress = purchase.totalVES > 0 ? Math.min((paidTotalVES / purchase.totalVES) * 100, 100) : 0;

  return { paidTotalVES, pendingVES, nextInstallment, overdueCount, progress };
}

function mostrarComprasCashea() {
  const lista = document.getElementById("casheaList");
  if (!lista) return;

  if (casheaPurchases.length === 0) {
    lista.innerHTML = '<p class="empty-message">No hay compras Cashea registradas</p>';
    return;
  }

  lista.innerHTML = [...casheaPurchases]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(purchase => {
      const resumen = calcularResumenCompraCashea(purchase);

      return `
        <div class="cashea-card">
          <div class="cashea-header">
            <div>
              <div class="transaction-category">${getCategoryEmoji(purchase.category)} ${escapeHtml(getCategoryName(purchase.category))}</div>
              <h3>${escapeHtml(purchase.description)}</h3>
              <div class="transaction-date">${formatearFecha(purchase.date)}</div>
              <div class="transaction-original">
                Monto original: ${formatMoney(purchase.totalOriginal, purchase.currency)} · ${currencyLabels[purchase.currency]}
              </div>
              <div class="transaction-original">
                Inicial: ${formatMoney(purchase.initialOriginal, purchase.currency)} · Cuotas: ${purchase.installmentsCount} de ${formatMoney(purchase.installmentOriginal, purchase.currency)}
              </div>
              <div class="transaction-original">
                Próxima cuota: ${resumen.nextInstallment ? `#${resumen.nextInstallment.number} - ${formatearFecha(resumen.nextInstallment.dueDate)}` : "Sin cuotas pendientes"}
              </div>
              ${resumen.overdueCount > 0 ? `<div class="transaction-notes">Tienes ${resumen.overdueCount} cuota(s) vencida(s)</div>` : ""}
            </div>
            <div class="transaction-actions">
              <button class="btn btn-warning btn-small" onclick="editarCompraCashea(${purchase.id})">Editar</button>
              <button class="btn btn-danger btn-small" onclick="eliminarCompraCashea(${purchase.id})">Eliminar</button>
            </div>
          </div>

          <div class="cashea-progress-block">
            <div class="cashea-progress-head">
              <span>Progreso pagado</span>
              <strong>${resumen.progress.toFixed(0)}%</strong>
            </div>
            <div class="budget-progress">
              <div class="budget-progress-bar" style="width:${resumen.progress}%"></div>
            </div>
          </div>

          <div class="cashea-installments">
            <h4>Cuotas</h4>
            ${purchase.installments.map(item => `
              <div class="cashea-installment ${item.paid ? "paid" : ""} ${!item.paid && fechaEstaVencida(item.dueDate) ? "overdue" : ""}">
                <div>
                  <strong>Cuota ${item.number}</strong>
                  <div class="transaction-original">${formatMoney(item.amountOriginal, purchase.currency)}</div>
                  <div class="transaction-date">Vence: ${formatearFecha(item.dueDate)}</div>
                  <div class="transaction-date">
                    ${item.paid ? `Pagada el ${formatearFecha(item.paidDate)}` : (fechaEstaVencida(item.dueDate) ? "Vencida" : "Pendiente por pagar")}
                  </div>
                </div>
                <button class="btn ${item.paid ? "btn-secondary" : "btn-primary"} btn-small" onclick="toggleCasheaInstallment(${purchase.id}, ${item.number})">
                  ${item.paid ? "Quitar pago" : "Marcar pagada"}
                </button>
              </div>
            `).join("")}
          </div>

          ${purchase.notes ? `<div class="transaction-notes">${escapeHtml(purchase.notes)}</div>` : ""}
        </div>
      `;
    }).join("");
}

function actualizarResumenCashea() {
  const totalVES = casheaPurchases.reduce((sum, item) => sum + item.totalVES, 0);
  const paidVES = casheaPurchases.reduce((sum, item) => sum + calcularResumenCompraCashea(item).paidTotalVES, 0);
  const pendingVES = casheaPurchases.reduce((sum, item) => sum + calcularResumenCompraCashea(item).pendingVES, 0);
  const nextPayment = obtenerProximoPagoGlobal();
  const nextPaymentText = nextPayment ? formatearFecha(nextPayment.dueDate) : "Sin cuotas";

  const totalEl = document.getElementById("casheaTotalAmount");
  const paidEl = document.getElementById("casheaPaidAmount");
  const pendingEl = document.getElementById("casheaPendingAmount");
  const topNext = document.getElementById("casheaNextPayment");
  const panelNext = document.getElementById("casheaNextPaymentPanel");

  if (totalEl) totalEl.textContent = formatMoney(convertFromVES(totalVES, displayCurrency), displayCurrency);
  if (paidEl) paidEl.textContent = formatMoney(convertFromVES(paidVES, displayCurrency), displayCurrency);
  if (pendingEl) pendingEl.textContent = formatMoney(convertFromVES(pendingVES, displayCurrency), displayCurrency);
  if (topNext) topNext.textContent = nextPaymentText;
  if (panelNext) panelNext.textContent = nextPaymentText;
}

function actualizarGraficos() {
  actualizarGraficoGastos();
  actualizarGraficoBalance();
}

function actualizarGraficoGastos() {
  const gastosPorCategoria = {};

  transactions.filter(t => t.type === "gasto").forEach(t => {
    gastosPorCategoria[t.category] = (gastosPorCategoria[t.category] || 0) + t.amountVES;
  });

  const ctx = document.getElementById("gastosChart");
  if (!ctx) return;
  if (gastosChart) gastosChart.destroy();

  gastosChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(gastosPorCategoria).map(cat => `${getCategoryEmoji(cat)} ${getCategoryName(cat)}`),
      datasets: [{
        data: Object.values(gastosPorCategoria).map(valor => convertFromVES(valor, displayCurrency)),
        backgroundColor: ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#84cc16", "#f97316", "#14b8a6", "#e879f9"]
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function actualizarGraficoBalance() {
  const ingresosVES = transactions.filter(t => t.type === "ingreso").reduce((sum, t) => sum + t.amountVES, 0);
  const gastosVES = transactions.filter(t => t.type === "gasto").reduce((sum, t) => sum + t.amountVES, 0);

  const ctx = document.getElementById("balanceChart");
  if (!ctx) return;
  if (balanceChart) balanceChart.destroy();

  balanceChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Ingresos", "Gastos"],
      datasets: [{
        label: `Monto en ${displayCurrency}`,
        data: [convertFromVES(ingresosVES, displayCurrency), convertFromVES(gastosVES, displayCurrency)],
        backgroundColor: ["#10b981", "#ef4444"]
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function llenarMesesReporte() {
  const select = document.getElementById("reportMonth");
  if (!select) return;

  const mesesUnicos = [...new Set(transactions.map(t => t.date.slice(0, 7)))].sort().reverse();
  select.innerHTML = '<option value="">Selecciona un mes</option>' + mesesUnicos.map(mes => `<option value="${mes}">${formatearMes(mes)}</option>`).join("");
}

function generarReporte() {
  const month = document.getElementById("reportMonth")?.value;
  const contenedor = document.getElementById("reportContent");
  if (!contenedor) return;

  if (!month) {
    contenedor.innerHTML = '<p class="empty-message">Selecciona un mes para ver el reporte</p>';
    return;
  }

  const delMes = transactions.filter(t => t.date.startsWith(month));
  const ingresosVES = delMes.filter(t => t.type === "ingreso").reduce((s, t) => s + t.amountVES, 0);
  const gastosVES = delMes.filter(t => t.type === "gasto").reduce((s, t) => s + t.amountVES, 0);
  const balanceVES = ingresosVES - gastosVES;

  const gastosPorCategoria = {};
  delMes.filter(t => t.type === "gasto").forEach(t => {
    gastosPorCategoria[t.category] = (gastosPorCategoria[t.category] || 0) + t.amountVES;
  });

  let topCategory = "Sin gastos";
  let topAmount = 0;

  Object.entries(gastosPorCategoria).forEach(([cat, amount]) => {
    if (amount > topAmount) {
      topAmount = amount;
      topCategory = `${getCategoryEmoji(cat)} ${getCategoryName(cat)}`;
    }
  });

  contenedor.innerHTML = `
    <div class="report-item">
      <h3>${formatearMes(month)}</h3>
      <div class="cashea-summary-grid">
        <div class="cashea-mini-card">
          <span>Ingresos</span>
          <strong>${formatMoney(convertFromVES(ingresosVES, displayCurrency), displayCurrency)}</strong>
        </div>
        <div class="cashea-mini-card">
          <span>Gastos</span>
          <strong>${formatMoney(convertFromVES(gastosVES, displayCurrency), displayCurrency)}</strong>
        </div>
        <div class="cashea-mini-card">
          <span>Balance</span>
          <strong>${formatMoney(convertFromVES(balanceVES, displayCurrency), displayCurrency)}</strong>
        </div>
        <div class="cashea-mini-card">
          <span>Mayor gasto</span>
          <strong>${topCategory}</strong>
        </div>
      </div>
    </div>
  `;
}

function cambiarTab(tab) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
  document.getElementById(`tab-${tab}`)?.classList.add("active");

  const botones = document.querySelectorAll(".tab-btn");
  const mapa = { transacciones: 0, cashea: 1, graficos: 2, reportes: 3, configuracion: 4 };
  if (typeof mapa[tab] !== "undefined" && botones[mapa[tab]]) botones[mapa[tab]].classList.add("active");
  if (tab === "graficos") setTimeout(actualizarGraficos, 100);
}

function toggleDarkMode() {
  document.body.classList.toggle("light-mode");
  localStorage.setItem("themeMode", document.body.classList.contains("light-mode") ? "light" : "dark");
  actualizarBotonTema();
  mostrarToast("Tema actualizado.", "info");
}

function inicializarTema() {
  const savedTheme = localStorage.getItem("themeMode") || "dark";
  document.body.classList.remove("light-mode");
  if (savedTheme === "light") document.body.classList.add("light-mode");
  actualizarBotonTema();
}

function guardarConfiguracionMoneda() {
  displayCurrency = document.getElementById("displayCurrency")?.value || "VES";
  localStorage.setItem("displayCurrency", displayCurrency);
  renderTodo();
  generarReporteSiExiste();
  mostrarToast("Moneda de visualización actualizada.", "success");
}

function cargarConfiguracionMoneda() {
  displayCurrency = localStorage.getItem("displayCurrency") || "VES";
}

function guardarTasasEnStorage() {
  localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates));
  localStorage.setItem("exchangeRateMeta", JSON.stringify(rateMeta));
}

function guardarTasas() {
  const usd = parseFloat(document.getElementById("rateUSD")?.value);
  const eur = parseFloat(document.getElementById("rateEUR")?.value);
  const usdt = parseFloat(document.getElementById("rateUSDT")?.value);

  if ([usd, eur, usdt].some(v => isNaN(v) || v <= 0)) {
    mostrarToast("Ingresa tasas válidas mayores a 0.", "error");
    return;
  }

  exchangeRates.USD = usd;
  exchangeRates.EUR = eur;
  exchangeRates.USDT = usdt;

  rateMeta = {
    lastUpdated: new Date().toISOString(),
    mode: "manual",
    source: "Local"
  };

  guardarTasasEnStorage();
  pintarFormularioTasas();
  renderTodo();
  generarReporteSiExiste();
  mostrarToast("Tasas guardadas manualmente.", "success");
}

function cargarTasas() {
  const saved = localStorage.getItem("exchangeRates");
  const metaSaved = localStorage.getItem("exchangeRateMeta");

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      exchangeRates = { ...exchangeRates, ...parsed, VES: 1 };
    } catch {
      exchangeRates.VES = 1;
    }
  }

  if (metaSaved) {
    try {
      rateMeta = { ...rateMeta, ...JSON.parse(metaSaved) };
    } catch {}
  }
}

function pintarFormularioTasas() {
  const usd = document.getElementById("rateUSD");
  const eur = document.getElementById("rateEUR");
  const usdt = document.getElementById("rateUSDT");

  if (usd) usd.value = exchangeRates.USD;
  if (eur) eur.value = exchangeRates.EUR;
  if (usdt) usdt.value = exchangeRates.USDT;
}

function guardarCategorias() {
  localStorage.setItem("categories", JSON.stringify(categories));
}

function cargarCategorias() {
  const saved = localStorage.getItem("categories");
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    categories = { ...categories, ...parsed };
  } catch {}
}

function generarReporteSiExiste() {
  const month = document.getElementById("reportMonth")?.value;
  if (month) generarReporte();
}

function guardarDatos() {
  localStorage.setItem("finanzasData", JSON.stringify({
    transactions,
    budgets,
    casheaPurchases
  }));
}

function cargarDatos() {
  const datos = localStorage.getItem("finanzasData");
  if (!datos) return;

  try {
    const parsed = JSON.parse(datos);

    transactions = (parsed.transactions || []).map(t => ({
      ...t,
      id: Number(t.id),
      amountOriginal: t.amountOriginal ?? t.amount ?? t.amountVES ?? 0,
      currency: t.currency || "VES",
      amountVES: t.amountVES ?? t.amount ?? 0,
      notes: t.notes || "",
      origin: t.origin || null,
      casheaPurchaseId: t.casheaPurchaseId ?? null,
      cuotaNumero: t.cuotaNumero ?? null,
      esInicial: Boolean(t.esInicial)
    }));

    budgets = parsed.budgets || {};

    casheaPurchases = (parsed.casheaPurchases || []).map(item => ({
      ...item,
      id: Number(item.id),
      installments: (item.installments || []).map(inst => ({
        ...inst,
        number: Number(inst.number),
        paid: Boolean(inst.paid),
        dueDate: inst.dueDate,
        paidDate: inst.paidDate || null
      }))
    }));
  } catch {
    transactions = [];
    budgets = {};
    casheaPurchases = [];
  }
}

function descargarDatos() {
  const datos = {
    transactions,
    budgets,
    casheaPurchases,
    displayCurrency,
    exchangeRates,
    exchangeRateMeta: rateMeta,
    categories,
    savingGoal,
    exportadoEn: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finanzas_venezuela_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  mostrarToast("Archivo JSON descargado.", "success");
}

function exportarCSV() {
  if (transactions.length === 0 && casheaPurchases.length === 0) {
    mostrarToast("No hay datos para exportar.", "warning");
    return;
  }

  const header = "TIPO,id,descripcion,monto_original,moneda_original,monto_en_ves,categoria,subtipo,fecha,notas";

  const transaccionesRows = transactions.map(t => [
    "transaccion",
    t.id,
    escaparCSV(t.description),
    t.amountOriginal,
    t.currency,
    t.amountVES,
    escaparCSV(getCategoryName(t.category)),
    t.type,
    t.date,
    escaparCSV(t.notes || "")
  ].join(","));

  const casheaRows = casheaPurchases.map(item => [
    "cashea",
    item.id,
    escaparCSV(item.description),
    item.totalOriginal,
    item.currency,
    item.totalVES,
    escaparCSV(getCategoryName(item.category)),
    "compra",
    item.date,
    escaparCSV(item.notes || "")
  ].join(","));

  const csv = [header, ...transaccionesRows, ...casheaRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finanzas_venezuela_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  mostrarToast("Archivo CSV descargado.", "success");
}

function escaparCSV(valor) {
  return `"${String(valor).replace(/"/g, '""')}"`;
}

function limpiarDatos() {
  if (!confirm("Esto eliminará todos tus datos. ¿Deseas continuar?")) return;

  transactions = [];
  budgets = {};
  casheaPurchases = [];
  savingGoal = 0;

  localStorage.removeItem("savingGoal");
  guardarDatos();
  limpiarFormularioTransaccion();
  limpiarFormularioCashea();
  llenarMesesReporte();
  renderTodo();

  const savingGoalInput = document.getElementById("savingGoalInput");
  const savingGoalCurrency = document.getElementById("savingGoalCurrency");
  const budgetCurrency = document.getElementById("budgetCurrency");

  if (savingGoalInput) savingGoalInput.value = "";
  if (savingGoalCurrency) savingGoalCurrency.value = "VES";
  if (budgetCurrency) budgetCurrency.value = "VES";

  const reportContent = document.getElementById("reportContent");
  if (reportContent) reportContent.innerHTML = '<p class="empty-message">Selecciona un mes para ver el reporte</p>';

  configurarFecha();
  mostrarToast("Datos eliminados.", "success");
}

function formatearFecha(fecha) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-VE");
}

function formatearMes(valor) {
  const [year, month] = valor.split("-");
  const fecha = new Date(Number(year), Number(month) - 1, 1);
  return fecha.toLocaleDateString("es-VE", { month: "long", year: "numeric" });
}

function escapeHtml(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
