let transactions = [];
let budgets = {};
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

document.addEventListener("DOMContentLoaded", () => {
  cargarDatos();
  cargarTasas();
  cargarConfiguracionMoneda();
  cargarCategorias();
  cargarMetaAhorro();
  inicializarTema();
  configurarFecha();
  inicializarEventos();
  llenarSelectsCategorias();
  llenarMesesReporte();
  pintarFormularioTasas();
  renderTodo();
});

function configurarFecha() {
  const dateInput = document.getElementById("date");
  if (dateInput && !dateInput.value) dateInput.valueAsDate = new Date();
}

function inicializarEventos() {
  document.getElementById("transactionForm").addEventListener("submit", guardarTransaccion);
  document.getElementById("budgetForm").addEventListener("submit", agregarPresupuesto);
  document.getElementById("categoryForm").addEventListener("submit", agregarCategoriaPersonalizada);
  document.getElementById("savingGoalForm").addEventListener("submit", guardarMetaAhorro);
  document.getElementById("filterText").addEventListener("input", filtrarTransacciones);
  document.getElementById("filterCategory").addEventListener("change", filtrarTransacciones);
  document.getElementById("filterType").addEventListener("change", filtrarTransacciones);
}

function renderTodo() {
  llenarSelectsCategorias();
  renderCategoriasPersonalizadas();
  mostrarTransacciones();
  mostrarPresupuestos();
  mostrarAlertasPresupuesto();
  actualizarResumen();
  actualizarResumenAhorro();
  actualizarGraficos();
}

function formatMoney(value, currency = displayCurrency) {
  const localeMap = {
    VES: "es-VE",
    USD: "en-US",
    EUR: "es-ES",
    USDT: "en-US"
  };

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

  const transactionSelect = document.getElementById("category");
  const budgetSelect = document.getElementById("budgetCategory");
  const filterSelect = document.getElementById("filterCategory");

  if (transactionSelect) {
    const current = transactionSelect.value;
    transactionSelect.innerHTML = `<option value="">Selecciona una categoría</option>${categoryOptions}`;
    if (current && categories[current]) transactionSelect.value = current;
  }

  if (budgetSelect) {
    const current = budgetSelect.value;
    budgetSelect.innerHTML = `<option value="">Selecciona una categoría</option>${categoryOptions}`;
    if (current && categories[current]) budgetSelect.value = current;
  }

  if (filterSelect) {
    const current = filterSelect.value;
    filterSelect.innerHTML = `<option value="">Todas las categorías</option>${categoryOptions}`;
    if (current && categories[current]) filterSelect.value = current;
  }
}

function agregarCategoriaPersonalizada(e) {
  e.preventDefault();

  const name = document.getElementById("newCategoryName").value.trim();
  const emoji = document.getElementById("newCategoryEmoji").value.trim();
  const key = normalizarClaveCategoria(name);

  if (!name || !emoji) {
    alert("Completa el nombre y el emoji.");
    return;
  }

  if (categories[key]) {
    alert("Ya existe una categoría con ese nombre.");
    return;
  }

  categories[key] = {
    name,
    emoji,
    custom: true
  };

  guardarCategorias();
  document.getElementById("categoryForm").reset();
  renderTodo();
  alert("✅ Categoría agregada.");
}

