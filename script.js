let transactions = [];
let budgets = {};
let casheaPurchases = [];
let gastosChart = null;
let balanceChart = null;
let displayCurrency = "VES";
let savingGoal = 0;

let exchangeRates = {
  VES: 1,
  USD: 36.5,
  EUR: 39.8,
  USDT: 37.1
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
  USD: "USD BCV (simulado)",
  EUR: "EUR BCV (simulado)",
  USDT: "USDT Binance (simulado)"
};

const currencySources = {
  VES: "Moneda base",
  USD: "BCV simulado",
  EUR: "BCV simulado",
  USDT: "Binance simulado"
};

document.addEventListener("DOMContentLoaded", () => {
  cargarDatos();
  cargarTasas();
  cargarConfiguracionMoneda();
  cargarCategorias();
  cargarMetaAhorro();
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

function configurarFecha() {
  const dateInput = document.getElementById("date");
  if (dateInput && !dateInput.value) dateInput.valueAsDate = new Date();

  const casheaDate = document.getElementById("casheaDate");
  if (casheaDate && !casheaDate.value) casheaDate.valueAsDate = new Date();

  const firstPaymentDate = document.getElementById("casheaFirstPaymentDate");
  if (firstPaymentDate && !firstPaymentDate.value) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    firstPaymentDate.value = nextMonth.toISOString().slice(0, 10);
  }
}

function inicializarEventos() {
  document.getElementById("transactionForm")?.addEventListener("submit", guardarTransaccion);
  document.getElementById("budgetForm")?.addEventListener("submit", agregarPresupuesto);
  document.getElementById("categoryForm")?.addEventListener("submit", agregarCategoriaPersonalizada);
  document.getElementById("savingGoalForm")?.addEventListener("submit", guardarMetaAhorro);
  document.getElementById("casheaForm")?.addEventListener("submit", guardarCompraCashea);
  document.getElementById("filterText")?.addEventListener("input", filtrarTransacciones);
  document.getElementById("filterCategory")?.addEventListener("change", filtrarTransacciones);
  document.getElementById("filterType")?.addEventListener("change", filtrarTransacciones);
  document.getElementById("amount")?.addEventListener("input", actualizarVistaConversion);
  document.getElementById("transactionCurrency")?.addEventListener("change", actualizarVistaConversion);
}

function actualizarEncabezado() {
  const ahoraCaracas = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Caracas" })
  );

  const hora = ahoraCaracas.getHours();
  let saludo = "Hola";

  if (hora >= 5 && hora < 12) saludo = "Buenos días";
  else if (hora >= 12 && hora < 19) saludo = "Buenas tardes";
  else saludo = "Buenas noches";

  const titulo = document.getElementById("mainGreeting");
  const subtitulo = document.getElementById("mainSubtitle");

  if (titulo) titulo.textContent = `${saludo}, Paula`;
  if (subtitulo) subtitulo.textContent = "Bienvenida a tu Gestor de Finanzas Personal";
}

function actualizarBotonTema() {
  const button = document.querySelector(".header-buttons .btn.btn-secondary");
  if (!button) return;
  const isLight = document.body.classList.contains("light-mode");
  button.textContent = isLight ? "Tema oscuro" : "Tema claro";
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
  mostrarAlertasCashea();
  mostrarComprasCashea();
  actualizarGraficos();
  actualizarVistaConversion();
  actualizarBotonTema();
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

  sourceEl.textContent = `Fuente: ${currencySources[currency]}`;

  if (isNaN(amount) || amount <= 0) {
    listEl.innerHTML = '<p class="empty-message">Ingresa un monto para ver conversiones</p>';
    return;
  }

  const amountVES = convertToVES(amount, currency);
  const currencies = ["VES", "USD", "EUR", "USDT"];

  const tasaBase = currencies
    .filter(code => code !== currency)
    .map(code => {
      const converted = convertFromVES(amountVES, code);
      return `<div class="conversion-item"><strong>${formatMoney(amount, currency)}</strong> = <strong>${formatMoney(converted, code)}</strong></div>`;
    })
    .join("");

  const oneUnitVES = convertToVES(1, currency);
  const oneUnitLines = currencies
    .map(code => `<div class="conversion-item">1 ${currency} = ${formatMoney(convertFromVES(oneUnitVES, code), code)}</div>`)
    .join("");

  listEl.innerHTML = `
    <div class="conversion-item"><strong>Monto en VES interno:</strong> ${formatMoney(amountVES, "VES")}</div>
    ${tasaBase}
    <div class="conversion-item"><strong>Referencia por unidad:</strong></div>
    ${oneUnitLines}
  `;
}

