let transactions = [];
let budgets = {};
let gastosChart = null;
let balanceChart = null;

const categoryEmojis = {
  alimentacion: "🍔",
  transporte: "🚗",
  servicios: "📱",
  salud: "🏥",
  entretenimiento: "🎮",
  educacion: "📚",
  trabajo: "💼",
  otro: "📌"
};

const categoryNames = {
  alimentacion: "Alimentación",
  transporte: "Transporte",
  servicios: "Servicios",
  salud: "Salud",
  entretenimiento: "Entretenimiento",
  educacion: "Educación",
  trabajo: "Trabajo",
  otro: "Otro"
};

document.addEventListener("DOMContentLoaded", () => {
  cargarDatos();
  inicializarTema();
  configurarFecha();
  inicializarEventos();
  llenarMesesReporte();
  renderTodo();
});

function configurarFecha() {
  const dateInput = document.getElementById("date");
  if (dateInput) dateInput.valueAsDate = new Date();
}

function inicializarEventos() {
  document.getElementById("transactionForm").addEventListener("submit", agregarTransaccion);
  document.getElementById("budgetForm").addEventListener("submit", agregarPresupuesto);
  document.getElementById("filterText").addEventListener("input", filtrarTransacciones);
  document.getElementById("filterCategory").addEventListener("change", filtrarTransacciones);
  document.getElementById("filterType").addEventListener("change", filtrarTransacciones);
}

function renderTodo() {
  mostrarTransacciones();
  mostrarPresupuestos();
  actualizarResumen();
  actualizarGraficos();
}

function agregarTransaccion(e) {
  e.preventDefault();

  const description = document.getElementById("description").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const category = document.getElementById("category").value;
  const type = document.getElementById("type").value;
  const date = document.getElementById("date").value;

  if (!description || !category || !type || !date || isNaN(amount) || amount <= 0) {
    alert("Completa todos los campos correctamente.");
    return;
  }

  const transaction = {
    id: Date.now(),
    description,
    amount,
    category,
    type,
    date
  };

  transactions.push(transaction);
  guardarDatos();
  document.getElementById("transactionForm").reset();
  configurarFecha();
  renderTodo();
  filtrarTransacciones();
  llenarMesesReporte();
  alert("✅ Transacción agregada.");
}

function eliminarTransaccion(id) {
  if (!confirm("¿Deseas eliminar esta transacción?")) return;
  transactions = transactions.filter(t => t.id !== id);
  guardarDatos();
  renderTodo();
  filtrarTransacciones();
  llenarMesesReporte();
}

