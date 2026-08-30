// ===== CONFIGURACIÓN Y VARIABLES GLOBALES =====

let transactions = [];
let budgets = {};

const categoryEmojis = {
    alimentacion: '🍔',
    transporte: '🚗',
    servicios: '📱',
    salud: '🏥',
    entretenimiento: '🎮',
    educacion: '📚',
    trabajo: '💼',
    otro: '📌'
};

// ===== INICIALIZACIÓN =====

document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    document.getElementById('date').valueAsDate = new Date();
    document.getElementById('transactionForm').addEventListener('submit', agregarTransaccion);
    document.getElementById('budgetForm').addEventListener('submit', agregarPresupuesto);
    document.getElementById('filterText').addEventListener('input', filtrarTransacciones);
    document.getElementById('filterCategory').addEventListener('change', filtrarTransacciones);
    document.getElementById('filterType').addEventListener('change', filtrarTransacciones);
    mostrarTransacciones();
    mostrarPresupuestos();
    actualizarResumen();
});

// ===== FUNCIONES DE TRANSACCIONES =====

function agregarTransaccion(e) {
    e.preventDefault();
    
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const type = document.getElementById('type').value;
    const date = document.getElementById('date').value;
    
    if (amount <= 0) {
        alert('Por favor, ingresa una cantidad mayor a 0');
        return;
    }
    
    const transaction = {
        id: Date.now(),
        description,
        amount,
        category,
        type,
        date,
        createdAt: new Date().toLocaleString()
    };
    
    transactions.push(transaction);
    guardarDatos();
    document.getElementById('transactionForm').reset();
    document.getElementById('date').valueAsDate = new Date();
    mostrarTransacciones();
    actualizarResumen();
    alert('✅ Transacción agregada exitosamente');
}

function eliminarTransaccion(id) {
    if (confirm('¿Estás seguro de que deseas eliminar esta transacción?')) {
        transactions = transactions.filter(t => t.id !== id);
        guardarDatos();
        mostrarTransacciones();
        actualizarResumen();
        alert('✅ Transacción eliminada');
    }
}

function mostrarTransacciones() {
    const lista = document.getElementById('transactionsList');
    
    if (transactions.length === 0) {
        lista.innerHTML = '<p class="empty-message">No hay transacciones registradas</p>';
        return;
    }
    
    const transaccionesOrdenadas = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    lista.innerHTML = transaccionesOrdenadas.map(t => `
        <div class="transaction-item ${t.type}">
            <div class="transaction-info">
                <div class="transaction-category">${categoryEmojis[t.category]} ${t.category.charAt(0).toUpperCase() + t.category.slice(1)}</div>
                <div class="transaction-description">${t.description}</div>
                <div class="transaction-date">${new Date(t.date).toLocaleDateString()}</div>
            </div>
            <div class="transaction-amount ${t.type}">
                ${t.type === 'gasto' ? '-' : '+'}$${t.amount.toFixed(2)}
            </div>
            <div class="transaction-actions">
                <button class="btn btn-danger btn-small" onclick="eliminarTransaccion(${t.id})">🗑️ Eliminar</button>
            </div>
        </div>
    `).join('');
}

function filtrarTransacciones() {
    const texto = document.getElementById('filterText').value.toLowerCase();
    const categoria = document.getElementById('filterCategory').value;
    const tipo = document.getElementById('filterType').value;
    
    const transaccionesFiltradas = transactions.filter(t => {
        const coincideTexto = t.description.toLowerCase().includes(texto) || 
                              t.category.toLowerCase().includes(texto);
        const coincideCategoria = categoria === '' || t.category === categoria;
        const coincideTipo = tipo === '' || t.type === tipo;
        
        return coincideTexto && coincideCategoria && coincideTipo;
    });
    
    const lista = document.getElementById('transactionsList');
    
    if (transaccionesFiltradas.length === 0) {
        lista.innerHTML = '<p class="empty-message">No hay transacciones que coincidan con los filtros</p>';
        return;
    }
    
    transaccionesFiltradas.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    lista.innerHTML = transaccionesFiltradas.map(t => `
        <div class="transaction-item ${t.type}">
            <div class="transaction-info">
                <div class="transaction-category">${categoryEmojis[t.category]} ${t.category.charAt(0).toUpperCase() + t.category.slice(1)}</div>
                <div class="transaction-description">${t.description}</div>
                <div class="transaction-date">${new Date(t.date).toLocaleDateString()}</div>
            </div>
            <div class="transaction-amount ${t.type}">
                ${t.type === 'gasto' ? '-' : '+'}$${t.amount.toFixed(2)}
            </div>
            <div class="transaction-actions">
                <button class="btn btn-danger btn-small" onclick="eliminarTransaccion(${t.id})">🗑️ Eliminar</button>
            </div>
        </div>
    `).join('');
}

// ===== FUNCIONES DE PRESUPUESTOS =====