function getCategoryName(key) {
  return categories[key]?.name || key;
}

function getCategoryEmoji(key) {
  return categories[key]?.emoji || "📁";
}

function llenarSelectsCategorias() {
  const categoryOptions = Object.entries(categories)
    .map(([key, value]) => `<option value="${key}">${value.emoji} ${value.name}</option>`)
    .join("");

  ["category", "budgetCategory", "filterCategory", "casheaCategory"].forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;

    const current = select.value;
    select.innerHTML = id === "filterCategory"
      ? `<option value="">Todas las categorías</option>${categoryOptions}`
      : `<option value="">Selecciona una categoría</option>${categoryOptions}`;

    if (current && categories[current]) select.value = current;
  });
}

function agregarCategoriaPersonalizada(e) {
  e.preventDefault();

  const name = document.getElementById("newCategoryName")?.value.trim();
  const emoji = document.getElementById("newCategoryEmoji")?.value.trim();
  const key = normalizarClaveCategoria(name || "");

  if (!name || !emoji) {
    alert("Completa el nombre y el emoji.");
    return;
  }

  if (categories[key]) {
    alert("Ya existe una categoría con ese nombre.");
    return;
  }

  categories[key] = { name, emoji, custom: true };
  guardarCategorias();
  document.getElementById("categoryForm")?.reset();
  renderTodo();
  alert("✅ Categoría agregada.");
}