function mostrarTransacciones(listaPersonalizada = null) {
  const lista = document.getElementById("transactionsList");
  const base = listaPersonalizada || [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (base.length === 0) {
    lista.innerHTML = '<p class="empty-message">No hay transacciones registradas</p>';
    return;
  }

  lista.innerHTML = base.map(t => `
    <div class="transaction-item ${t.type}">
      <div class="transaction-info">
        <div class="transaction-category">${categoryEmojis[t.category]} ${categoryNames[t.category]}</div>
        <div class="transaction-description">${t.description}</div>
        <div class="transaction-date">${formatearFecha(t.date)}</div>
      </div>
      <div class="transaction-amount ${t.type}">
        ${t.type === "gasto" ? "-" : "+"}$${t.amount.toFixed(2)}
      </div>
      <div class="transaction-actions">
        <button class="btn btn-danger btn-small" onclick="eliminarTransaccion(${t.id})">Eliminar</button>
      </div>
    </div>
  `).join("");
}

function filtrarTransacciones() {
  const texto = document.getElementById("filterText").value.toLowerCase();
  const categoria = document.getElementById("filterCategory").value;
  const tipo = document.getElementById("filterType").value;

  const filtradas = transactions
    .filter(t => {
      const coincideTexto =
        t.description.toLowerCase().includes(texto) ||
        categoryNames[t.category].toLowerCase().includes(texto);

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

function mostrarPresupuestos() {
  const lista = document.getElementById("budgetsList");
  const keys = Object.keys(budgets);

  if (keys.length === 0) {
    lista.innerHTML = '<p class="empty-message">No hay presupuestos establecidos</p>';
    return;
  }

  lista.innerHTML = keys.map(category => {
    const budgetAmount = budgets[category];
    const spent = transactions
      .filter(t => t.category === category && t.type === "gasto")
      .reduce((sum, t) => sum + t.amount, 0);

    const percent = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
    const exceeded = spent > budgetAmount;

    return `
      <div class="budget-item">
        <div>
          <div><strong>${categoryEmojis[category]} ${categoryNames[category]}</strong></div>
          <div class="budget-progress">
            <div class="budget-progress-bar ${exceeded ? "exceeded" : ""}" style="width:${Math.min(percent, 100)}%"></div>
          </div>
          <small>Gastado: $${spent.toFixed(2)} / Presupuesto: $${budgetAmount.toFixed(2)}</small>
        </div>
        <div>
          <div>${percent.toFixed(0)}%</div>
          <button class="btn btn-danger btn-small" onclick="eliminarPresupuesto('${category}')">Eliminar</button>
        </div>
      </div>
    `;
  }).join("");
}

function actualizarResumen() {
  const totalIncome = transactions
    .filter(t => t.type === "ingreso")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === "gasto")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;
  const totalBudget = Object.values(budgets).reduce((sum, n) => sum + n, 0);
  const budgetUsed = totalBudget > 0 ? (totalExpense / totalBudget) * 100 : 0;

  document.getElementById("totalIncome").textContent = `$${totalIncome.toFixed(2)}`;
  document.getElementById("totalExpense").textContent = `$${totalExpense.toFixed(2)}`;
  document.getElementById("balance").textContent = `$${balance.toFixed(2)}`;
  document.getElementById("budgetUsed").textContent = `${budgetUsed.toFixed(0)}%`;
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
      gastosPorCategoria[t.category] = (gastosPorCategoria[t.category] || 0) + t.amount;
    });

  const labels = Object.keys(gastosPorCategoria).map(cat => `${categoryEmojis[cat]} ${categoryNames[cat]}`);
  const data = Object.values(gastosPorCategoria);

  const ctx = document.getElementById("gastosChart");
  if (!ctx) return;

  if (gastosChart) gastosChart.destroy();

  gastosChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          "#6366f1", "#8b5cf6", "#10b981", "#f59e0b",
          "#ef4444", "#06b6d4", "#84cc16", "#f97316"
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function actualizarGraficoBalance() {
  const ingresos = transactions
    .filter(t => t.type === "ingreso")
    .reduce((sum, t) => sum + t.amount, 0);

  const gastos = transactions
    .filter(t => t.type === "gasto")
    .reduce((sum, t) => sum + t.amount, 0);

  const ctx = document.getElementById("balanceChart");
  if (!ctx) return;

  if (balanceChart) balanceChart.destroy();

  balanceChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Ingresos", "Gastos"],
      datasets: [{
        label: "Monto",
        data: [ingresos, gastos],
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
  const ingresos = delMes.filter(t => t.type === "ingreso").reduce((s, t) => s + t.amount, 0);
  const gastos = delMes.filter(t => t.type === "gasto").reduce((s, t) => s + t.amount, 0);
  const balance = ingresos - gastos;

  const gastosPorCategoria = {};
  delMes.filter(t => t.type === "gasto").forEach(t => {
    gastosPorCategoria[t.category] = (gastosPorCategoria[t.category] || 0) + t.amount;
  });

  let topCategory = "Sin gastos";
  let topAmount = 0;

  Object.entries(gastosPorCategoria).forEach(([cat, amount]) => {
    if (amount > topAmount) {
      topAmount = amount;
      topCategory = `${categoryEmojis[cat]} ${categoryNames[cat]}`;
    }
  });

  contenedor.innerHTML = `
    <div class="report-item">
      <h3>${formatearMes(month)}</h3>
      <div class="report-item-details">
        <div>
          <div class="report-detail-label">Ingresos</div>
          <div class="report-detail-value">$${ingresos.toFixed(2)}</div>
        </div>
        <div>
          <div class="report-detail-label">Gastos</div>
          <div class="report-detail-value">$${gastos.toFixed(2)}</div>
        </div>
        <div>
          <div class="report-detail-label">Balance</div>
          <div class="report-detail-value">$${balance.toFixed(2)}</div>
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
  if (tab === "transacciones") botones[0].classList.add("active");
  if (tab === "graficos") botones[1].classList.add("active");
  if (tab === "reportes") botones[2].classList.add("active");

  if (tab === "graficos") {
    setTimeout(actualizarGraficos, 100);
  }
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const activo = document.body.classList.contains("dark-mode");
  localStorage.setItem("darkMode", JSON.stringify(activo));
}

function inicializarTema() {
  const darkMode = JSON.parse(localStorage.getItem("darkMode") || "false");
  if (darkMode) document.body.classList.add("dark-mode");
}

function guardarDatos() {
  localStorage.setItem("finanzasData", JSON.stringify({ transactions, budgets }));
}

function cargarDatos() {
  const datos = localStorage.getItem("finanzasData");
  if (!datos) return;

  try {
    const parsed = JSON.parse(datos);
    transactions = parsed.transactions || [];
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
    exportadoEn: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finanzas_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function limpiarDatos() {
  const confirmar = confirm("Esto eliminará todos tus datos. ¿Deseas continuar?");
  if (!confirmar) return;

  transactions = [];
  budgets = {};
  guardarDatos();
  llenarMesesReporte();
  renderTodo();
  document.getElementById("reportContent").innerHTML =
    '<p class="empty-message">Selecciona un mes para ver el reporte</p>';
}

function formatearFecha(fecha) {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-ES");
}

function formatearMes(valor) {
  const [year, month] = valor.split("-");
  const fecha = new Date(Number(year), Number(month) - 1, 1);
  return fecha.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}