function agregarPresupuesto(e) {
    e.preventDefault();
    
    const category = document.getElementById('budgetCategory').value;
    const amount = parseFloat(document.getElementById('budgetAmount').value);
    
    if (amount <= 0) {
        alert('Por favor, ingresa un monto válido');
        return;
    }
    
    budgets[category] = amount;
    guardarDatos();
    document.getElementById('budgetForm').reset();
    mostrarPresupuestos();
    actualizarResumen();
    alert('✅ Presupuesto guardado exitosamente');
}

function eliminarPresupuesto(category) {
    if (confirm('¿Estás seguro de que deseas eliminar este presupuesto?')) {
        delete budgets[category];
        guardarDatos();
        mostrarPresupuestos();
        actualizarResumen();
        alert('✅ Presupuesto eliminado');
    }
}

function mostrarPresupuestos() {
    const lista = document.getElementById('budgetsList');
    
    if (Object.keys(budgets).length === 0) {
        lista.innerHTML = '<p class="empty-message">No hay presupuestos establecidos</p>';
        return;
    }
    
    lista.innerHTML = Object.keys(budgets).map(category => {
        const budgetAmount = budgets[category];
        const gastosEnCategoria = transactions
            .filter(t => t.category === category && t.type === 'gasto')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const porcentaje = (gastosEnCategoria / budgetAmount) * 100;
        const exceeded = gastosEnCategoria > budgetAmount;
        
        return `
            <div class="budget-item">
                <div class="budget-item-info">
                    <div class="budget-item-category">${categoryEmojis[category]} ${category.charAt(0).toUpperCase() + category.slice(1)}</div>
                    <div class="budget-progress">
                        <div class="budget-progress-bar ${exceeded ? 'exceeded' : ''}" style="width: ${Math.min(porcentaje, 100)}%"></div>
                    </div>
                    <small>Gastado: $${gastosEnCategoria.toFixed(2)} / Presupuesto: $${budgetAmount.toFixed(2)}</small>
                </div>
                <div class="budget-item-amount ${exceeded ? 'exceeded' : ''}">
                    ${porcentaje.toFixed(0)}%
                </div>
                <button class="btn btn-danger btn-small" onclick="eliminarPresupuesto('${category}')" style="margin-left: 10px;">🗑️</button>
            </div>
        `;
    }).join('');
}

// ===== FUNCIONES DE RESUMEN =====

function actualizarResumen() {
    const totalIncome = transactions
        .filter(t => t.type === 'ingreso')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
        .filter(t => t.type === 'gasto')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = totalIncome - totalExpense;
    const totalBudget = Object.values(budgets).reduce((sum, b) => sum + b, 0);
    const porcentajePresupuesto = totalBudget === 0 ? 0 : (totalExpense / totalBudget) * 100;
    
    document.getElementById('totalIncome').textContent = `$${totalIncome.toFixed(2)}`;
    document.getElementById('totalExpense').textContent = `$${totalExpense.toFixed(2)}`;
    document.getElementById('balance').textContent = `$${balance.toFixed(2)}`;
    document.getElementById('budgetUsed').textContent = `${porcentajePresupuesto.toFixed(0)}%`;
}

// ===== FUNCIONES DE ALMACENAMIENTO =====

function guardarDatos() {
    const datos = {
        transactions,
        budgets,
        timestamp: new Date().toLocaleString()
    };
    localStorage.setItem('finanzasData', JSON.stringify(datos));
}

function cargarDatos() {
    const datosGuardados = localStorage.getItem('finanzasData');
    
    if (datosGuardados) {
        try {
            const datos = JSON.parse(datosGuardados);
            transactions = datos.transactions || [];
            budgets = datos.budgets || {};
        } catch (error) {
            console.error('Error al cargar datos:', error);
            transactions = [];
            budgets = {};
        }
    }
}

function descargarDatos() {
    const datos = {
        transactions,
        budgets,
        resumen: {
            totalIngresos: transactions
                .filter(t => t.type === 'ingreso')
                .reduce((sum, t) => sum + t.amount, 0),
            totalGastos: transactions
                .filter(t => t.type === 'gasto')
                .reduce((sum, t) => sum + t.amount, 0),
            balance: transactions
                .filter(t => t.type === 'ingreso')
                .reduce((sum, t) => sum + t.amount, 0) - 
                transactions
                .filter(t => t.type === 'gasto')
                .reduce((sum, t) => sum + t.amount, 0),
            fechaDescarga: new Date().toLocaleString()
        }
    };
    
    const elemento = document.createElement('a');
    elemento.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(datos, null, 2));
    elemento.download = `finanzas_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(elemento);
    elemento.click();
    document.body.removeChild(elemento);
}

function limpiarDatos() {
    if (confirm('⚠️ ADVERTENCIA: Esto eliminará TODOS tus datos. ¿Estás completamente seguro? (Esta acción no se puede deshacer)')) {
        if (confirm('¿Confirmas que deseas eliminar todo?')) {
            transactions = [];
            budgets = {};
            guardarDatos();
            mostrarTransacciones();
            mostrarPresupuestos();
            actualizarResumen();
            alert('✅ Todos los datos han sido eliminados');
        }
    }
}