function eliminarCategoriaPersonalizada(key) {
  if (!categories[key] || !categories[key].custom) return;

  const usadaEnTransacciones = transactions.some(t => t.category === key);
  const usadaEnPresupuestos = Object.prototype.hasOwnProperty.call(budgets, key);
  const usadaEnCashea = casheaPurchases.some(item => item.category === key);

  if (usadaEnTransacciones || usadaEnPresupuestos || usadaEnCashea) {
    alert("No puedes eliminar esta categoría porque ya está en uso.");
    return;
  }

  if (!confirm("¿Deseas eliminar esta categoría personalizada?")) return;

  delete categories[key];
  guardarCategorias();
  renderTodo();
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

function normalizarClaveCategoria(texto) {
  return texto.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sumarMeses(fechaTexto, cantidadMeses) {
  const [year, month, day] = fechaTexto.split("-").map(Number);
  const fecha = new Date(year, month - 1 + cantidadMeses, day);
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const dd = String(fecha.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

function eliminarTransaccionCashea(casheaPurchaseId, cuotaNumero = null, esInicial = false) {
  transactions = transactions.filter(t => !(
    t.origin === "cashea" &&
    t.casheaPurchaseId === casheaPurchaseId &&
    t.cuotaNumero === cuotaNumero &&
    Boolean(t.esInicial) === Boolean(esInicial)
  ));
}

function guardarTransaccion(e) {
  e.preventDefault();

  const id = document.getElementById("transactionId")?.value;
  const description = document.getElementById("description")?.value.trim();
  const amount = parseFloat(document.getElementById("amount")?.value);
  const transactionCurrency = document.getElementById("transactionCurrency")?.value;
  const category = document.getElementById("category")?.value;
  const type = document.getElementById("type")?.value;
  const date = document.getElementById("date")?.value;
  const notes = document.getElementById("notes")?.value.trim();

  if (!description || !category || !type || !date || !transactionCurrency || isNaN(amount) || amount <= 0) {
    alert("Completa todos los campos correctamente.");
    return;
  }

  const payload = {
    description,
    amountOriginal: amount,
    currency: transactionCurrency,
    amountVES: convertToVES(amount, transactionCurrency),
    category,
    type,
    date,
    notes: notes || ""
  };

  if (id) {
    const idNumber = Number(id);
    const index = transactions.findIndex(t => t.id === idNumber);

    if (index === -1) {
      alert("No se encontró la transacción a editar.");
      return;
    }

    if (transactions[index].origin === "cashea") {
      alert("Las transacciones automáticas de Cashea no se editan desde aquí.");
      return;
    }

    transactions[index] = { ...transactions[index], ...payload };
    alert("✅ Transacción editada.");
  } else {
    transactions.push({ id: Date.now(), ...payload });
    alert("✅ Transacción agregada.");
  }

  guardarDatos();
  limpiarFormularioTransaccion();
  llenarMesesReporte();
  renderTodo();
  filtrarTransacciones();
}

function editarTransaccion(id) {
  const t = transactions.find(item => item.id === id);
  if (!t) {
    alert("No se pudo cargar la transacción.");
    return;
  }

  if (t.origin === "cashea") {
    alert("Esta transacción fue generada automáticamente por Cashea. Debes gestionarla desde la pestaña Cashea.");
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
}

function limpiarFormularioTransaccion() {
  document.getElementById("transactionForm")?.reset();
  document.getElementById("transactionId").value = "";
  document.getElementById("transactionFormTitle").textContent = "Nueva Transacción";
  document.getElementById("submitTransactionBtn").textContent = "Agregar Transacción";
  document.getElementById("cancelEditBtn").classList.add("hidden");
  document.getElementById("transactionCurrency").value = "VES";

  const formSection = document.getElementById("transactionForm")?.closest(".form-section");
  if (formSection) formSection.classList.remove("editing");

  configurarFecha();
  actualizarVistaConversion();
}

function eliminarTransaccion(id) {
  const transaccion = transactions.find(t => t.id === id);
  if (!transaccion) return;

  if (transaccion.origin === "cashea") {
    alert("Esta transacción fue generada automáticamente por Cashea. Debes cambiarla desde la compra Cashea asociada.");
    return;
  }

  if (!confirm("¿Deseas eliminar esta transacción?")) return;

  transactions = transactions.filter(t => t.id !== id);
  guardarDatos();
  llenarMesesReporte();
  renderTodo();
  filtrarTransacciones();
}

function mostrarTransacciones(listaPersonalizada = null) {
  const lista = document.getElementById("transactionsList");
  if (!lista) return;

  const base = listaPersonalizada || [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (base.length === 0) {
    lista.innerHTML = '<p class="empty-message">No hay transacciones registradas</p>';
    return;
  }

  lista.innerHTML = base.map(t => {
    const visibleAmount = convertFromVES(t.amountVES, displayCurrency);
    const origenCashea = t.origin === "cashea"
      ? `<div class="transaction-notes">Generada automáticamente desde Cashea</div>`
      : "";

    return `
      <div class="transaction-item ${t.type}">
        <div class="transaction-info">
          <div class="transaction-category">${getCategoryEmoji(t.category)} ${escapeHtml(getCategoryName(t.category))}</div>
          <div class="transaction-description">${escapeHtml(t.description)}</div>
          <div class="transaction-date">${formatearFecha(t.date)}</div>
          <div class="transaction-original">
            Original: ${formatMoney(t.amountOriginal ?? t.amountVES, t.currency || "VES")} · ${currencyLabels[t.currency || "VES"]}
          </div>
          ${t.notes ? `<div class="transaction-notes">${escapeHtml(t.notes)}</div>` : ""}
          ${origenCashea}
        </div>
        <div class="transaction-amount ${t.type}">
          ${t.type === "gasto" ? "-" : "+"}${formatMoney(visibleAmount, displayCurrency)}
        </div>
        <div class="transaction-actions">
          <button class="btn btn-warning btn-small" onclick="editarTransaccion(${t.id})">Editar</button>
          <button class="btn btn-danger btn-small" onclick="eliminarTransaccion(${t.id})">Eliminar</button>
        </div>
      </div>
    `;
  }).join("");
}

function filtrarTransacciones() {
  const texto = document.getElementById("filterText")?.value.toLowerCase() || "";
  const categoria = document.getElementById("filterCategory")?.value || "";
  const tipo = document.getElementById("filterType")?.value || "";

  const filtradas = transactions
    .filter(t => {
      const textoBase = `${t.description} ${t.notes || ""} ${getCategoryName(t.category)} ${t.currency || ""}`.toLowerCase();
      return textoBase.includes(texto) &&
        (!categoria || t.category === categoria) &&
        (!tipo || t.type === tipo);
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
  if (document.getElementById("filterText")) document.getElementById("filterText").value = "";
  if (document.getElementById("filterCategory")) document.getElementById("filterCategory").value = "";
  if (document.getElementById("filterType")) document.getElementById("filterType").value = "";
  mostrarTransacciones();
}

function agregarPresupuesto(e) {
  e.preventDefault();

  const category = document.getElementById("budgetCategory")?.value;
  const amount = parseFloat(document.getElementById("budgetAmount")?.value);
  const currency = document.getElementById("budgetCurrency")?.value;

  if (!category || !currency || isNaN(amount) || amount <= 0) {
    alert("Ingresa un presupuesto válido.");
    return;
  }

  budgets[category] = {
    amountOriginal: amount,
    currency,
    amountVES: convertToVES(amount, currency)
  };

  guardarDatos();
  document.getElementById("budgetForm")?.reset();
  document.getElementById("budgetCurrency").value = "VES";
  renderTodo();
  alert("✅ Presupuesto guardado.");
}

function eliminarPresupuesto(category) {
  if (!confirm("¿Deseas eliminar este presupuesto?")) return;
  delete budgets[category];
  guardarDatos();
  renderTodo();
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
          <small>Gastado: ${formatMoney(convertFromVES(estado.spent, displayCurrency), displayCurrency)} / Presupuesto visible: ${formatMoney(convertFromVES(estado.budgetAmountVES, displayCurrency), displayCurrency)}</small>
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

  const alertas = Object.keys(budgets).map(category => {
    const estado = obtenerEstadoPresupuesto(category);
    if (estado.exceeded) return `<div class="alert-box danger">Has superado el presupuesto de ${escapeHtml(getCategoryName(category))} (${estado.percent.toFixed(0)}%)</div>`;
    if (estado.warning) return `<div class="alert-box warning">Estás cerca del límite en ${escapeHtml(getCategoryName(category))} (${estado.percent.toFixed(0)}%)</div>`;
    return "";
  }).filter(Boolean);

  contenedor.innerHTML = alertas.join("");
}

function actualizarResumen() {
  const totalIncomeVES = transactions.filter(t => t.type === "ingreso").reduce((sum, t) => sum + t.amountVES, 0);
  const totalExpenseVES = transactions.filter(t => t.type === "gasto").reduce((sum, t) => sum + t.amountVES, 0);
  const balanceVES = totalIncomeVES - totalExpenseVES;

  const totalBudgetVES = Object.values(budgets).reduce((sum, item) => {
    if (typeof item === "number") return sum + item;
    return sum + (item?.amountVES || 0);
  }, 0);

  const budgetUsed = totalBudgetVES > 0 ? (totalExpenseVES / totalBudgetVES) * 100 : 0;

  document.getElementById("totalIncome").textContent = formatMoney(convertFromVES(totalIncomeVES, displayCurrency), displayCurrency);
  document.getElementById("totalExpense").textContent = formatMoney(convertFromVES(totalExpenseVES, displayCurrency), displayCurrency);
  document.getElementById("balance").textContent = formatMoney(convertFromVES(balanceVES, displayCurrency), displayCurrency);
  document.getElementById("budgetUsed").textContent = `${budgetUsed.toFixed(0)}%`;
}

function actualizarResumenAhorro() {
  const totalIncomeVES = transactions.filter(t => t.type === "ingreso").reduce((sum, t) => sum + t.amountVES, 0);
  const totalExpenseVES = transactions.filter(t => t.type === "gasto").reduce((sum, t) => sum + t.amountVES, 0);
  const ahorroActualVES = totalIncomeVES - totalExpenseVES;
  const faltanteVES = Math.max(savingGoal - ahorroActualVES, 0);
  const progress = savingGoal > 0 ? Math.min((ahorroActualVES / savingGoal) * 100, 100) : 0;

  document.getElementById("savingGoalAmount").textContent = formatMoney(convertFromVES(savingGoal, displayCurrency), displayCurrency);
  document.getElementById("currentSavings").textContent = formatMoney(convertFromVES(ahorroActualVES, displayCurrency), displayCurrency);
  document.getElementById("remainingSavings").textContent = formatMoney(convertFromVES(faltanteVES, displayCurrency), displayCurrency);
  document.getElementById("savingsProgressText").textContent = `${progress.toFixed(0)}%`;
  document.getElementById("savingGoalBar").style.width = `${progress}%`;
}

function guardarMetaAhorro(e) {
  e.preventDefault();
  const value = parseFloat(document.getElementById("savingGoalInput")?.value);
  const currency = document.getElementById("savingGoalCurrency")?.value;

  if (isNaN(value) || value < 0 || !currency) {
    alert("Ingresa una meta válida.");
    return;
  }

  savingGoal = convertToVES(value, currency);
  localStorage.setItem("savingGoal", JSON.stringify({ amountVES: savingGoal, amountOriginal: value, currency }));
  renderTodo();
  alert("✅ Meta de ahorro guardada.");
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
      if (document.getElementById("savingGoalInput")) document.getElementById("savingGoalInput").value = parsed.amountOriginal ?? parsed.amountVES ?? 0;
      if (document.getElementById("savingGoalCurrency")) document.getElementById("savingGoalCurrency").value = parsed.currency || "VES";
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
        alertas.push(`<div class="alert-box danger">Cuota vencida: ${escapeHtml(purchase.description)} - cuota ${inst.number} (${formatearFecha(inst.dueDate)})</div>`);
      }
    });
  });

  contenedor.innerHTML = alertas.join("");
}

function guardarCompraCashea(e) {
  e.preventDefault();

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
    alert("Completa todos los campos de Cashea.");
    return;
  }

  if (totalOriginal <= 0 || initialOriginal < 0 || installmentsCount <= 0 || installmentOriginal < 0) {
    alert("Los montos de Cashea deben ser válidos.");
    return;
  }

  if (initialOriginal > totalOriginal) {
    alert("La inicial no puede ser mayor al monto total.");
    return;
  }

  const totalCalculado = initialOriginal + installmentOriginal * installmentsCount;
  if (Math.abs(totalCalculado - totalOriginal) > 0.01) {
    if (!confirm("La suma de inicial + cuotas no coincide exactamente con el monto total. ¿Deseas guardar de todos modos?")) return;
  }

  const purchaseId = Date.now();
  const totalVES = convertToVES(totalOriginal, currency);
  const initialVES = convertToVES(initialOriginal, currency);
  const installmentVES = convertToVES(installmentOriginal, currency);

  const installments = Array.from({ length: installmentsCount }, (_, index) => ({
    number: index + 1,
    amountOriginal: installmentOriginal,
    amountVES: installmentVES,
    paid: false,
    dueDate: sumarMeses(firstPaymentDate, index),
    paidDate: null
  }));

  casheaPurchases.push({
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
  });

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

  guardarDatos();
  document.getElementById("casheaForm")?.reset();
  document.getElementById("casheaCurrency").value = "VES";
  configurarFecha();
  llenarMesesReporte();
  renderTodo();
  alert("✅ Compra Cashea guardada con cronograma de cuotas.");
}

function toggleCasheaInstallment(purchaseId, installmentNumber) {
  const purchase = casheaPurchases.find(item => item.id === purchaseId);
  if (!purchase) return;

  const installment = purchase.installments.find(item => item.number === installmentNumber);
  if (!installment) return;

  installment.paid = !installment.paid;
  installment.paidDate = installment.paid ? new Date().toISOString().slice(0, 10) : null;

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
  } else {
    eliminarTransaccionCashea(purchase.id, installment.number, false);
  }

  guardarDatos();
  llenarMesesReporte();
  renderTodo();
}

function eliminarCompraCashea(id) {
  if (!confirm("¿Deseas eliminar esta compra Cashea?")) return;

  eliminarTransaccionCashea(id, null, true);
  const compra = casheaPurchases.find(item => item.id === id);

  if (compra) {
    compra.installments.forEach(inst => eliminarTransaccionCashea(id, inst.number, false));
  }

  casheaPurchases = casheaPurchases.filter(item => item.id !== id);
  guardarDatos();
  llenarMesesReporte();
  renderTodo();
}

function calcularResumenCompraCashea(purchase) {
  const paidInstallmentsVES = purchase.installments.filter(item => item.paid).reduce((sum, item) => sum + item.amountVES, 0);
  const paidTotalVES = purchase.initialVES + paidInstallmentsVES;
  const pendingVES = Math.max(purchase.totalVES - paidTotalVES, 0);
  const pendingInstallments = purchase.installments.filter(item => !item.paid).length;
  const nextInstallment = purchase.installments.find(item => !item.paid) || null;
  const overdueCount = purchase.installments.filter(item => !item.paid && fechaEstaVencida(item.dueDate)).length;

  return { paidTotalVES, pendingVES, pendingInstallments, nextInstallment, overdueCount };
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
              <div class="transaction-original">Monto original: ${formatMoney(purchase.totalOriginal, purchase.currency)} · ${currencyLabels[purchase.currency]}</div>
              <div class="transaction-original">Inicial: ${formatMoney(purchase.initialOriginal, purchase.currency)} · Cuotas: ${purchase.installmentsCount} de ${formatMoney(purchase.installmentOriginal, purchase.currency)}</div>
              <div class="transaction-original">Próxima cuota: ${resumen.nextInstallment ? `#${resumen.nextInstallment.number} - ${formatearFecha(resumen.nextInstallment.dueDate)}` : "Sin cuotas pendientes"}</div>
              ${resumen.overdueCount > 0 ? `<div class="transaction-notes">Tienes ${resumen.overdueCount} cuota(s) vencida(s)</div>` : ""}
            </div>
            <button class="btn btn-danger btn-small" onclick="eliminarCompraCashea(${purchase.id})">Eliminar</button>
          </div>

          <div class="cashea-summary-grid">
            <div class="cashea-mini-card">
              <span>Total</span>
              <strong>${formatMoney(convertFromVES(purchase.totalVES, displayCurrency), displayCurrency)}</strong>
            </div>
            <div class="cashea-mini-card">
              <span>Inicial</span>
              <strong>${formatMoney(convertFromVES(purchase.initialVES, displayCurrency), displayCurrency)}</strong>
            </div>
            <div class="cashea-mini-card">
              <span>Pagado</span>
              <strong>${formatMoney(convertFromVES(resumen.paidTotalVES, displayCurrency), displayCurrency)}</strong>
            </div>
            <div class="cashea-mini-card">
              <span>Pendiente</span>
              <strong>${formatMoney(convertFromVES(resumen.pendingVES, displayCurrency), displayCurrency)}</strong>
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

  document.getElementById("casheaTotalAmount").textContent = formatMoney(convertFromVES(totalVES, displayCurrency), displayCurrency);
  document.getElementById("casheaPaidAmount").textContent = formatMoney(convertFromVES(paidVES, displayCurrency), displayCurrency);
  document.getElementById("casheaPendingAmount").textContent = formatMoney(convertFromVES(pendingVES, displayCurrency), displayCurrency);
  document.getElementById("casheaNextPayment").textContent = nextPayment ? formatearFecha(nextPayment.dueDate) : "Sin cuotas";
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

  const labels = Object.keys(gastosPorCategoria).map(cat => `${getCategoryEmoji(cat)} ${getCategoryName(cat)}`);
  const data = Object.values(gastosPorCategoria).map(valor => convertFromVES(valor, displayCurrency));

  const ctx = document.getElementById("gastosChart");
  if (!ctx) return;
  if (gastosChart) gastosChart.destroy();

  gastosChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data,
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
      <div class="report-item-details">
        <div>
          <div class="report-detail-label">Ingresos</div>
          <div class="report-detail-value">${formatMoney(convertFromVES(ingresosVES, displayCurrency), displayCurrency)}</div>
        </div>
        <div>
          <div class="report-detail-label">Gastos</div>
          <div class="report-detail-value">${formatMoney(convertFromVES(gastosVES, displayCurrency), displayCurrency)}</div>
        </div>
        <div>
          <div class="report-detail-label">Balance</div>
          <div class="report-detail-value">${formatMoney(convertFromVES(balanceVES, displayCurrency), displayCurrency)}</div>
        </div>
        <div>
          <div class="report-detail-label">Mayor gasto</div>
          <div class="report-detail-value">${topCategory}</div>
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
  if (typeof mapa[tab] !== "undefined" && botones[mapa[tab]]) {
    botones[mapa[tab]].classList.add("active");
  }

  if (tab === "graficos") setTimeout(actualizarGraficos, 100);
}

function toggleDarkMode() {
  document.body.classList.toggle("light-mode");
  localStorage.setItem("themeMode", document.body.classList.contains("light-mode") ? "light" : "dark");
  actualizarBotonTema();
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
}

function cargarConfiguracionMoneda() {
  displayCurrency = localStorage.getItem("displayCurrency") || "VES";
  const select = document.getElementById("displayCurrency");
  if (select) select.value = displayCurrency;
}

function guardarTasas() {
  const usd = parseFloat(document.getElementById("rateUSD")?.value);
  const eur = parseFloat(document.getElementById("rateEUR")?.value);
  const usdt = parseFloat(document.getElementById("rateUSDT")?.value);

  if ([usd, eur, usdt].some(v => isNaN(v) || v <= 0)) {
    alert("Ingresa tasas válidas mayores a 0.");
    return;
  }

  exchangeRates.USD = usd;
  exchangeRates.EUR = eur;
  exchangeRates.USDT = usdt;

  localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates));
  pintarFormularioTasas();
  renderTodo();
  generarReporteSiExiste();
  alert("✅ Tasas guardadas correctamente.");
}