function eliminarCategoriaPersonalizada(key) {
  if (!categories[key] || !categories[key].custom) return;

  const usadaEnTransacciones = transactions.some(t => t.category === key);
  const usadaEnPresupuestos = Object.prototype.hasOwnProperty.call(budgets, key);

  if (usadaEnTransacciones || usadaEnPresupuestos) {
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
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function guardarTransaccion(e) {
  e.preventDefault();

  const id = document.getElementById("transactionId").value;
  const description = document.getElementById("description").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const transactionCurrency = document.getElementById("transactionCurrency").value;
  const category = document.getElementById("category").value;
  const type = document.getElementById("type").value;
  const date = document.getElementById("date").value;
  const notes = document.getElementById("notes").value.trim();

  if (!description || !category || !type || !date || !transactionCurrency || isNaN(amount) || amount <= 0) {
    alert("Completa todos los campos correctamente.");
    return;
  }

  const amountVES = convertToVES(amount, transactionCurrency);

  const payload = {
    description,
    amountOriginal: amount,
    currency: transactionCurrency,
    amountVES,
    category,
    type,
    date,
    notes
  };

  if (id) {
    transactions = transactions.map(t => t.id === Number(id) ? { ...t, ...payload } : t);
    alert("✅ Transacción editada.");
  } else {
    transactions.push({
      id: Date.now(),
      ...payload
    });
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
  if (!t) return;

  document.getElementById("transactionId").value = t.id;
  document.getElementById("description").value = t.description;
  document.getElementById("amount").value = t.amountOriginal ?? t.amountVES;
  document.getElementById("transactionCurrency").value = t.currency || "VES";
  document.getElementById("category").value = t.category;
  document.getElementById("type").value = t.type;
  document.getElementById("date").value = t.date;
  document.getElementById("notes").value = t.notes || "";

  document.getElementById("transactionFormTitle").textContent = "✏️ Editar Transacción";
  document.getElementById("submitTransactionBtn").textContent = "Guardar Cambios";
  document.getElementById("cancelEditBtn").classList.remove("hidden");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelarEdicion() {
  limpiarFormularioTransaccion();
}

function limpiarFormularioTransaccion() {
  document.getElementById("transactionForm").reset();
  document.getElementById("transactionId").value = "";
  document.getElementById("transactionFormTitle").textContent = "➕ Nueva Transacción";
  document.getElementById("submitTransactionBtn").textContent = "Agregar Transacción";
  document.getElementById("cancelEditBtn").classList.add("hidden");
  document.getElementById("transactionCurrency").value = "VES";
  configurarFecha();
}

function eliminarTransaccion(id) {
  if (!confirm("¿Deseas eliminar esta transacción?")) return;
  transactions = transactions.filter(t => t.id !== id);
  guardarDatos();
  llenarMesesReporte();
  renderTodo();
  filtrarTransacciones();
}

function mostrarTransacciones(listaPersonalizada = null) {
  const lista = document.getElementById("transactionsList");
  const base = listaPersonalizada || [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (base.length === 0) {
    lista.innerHTML = '<p class="empty-message">No hay transacciones registradas</p>';
    return;
  }

  lista.innerHTML = base.map(t => {
    const visibleAmount = convertFromVES(t.amountVES, displayCurrency);
    return `
      <div class="transaction-item ${t.type}">
        <div class="transaction-info">
          <div class="transaction-category">${getCategoryEmoji(t.category)} ${escapeHtml(getCategoryName(t.category))}</div>
          <div class="transaction-description">${escapeHtml(t.description)}</div>
          <div class="transaction-date">${formatearFecha(t.date)}</div>
          <div class="transaction-original">
            Original: ${formatMoney(t.amountOriginal ?? t.amountVES, t.currency || "VES")} · ${currencyLabels[t.currency || "VES"]}
          </div>
          ${t.notes ? `<div class="transaction-notes">📝 ${escapeHtml(t.notes)}</div>` : ""}
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
  const texto = document.getElementById("filterText").value.toLowerCase();
  const categoria = document.getElementById("filterCategory").value;
  const tipo = document.getElementById("filterType").value;

  const filtradas = transactions
    .filter(t => {
      const textoBase = `${t.description} ${t.notes || ""} ${getCategoryName(t.category)} ${t.currency || ""}`.toLowerCase();
      const coincideTexto = textoBase.includes(texto);
      const coincideCategoria = !categoria || t.category === categoria;
      const coincideTipo = !tipo || t.type === tipo;
      return coincideTexto && coincideCategoria && coincideTipo;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filtradas.length === 0) {
    document.getElementById("transactionsList").innerHTML =
      '<p class="empty-message">No hay transacciones que coincidan con los filtros</p>';
    return;
  }

  mostrarTransacciones(filtradas);
}

function reiniciarFiltros() {
  document.getElementById("filterText").value = "";
  document.getElementById("filterCategory").value = "";
  document.getElementById("filterType").value = "";
  mostrarTransacciones();
}

function agregarPresupuesto(e) {
  e.preventDefault();

  const category = document.getElementById("budgetCategory").value;
  const amount = parseFloat(document.getElementById("budgetAmount").value);

  if (!category || isNaN(amount) || amount <= 0) {
    alert("Ingresa un presupuesto válido.");
    return;
  }

  budgets[category] = amount;
  guardarDatos();
  document.getElementById("budgetForm").reset();
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
  const budgetAmount = budgets[category];
  const spent = transactions
    .filter(t => t.category === category && t.type === "gasto")
    .reduce((sum, t) => sum + t.amountVES, 0);

  const percent = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

  return {
    budgetAmount,
    spent,
    percent,
    warning: percent >= 80 && percent < 100,
    exceeded: percent >= 100
  };
}

function mostrarPresupuestos() {
  const lista = document.getElementById("budgetsList");
  const keys = Object.keys(budgets);

  if (keys.length === 0) {
    lista.innerHTML = '<p class="empty-message">No hay presupuestos establecidos</p>';
    return;
  }

  lista.innerHTML = keys.map(category => {
    const estado = obtenerEstadoPresupuesto(category);
    const spentVisible = convertFromVES(estado.spent, displayCurrency);
    const budgetVisible = convertFromVES(estado.budgetAmount, displayCurrency);

    return `
      <div class="budget-item ${estado.warning ? "alerta" : ""} ${estado.exceeded ? "excedido" : ""}">
        <div>
          <div><strong>${getCategoryEmoji(category)} ${escapeHtml(getCategoryName(category))}</strong></div>
          <div class="budget-progress">
            <div class="budget-progress-bar ${estado.exceeded ? "exceeded" : estado.warning ? "warning" : ""}" style="width:${Math.min(estado.percent, 100)}%"></div>
          </div>
          <small>Gastado: ${formatMoney(spentVisible, displayCurrency)} / Presupuesto: ${formatMoney(budgetVisible, displayCurrency)}</small>
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
  const keys = Object.keys(budgets);

  if (keys.length === 0) {
    contenedor.innerHTML = "";
    return;
  }

  const alertas = keys.map(category => {
    const estado = obtenerEstadoPresupuesto(category);

    if (estado.exceeded) {
      return `<div class="alert-box danger">🚨 Has superado el presupuesto de ${escapeHtml(getCategoryName(category))} (${estado.percent.toFixed(0)}%)</div>`;
    }

    if (estado.warning) {
      return `<div class="alert-box warning">⚠️ Estás cerca del límite en ${escapeHtml(getCategoryName(category))} (${estado.percent.toFixed(0)}%)</div>`;
    }

    return "";
  }).filter(Boolean);

  contenedor.innerHTML = alertas.join("");
}

function actualizarResumen() {
  const totalIncomeVES = transactions
    .filter(t => t.type === "ingreso")
    .reduce((sum, t) => sum + t.amountVES, 0);

  const totalExpenseVES = transactions
    .filter(t => t.type === "gasto")
    .reduce((sum, t) => sum + t.amountVES, 0);

  const balanceVES = totalIncomeVES - totalExpenseVES;
  const totalBudgetVES = Object.values(budgets).reduce((sum, n) => sum + n, 0);
  const budgetUsed = totalBudgetVES > 0 ? (totalExpenseVES / totalBudgetVES) * 100 : 0;

  document.getElementById("totalIncome").textContent = formatMoney(convertFromVES(totalIncomeVES, displayCurrency), displayCurrency);
  document.getElementById("totalExpense").textContent = formatMoney(convertFromVES(totalExpenseVES, displayCurrency), displayCurrency);
  document.getElementById("balance").textContent = formatMoney(convertFromVES(balanceVES, displayCurrency), displayCurrency);
  document.getElementById("budgetUsed").textContent = `${budgetUsed.toFixed(0)}%`;
}

function actualizarResumenAhorro() {
  const totalIncomeVES = transactions
    .filter(t => t.type === "ingreso")
    .reduce((sum, t) => sum + t.amountVES, 0);

  const totalExpenseVES = transactions
    .filter(t => t.type === "gasto")
    .reduce((sum, t) => sum + t.amountVES, 0);

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
  const value = parseFloat(document.getElementById("savingGoalInput").value);

  if (isNaN(value) || value < 0) {
    alert("Ingresa una meta válida.");
    return;
  }

  savingGoal = value;
  localStorage.setItem("savingGoal", JSON.stringify(savingGoal));
  renderTodo();
  alert("✅ Meta de ahorro guardada.");
}

function cargarMetaAhorro() {
  const saved = localStorage.getItem("savingGoal");
  if (!saved) return;
  try {
    savingGoal = JSON.parse(saved) || 0;
    const input = document.getElementById("savingGoalInput");
    if (input) input.value = savingGoal;
  } catch {
    savingGoal = 0;
  }
}

function actualizarGraficos() {
  actualizarGraficoGastos();
  actualizarGraficoBalance();
}

function actualizarGraficoGastos() {
  const gastosPorCategoria = {};

  transactions
    .filter(t => t.type === "gasto")
    .forEach(t => {
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
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function actualizarGraficoBalance() {
  const ingresosVES = transactions
    .filter(t => t.type === "ingreso")
    .reduce((sum, t) => sum + t.amountVES, 0);

  const gastosVES = transactions
    .filter(t => t.type === "gasto")
    .reduce((sum, t) => sum + t.amountVES, 0);

  const ctx = document.getElementById("balanceChart");
  if (!ctx) return;
  if (balanceChart) balanceChart.destroy();

  balanceChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Ingresos", "Gastos"],
      datasets: [{
        label: `Monto en ${displayCurrency}`,
        data: [
          convertFromVES(ingresosVES, displayCurrency),
          convertFromVES(gastosVES, displayCurrency)
        ],
        backgroundColor: ["#10b981", "#ef4444"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function llenarMesesReporte() {
  const select = document.getElementById("reportMonth");
  if (!select) return;

  const mesesUnicos = [...new Set(transactions.map(t => t.date.slice(0, 7)))].sort().reverse();
  select.innerHTML = '<option value="">Selecciona un mes</option>' +
    mesesUnicos.map(mes => `<option value="${mes}">${formatearMes(mes)}</option>`).join("");
}

function generarReporte() {
  const month = document.getElementById("reportMonth").value;
  const contenedor = document.getElementById("reportContent");

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

  document.getElementById(`tab-${tab}`).classList.add("active");

  const botones = document.querySelectorAll(".tab-btn");
  const mapa = { transacciones: 0, graficos: 1, reportes: 2, configuracion: 3 };
  botones[mapa[tab]].classList.add("active");

  if (tab === "graficos") setTimeout(actualizarGraficos, 100);
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", JSON.stringify(document.body.classList.contains("dark-mode")));
}

function inicializarTema() {
  const darkMode = JSON.parse(localStorage.getItem("darkMode") || "false");
  if (darkMode) document.body.classList.add("dark-mode");
}

function guardarConfiguracionMoneda() {
  displayCurrency = document.getElementById("displayCurrency").value;
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
  const usd = parseFloat(document.getElementById("rateUSD").value);
  const eur = parseFloat(document.getElementById("rateEUR").value);
  const usdt = parseFloat(document.getElementById("rateUSDT").value);

  if ([usd, eur, usdt].some(v => isNaN(v) || v <= 0)) {
    alert("Ingresa tasas válidas mayores a 0.");
    return;
  }

  exchangeRates.USD = usd;
  exchangeRates.EUR = eur;
  exchangeRates.USDT = usdt;

  localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates));
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
  document.getElementById("rateUSD").value = exchangeRates.USD;
  document.getElementById("rateEUR").value = exchangeRates.EUR;
  document.getElementById("rateUSDT").value = exchangeRates.USDT;
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
  const month = document.getElementById("reportMonth").value;
  if (month) generarReporte();
}

function guardarDatos() {
  localStorage.setItem("finanzasData", JSON.stringify({ transactions, budgets }));
}

function cargarDatos() {
  const datos = localStorage.getItem("finanzasData");
  if (!datos) return;

  try {
    const parsed = JSON.parse(datos);
    transactions = (parsed.transactions || []).map(t => ({
      ...t,
      amountOriginal: t.amountOriginal ?? t.amount ?? t.amountVES ?? 0,
      currency: t.currency || "VES",
      amountVES: t.amountVES ?? t.amount ?? 0,
      notes: t.notes || ""
    }));
    budgets = parsed.budgets || {};
  } catch {
    transactions = [];
    budgets = {};
  }
}

function descargarDatos() {
  const datos = {
    transactions,
    budgets,
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
  if (transactions.length === 0) {
    alert("No hay transacciones para exportar.");
    return;
  }

  const encabezados = [
    "id","descripcion","monto_original","moneda_original","monto_en_ves",
    "categoria","tipo","fecha","notas"
  ];

  const filas = transactions.map(t => [
    t.id,
    escaparCSV(t.description),
    t.amountOriginal,
    t.currency,
    t.amountVES,
    escaparCSV(getCategoryName(t.category)),
    t.type,
    t.date,
    escaparCSV(t.notes || "")
  ]);

  const csv = [encabezados.join(","), ...filas.map(f => f.join(","))].join("\n");
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
  savingGoal = 0;
  localStorage.removeItem("savingGoal");
  guardarDatos();
  limpiarFormularioTransaccion();
  llenarMesesReporte();
  renderTodo();
  document.getElementById("savingGoalInput").value = "";
  document.getElementById("reportContent").innerHTML = '<p class="empty-message">Selecciona un mes para ver el reporte</p>';
}

function formatearFecha(fecha) {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-VE");
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