function cargarTasas() {
  const saved = localStorage.getItem("exchangeRates");
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    exchangeRates = { ...exchangeRates, ...parsed, VES: 1 };
  } catch {
    exchangeRates.VES = 1;
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
  localStorage.setItem("finanzasData", JSON.stringify({ transactions, budgets, casheaPurchases }));
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
}

function exportarCSV() {
  if (transactions.length === 0 && casheaPurchases.length === 0) {
    alert("No hay datos para exportar.");
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
}

function escaparCSV(valor) {
  const texto = String(valor).replace(/"/g, '""');
  return `"${texto}"`;
}

function limpiarDatos() {
  const confirmar = confirm("Esto eliminará todos tus datos. ¿Deseas continuar?");
  if (!confirmar) return;

  transactions = [];
  budgets = {};
  casheaPurchases = [];
  savingGoal = 0;

  localStorage.removeItem("savingGoal");
  guardarDatos();
  limpiarFormularioTransaccion();
  llenarMesesReporte();
  renderTodo();

  document.getElementById("savingGoalInput").value = "";
  document.getElementById("savingGoalCurrency").value = "VES";
  document.getElementById("budgetCurrency").value = "VES";
  document.getElementById("casheaForm")?.reset();

  const reportContent = document.getElementById("reportContent");
  if (reportContent) {
    reportContent.innerHTML = '<p class="empty-message">Selecciona un mes para ver el reporte</p>';
  }

  configurarFecha();
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
