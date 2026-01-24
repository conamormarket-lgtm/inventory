import { Auth } from './auth.js';
import { DataManager } from './data.js';
import { GARMENT_TYPES, SIZES, COLORS } from './config.js';

// --- State & DOM Elements ---
const views = {
    login: document.getElementById('login-view'),
    dashboard: document.getElementById('dashboard-view')
};

const panels = {
    stock: document.getElementById('stock-panel'),
    movements: document.getElementById('movements-panel'),
    history: document.getElementById('history-panel'),
    stats: document.getElementById('stats-panel'),
    reports: document.getElementById('reports-panel')
};

// Chart refs stored in module scope
let stockChartReference = null;
let topItemsChartReference = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupThemeToggle();
});

function initApp() {
    // Check auth
    if (Auth.isLoggedIn()) {
        showDashboard();
    } else {
        showLogin();
    }

    // Auth Events
    setupLogin();
    setupLogout();

    // Dashboard Events
    setupNavigation();
    setupMovementForm();

    // Initial Render Helper
    populateSelects();
    setupStatsNavigation();
    setupMobileMenu(); // New function
    setupReports(); // Initialize Reports Logic


    // Initialize Real-time Data Listener
    DataManager.initListener((update) => {
        // update = { type: 'inventory' | 'history', data: [...] }
        if (update.type === 'inventory') {
            const currentPanel = document.querySelector('.content-panel.active');
            // If we are on a relevant panel, re-render
            // For simplicity, we can just re-render stock grid if it's visible, or always updates globals
            if (currentPanel && (currentPanel.id === 'stock-panel' || currentPanel.id === 'dashboard-view')) {
                renderStockGrid();
            }
            // Stats imply inventory read
            if (currentPanel && currentPanel.id === 'stats-panel') {
                renderChart();
            }
        }
        if (update.type === 'history') {
            const currentPanel = document.querySelector('.content-panel.active');
            if (currentPanel && currentPanel.id === 'history-panel') {
                renderHistory();
            }
        }
    });
}

// --- View Logic ---
function showLogin() {
    views.login.classList.remove('hidden');
    views.login.classList.add('active');
    views.dashboard.classList.add('hidden');
    views.dashboard.classList.remove('active');
}

function showDashboard() {
    views.login.classList.add('hidden');
    views.login.classList.remove('active');
    views.dashboard.classList.remove('hidden');
    views.dashboard.classList.add('active');

    const user = Auth.getCurrentUser();
    document.getElementById('current-user-name').innerText = user ? user.name : 'Usuario';

    // renderStockGrid(); // Now handled by listener or manual call if needed, but listener is safer
    // Trigger manual render once to be sure if cache is ready
    renderStockGrid();
}

function switchPanel(panelName) {
    // Hide all panels
    Object.values(panels).forEach(p => p.classList.add('hidden'));
    // Show target
    const target = document.getElementById(panelName);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(btn => {
        if (btn.dataset.target === panelName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Refresh data if needed
    if (panelName === 'stock-panel') renderStockGrid();
    if (panelName === 'history-panel') renderHistory();
    if (panelName === 'stats-panel') renderChart();
    if (panelName === 'reports-panel') renderReports();
}

// --- Auth Logic ---
function setupLogin() {
    const form = document.getElementById('login-form');
    const errorMsg = document.getElementById('login-error');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;

        const result = Auth.login(user, pass);
        if (result.success) {
            errorMsg.classList.add('hidden');
            form.reset();
            showDashboard();
        } else {
            errorMsg.innerText = result.error;
            errorMsg.classList.remove('hidden');
        }
    });
}

function setupLogout() {
    const btn = document.getElementById('logout-btn');
    btn.addEventListener('click', () => {
        Auth.logout();
        showLogin();
    });
}

// --- Navigation ---
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = btn.dataset.target;
            switchPanel(target);

            // On mobile, maybe close sidebar? Not implemented for simplicity yet.
        });
    });

    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('active');
        });
    }
}

// --- Stock / Dashboard Logic ---
function renderStockGrid() {
    const grid = document.getElementById('stock-grid');
    const inventory = DataManager.getInventory();
    const searchTerm = document.getElementById('search-stock').value.toLowerCase();

    // Filter logic
    const filtered = inventory.filter(item => {
        if (item.quantity === 0) return false; // Optional: hide zero stock? Let's show them if they exist but with 0
        const searchStr = `${item.type} ${item.color} ${item.size}`.toLowerCase();
        return searchStr.includes(searchTerm);
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">
                <i class="ph ph-ghost" style="font-size: 3rem; margin-bottom: 10px;"></i>
                <p>No hay prendas en stock.</p>
            </div>`;
        return;
    }

    grid.innerHTML = filtered.map((item, index) => {
        const colorObj = COLORS.find(c => c.name === item.color);
        const hex = colorObj ? colorObj.hex : '#ccc';
        const delay = index * 0.05; // 50ms stagger

        return `
        <div class="stock-card animate-slide-down" style="animation-delay: ${delay}s">
            <div class="stock-card-header">
                <span class="item-title">${item.type}</span>
                <span class="item-badge">${item.size}</span>
            </div>
            <div class="stock-details">
                <span class="color-dot" style="background-color: ${hex};"></span>
                <span>${item.color}</span>
            </div>
            <div class="stock-count">
                ${item.quantity} <span style="font-size: 0.9rem; color: var(--text-muted);">uds</span>
            </div>
        </div>
    `}).join('');
}

// Search Listener
document.getElementById('search-stock').addEventListener('input', renderStockGrid);

// --- Movement Logic ---
function populateSelects() {
    const selGarment = document.getElementById('mov-garment');
    const selColor = document.getElementById('mov-color');
    const selSize = document.getElementById('mov-size');

    selGarment.innerHTML = GARMENT_TYPES.map(x => `<option value="${x}">${x}</option>`).join('');
    selColor.innerHTML = COLORS.map(x => `<option value="${x.name}">${x.name}</option>`).join('');
    // For sizes, since they are simple strings
    selSize.innerHTML = SIZES.map(x => `<option value="${x}">${x}</option>`).join('');
}

function setupMovementForm() {
    // Type Toggles
    const typeBtns = document.querySelectorAll('.type-btn');
    let currentType = 'entry';

    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentType = btn.dataset.type;
        });
    });

    // Quantity Plus/Minus
    const qtyInput = document.getElementById('mov-quantity');
    document.getElementById('btn-minus').addEventListener('click', () => {
        const val = parseInt(qtyInput.value) || 0;
        if (val > 1) qtyInput.value = val - 1;
    });
    document.getElementById('btn-plus').addEventListener('click', () => {
        const val = parseInt(qtyInput.value) || 0;
        qtyInput.value = val + 1;
    });

    // Handle Submit
    const form = document.getElementById('movement-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const details = {
            type: document.getElementById('mov-garment').value,
            color: document.getElementById('mov-color').value,
            size: document.getElementById('mov-size').value
        };
        const qty = parseInt(qtyInput.value);

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Procesando...';

        try {
            const result = await DataManager.addMovement(
                currentType,
                details,
                qty,
                Auth.getCurrentUser()
            );

            if (result.success) {
                alert(`Movimiento registrado con éxito. Nuevo stock: ${result.newStock}`);
                form.reset();
                qtyInput.value = 1;
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (err) {
            alert('Error inesperado: ' + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });

    // Handle Undo
    document.getElementById('btn-undo').addEventListener('click', async () => {
        const currentUser = Auth.getCurrentUser();
        // Confirm dialog
        if (!confirm('¿Estás seguro de deshacer tu última acción? Se revertirá el stock y se borrará del historial.')) return;

        const btn = document.getElementById('btn-undo');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> ...';

        const result = await DataManager.undoLastAction(currentUser);

        btn.disabled = false;
        btn.innerHTML = originalText;

        if (result.success) {
            alert(result.message);
            // Views update automatically via initListener
        } else {
            alert(result.error);
        }
    });
}

// --- History Logic ---
function renderHistory() {
    const listEntries = document.getElementById('history-entries');
    const listExits = document.getElementById('history-exits');
    const allLogs = DataManager.getHistory();

    // Filter last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const logs = allLogs.filter(log => new Date(log.timestamp) >= sevenDaysAgo);

    const generateHtml = (filteredLogs) => {
        if (filteredLogs.length === 0) {
            return `<div style="padding: 20px; text-align: center; color: var(--text-muted);">Sin registros</div>`;
        }
        return filteredLogs.map(log => `
            <div class="history-item">
                <div class="h-info">
                    <span class="h-main">${log.details}</span>
                    <span class="h-sub">Por: <strong>${log.user}</strong> • ${new Date(log.timestamp).toLocaleDateString()} ${new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="h-amount ${log.action === 'Entrada' ? 'entry' : 'exit'}">
                    ${log.action === 'Entrada' ? '+' : '-'}${log.quantity || ''} <!-- Quantity logic depends on what we stored, simplified for now -->
                </div>
            </div>
        `).join('');
    };

    const entries = logs.filter(l => l.action === 'Entrada');
    const exits = logs.filter(l => l.action === 'Salida');

    listEntries.innerHTML = generateHtml(entries);
    listExits.innerHTML = generateHtml(exits);
}

// --- Chart Logic ---
function renderChart() {
    const ctxDonut = document.getElementById('stockChart');
    const ctxBar = document.getElementById('topItemsChart');

    // Safety Check: Chart.js library
    if (typeof Chart === 'undefined') {
        const container = document.querySelector('.stats-grid') || document.getElementById('stats-panel');
        if (container) {
            container.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--danger);">
                <i class="ph ph-warning-circle" style="font-size: 3rem;"></i>
                <p>Error: No se pudo cargar la librería de gráficos.</p>
                <p>Verifique su conexión a internet.</p>
            </div>`;
        }
        return;
    }

    const inventory = DataManager.getInventory();

    // --- 1. Donut Chart (Aggregation by Type) ---
    const totals = {};
    let totalItems = 0;
    inventory.forEach(item => {
        if (!totals[item.type]) totals[item.type] = 0;
        totals[item.type] += item.quantity;
        totalItems += item.quantity;
    });

    // Destroy old donut
    if (stockChartReference) {
        stockChartReference.destroy();
        stockChartReference = null;
    }

    // Theme Colors
    const isLight = document.body.classList.contains('light-mode');
    const themeColors = {
        text: isLight ? '#64748b' : '#94a3b8',
        title: isLight ? '#1e293b' : '#f8fafc',
        grid: isLight ? '#cbd5e1' : '#334155'
    };

    // Empty State Check (Global)
    if (totalItems === 0) {
        if (ctxDonut) {
            stockChartReference = new Chart(ctxDonut, {
                type: 'doughnut',
                data: { labels: ['Sin Datos'], datasets: [{ data: [1], backgroundColor: isLight ? '#e2e8f0' : '#1e293b', borderWidth: 0 }] },
                options: {
                    plugins: {
                        title: { display: true, text: 'Inventario Vacío', color: themeColors.text },
                        legend: { display: false },
                        tooltip: { enabled: false }
                    }
                }
            });
        }
    } else {
        // Render Donut
        if (ctxDonut) {
            stockChartReference = new Chart(ctxDonut, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(totals),
                    datasets: [{
                        data: Object.values(totals),
                        backgroundColor: [
                            '#6366f1', '#ec4899', '#22c55e', '#eab308', '#3b82f6', '#f97316', '#8b5cf6', '#14b8a6'
                        ],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: themeColors.text, padding: 20, font: { family: "'Inter', sans-serif" } }
                        },
                        title: {
                            display: true,
                            text: `Total: ${totalItems}`,
                            color: themeColors.title
                        }
                    }
                }
            });
        }
    }

    // --- 2. Bar Chart (Top Colors) ---
    // Aggregate by Color
    const colorTotals = {};
    inventory.forEach(item => {
        if (!colorTotals[item.color]) colorTotals[item.color] = 0;
        colorTotals[item.color] += item.quantity;
    });

    // Sort by quantity desc
    const sortedColors = Object.entries(colorTotals)
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty);

    const barLabels = sortedColors.map(c => c.name);
    const barData = sortedColors.map(c => c.qty);

    // Dynamic Colors
    const barBgColors = barLabels.map(label => {
        const found = COLORS.find(c => c.name === label);
        return found ? found.hex : '#3b82f6';
    });

    // Destroy old bar
    if (topItemsChartReference) {
        topItemsChartReference.destroy();
        topItemsChartReference = null;
    }

    // Render Bar Chart
    if (ctxBar) {
        topItemsChartReference = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: barLabels,
                datasets: [{
                    label: 'Unidades',
                    data: barData,
                    backgroundColor: barBgColors,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // Horizontal bars
                scales: {
                    x: {
                        grid: { color: themeColors.grid },
                        ticks: { color: themeColors.text }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: themeColors.text, autoSkip: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Top Colores', color: themeColors.title, padding: { bottom: 20 } }
                }
            }
        });
    }
}

// --- Extended Stats Logic ---

let statsColorChartReference = null;

function setupStatsNavigation() {
    const btns = document.querySelectorAll('.subnav-btn');
    if (btns.length === 0) return;

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderStatsSubView(btn.dataset.view);
        });
    });

    // Default view
    renderStatsSubView('color');
}

// Make available globally for inline onclicks
window.renderStatsSubView = renderStatsSubView;

function renderStatsSubView(viewName) {
    const container = document.getElementById('extended-stats-content');
    if (!container) return;

    // Only Color implemented for now
    if (viewName === 'color') renderStatsColor(container);
    if (viewName === 'size') renderStatsMatrix(container);
    if (viewName === 'drilldown') renderStatsDrillDown(container);
}

window.drillDownExportPDF = function () {
    // Simple mock for now - or valid window.print()
    // To do real PDF we'd need a library like jsPDF. 
    // For now, let's trigger print which allows Save as PDF.
    window.print();
}


function renderStatsMatrix(container) {
    const inventory = DataManager.getInventory();

    // Unique Sizes (sorted if possible, relying on config order)
    const usedSizes = SIZES;

    // Calculate Global Stock
    const totalGlobal = inventory.reduce((sum, i) => sum + i.quantity, 0);

    let html = '<div style="overflow-x:auto;"><table class="stock-matrix"><thead><tr><th style="text-align:center;">Talla / Prenda</th>';

    // Columns: Garment Types
    GARMENT_TYPES.forEach(type => {
        html += `<th style="text-align:center;">${type.toUpperCase()}</th>`;
    });
    // Add Total Column Header
    html += '<th style="text-align:center; background:var(--bg-card); color:var(--text-main);">TOTAL</th>';

    html += '</tr></thead><tbody>';

    // Rows: Sizes
    usedSizes.forEach(size => {
        html += `<tr><td class="row-header" style="text-align:center; font-weight:bold;">${size}</td>`;

        let rowTotal = 0;

        GARMENT_TYPES.forEach(type => {
            // Calculate total for this Size + Type (regardless of color)
            const count = inventory
                .filter(i => i.type === type && i.size === size)
                .reduce((sum, i) => sum + i.quantity, 0);

            rowTotal += count;

            // Highlight logic same as reference (slightly brighter if has stock)
            const cellClass = count > 0 ? 'has-stock' : '';
            const cellStyle = count > 0 ? 'color:var(--text-main); font-weight:500;' : 'opacity:0.2;';
            const cellContent = count > 0 ? count : '-';

            html += `<td class="${cellClass}" style="text-align:center; ${cellStyle}">${cellContent}</td>`;
        });

        // Row Total Cell
        html += `<td style="text-align:center; font-weight:bold; color:var(--primary); background:var(--bg-card); border-left:1px solid var(--border-color);">${rowTotal > 0 ? rowTotal : '-'}</td>`;

        html += '</tr>';
    });

    html += '</tbody></table></div>';

    // Global Stock Footer
    html += `
        <div style="margin-top: 15px; text-align: right; padding: 10px; background: var(--bg-card); border-radius: 6px; border: 1px solid var(--border-color);">
            <span style="color:var(--text-muted); font-size:0.9rem; margin-right: 10px;">Stock Global:</span>
            <span style="color:var(--success); font-size:1.1rem; font-weight:bold;">${totalGlobal}</span>
        </div>
    `;

    container.innerHTML = html;
}

function renderStatsColor(container) {
    const inventory = DataManager.getInventory();

    // Aggregation Logic
    const colorStats = {};
    inventory.forEach(item => {
        if (!colorStats[item.color]) {
            colorStats[item.color] = { total: 0, items: {} };
        }
        colorStats[item.color].total += item.quantity;

        if (!colorStats[item.color].items[item.type]) {
            colorStats[item.color].items[item.type] = 0;
        }
        colorStats[item.color].items[item.type] += item.quantity;
    });

    // Convert to Array and Sort by Total Descending
    const sortedStats = Object.entries(colorStats)
        .map(([colorName, data]) => ({ name: colorName, ...data }))
        .sort((a, b) => b.total - a.total);

    // Build HTML
    let html = `
        <div class="color-stats-list" style="max-width: 800px; margin: 50px auto 0; color: var(--text-main);">
            <!-- Headers -->
            <div style="display: grid; grid-template-columns: 2fr 1fr 2fr; padding-bottom: 15px; border-bottom: 1px solid var(--border-color); margin-bottom: 20px; font-size: 0.85rem; color: var(--text-muted); font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;">
                <div style="text-align: center;">Color</div>
                <div style="text-align: center;">Total</div>
                <div style="text-align: center;">Detalle</div>
            </div>
    `;

    if (sortedStats.length === 0) {
        html += '<div style="text-align:center; padding: 40px; color:var(--text-muted);">Sin datos de stock</div>';
    } else {
        sortedStats.forEach(stat => {
            // Build breakdown list
            // Sort breakdown items by qty desc
            const sortedItems = Object.entries(stat.items)
                .sort((a, b) => b[1] - a[1])
                .map(([type, qty]) => `
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 4px; margin-right: 20px; color: var(--text-main);">
                        <span>${type}:</span>
                        <span style="font-weight: 600;">${qty}</span>
                    </div>
                `).join('');

            html += `
                <div style="display: grid; grid-template-columns: 2fr 1fr 2fr; padding: 25px 0; border-bottom: 1px solid var(--border-color); align-items: center;">
                    <!-- Color Name -->
                    <div style="font-size: 1.1rem; font-weight: 600; text-align: center;">${stat.name}</div>
                    
                    <!-- Total -->
                    <div style="text-align: center; font-size: 2rem; font-weight: 700; color: var(--text-main);">${stat.total}</div>
                    
                    <!-- Detail -->
                    <div style="border-left: 1px solid var(--border-color); padding-left: 20px;">
                        ${sortedItems}
                    </div>
                </div>
            `;
        });
    }

    html += '</div>';
    container.innerHTML = html;
}

// Icon Mapping: Returns HTML string for the icon
const GARMENT_ICONS = {
    'Polo Básico': '<i class="ph ph-t-shirt" style="font-size:3rem; color:var(--primary); margin-bottom:5px;"></i>',

    'Polo Manga Larga': `
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary); margin-bottom:5px;">
             <!-- Base t-shirt body similar to ph-t-shirt but with longer sleeves -->
             <path d="M7 3h10l5 12-3 1-3-6v12H8V10L5 16l-3-1L7 3z"/>
        </svg>`,

    'Polera': '<i class="ph ph-hoodie" style="font-size:3rem; color:var(--primary); margin-bottom:5px;"></i>',

    'Pantalón Buzo': '<i class="ph ph-pants" style="font-size:3rem; color:var(--primary); margin-bottom:5px;"></i>',

    'Short': `
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary); margin-bottom:5px;">
            <!-- Short shape with waist matching legs -->
             <path d="M6 4h12l2 15h-6l-2-4-2 4H4L6 4z"/>
        </svg>`
};

function renderStatsDrillDown(container) {
    // Stage 1: Select Type
    let html = '<div id="dd-stage-1"><h3 style="text-align:center; margin-bottom:20px; margin-top:20px; color:var(--text-main); font-size:1.1rem;">Selecciona una Prenda</h3>';
    html += '<div class="garment-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:20px; max-width:600px; margin:0 auto; margin-bottom: 20px;">';

    GARMENT_TYPES.forEach(type => {
        const iconHtml = GARMENT_ICONS[type] || '<i class="ph ph-package" style="font-size:3rem; color:var(--primary); margin-bottom:5px;"></i>';

        html += `
        <button class="btn glass-panel garment-card-btn" onclick="drillDownSelectType('${type}')" 
                style="padding:30px 20px; text-align:center; transition:all 0.3s; display:flex; flex-direction:column; align-items:center; gap:15px; border:1px solid var(--border-color);">
            ${iconHtml}
            <div style="font-weight:600; font-size:1.1rem; color:var(--text-main);">${type}</div>
        </button>`;
    });
    html += '</div></div>';

    // Stage 2 Container (Hidden initially)
    html += '<div id="dd-stage-2" class="hidden" style="margin-top:20px;"></div>';

    container.innerHTML = html;
}

// Global state for drilldown filtering
window.currentDrillDownType = null;

window.drillDownSelectType = function (type) {
    window.currentDrillDownType = type;
    const stage1 = document.getElementById('dd-stage-1');
    const stage2 = document.getElementById('dd-stage-2');

    stage1.classList.add('hidden');
    stage2.classList.remove('hidden');

    renderDrillDownDashboard(type);
}

window.renderDrillDownDashboard = function (type) {
    const stage2 = document.getElementById('dd-stage-2');
    const inventory = DataManager.getInventory();

    // Filter stock for this type
    const items = inventory.filter(i => i.type === type);
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

    let html = `
        <!-- Back Button -->
        <button onclick="renderStatsSubView('drilldown')" style="background:none; border:none; color:var(--text-muted); cursor:pointer; margin-bottom:10px; margin-left:10px;display:flex; align-items:center; gap:5px;">
            <i class="ph ph-arrow-left"></i> Cambiar Prenda
        </button>

        <!-- Header: Total -->
        <div style="text-align:center; margin-bottom:30px; padding:20px; background:var(--bg-card); border-radius:12px; border: 1px solid var(--border-color);">
            <div style="font-size:0.9rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;">TOTAL: ${type.toUpperCase()}</div>
            <div style="font-size:3.5rem; font-weight:700; color:var(--success); line-height:1;">${totalQty}</div>
        </div>

        <!-- Filter Section -->
        <div class="glass-panel" style="padding:20px; margin-bottom:20px; border:1px solid var(--border-color);">
            <h4 style="color:var(--text-main); margin-bottom:15px; font-size:0.95rem; border-bottom:1px solid var(--border-color); padding-bottom:10px;">Filtrar Detalles</h4>
            
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px;">
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.8rem;">Color (Opcional):</label>
                    <select id="dd-filter-color" class="form-input" onchange="drillDownApplyFilters()" style="padding: 10px;">
                        <option value="">-- Todos --</option>
                        ${COLORS.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.8rem;">Talla (Opcional):</label>
                    <select id="dd-filter-size" class="form-input" onchange="drillDownApplyFilters()" style="padding: 10px;">
                        <option value="">-- Todas --</option>
                        ${SIZES.map(s => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.8rem;">Stock Mín:</label>
                    <input type="number" id="dd-filter-min" class="form-input" placeholder="0" oninput="drillDownApplyFilters()">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.8rem;">Stock Máx:</label>
                    <input type="number" id="dd-filter-max" class="form-input" placeholder="∞" oninput="drillDownApplyFilters()">
                </div>
            </div>
        </div>

        <!-- Export Button (Mock) -->
        <div style="text-align:right; margin-bottom:15px; margin-right: 10px;">
            <button class="btn btn-danger" onclick="drillDownExportPDF()" style="font-size:0.8rem; padding:8px 16px;">
                <i class="ph ph-file-pdf"></i> EXPORTAR PDF
            </button>
        </div>

        <!-- Details Table -->
        <div class="glass-panel" style="padding:0; overflow:hidden;">
            <div style="display:grid; grid-template-columns: 1fr 100px; padding:15px 20px; background:var(--bg-dark); border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:0.8rem; font-weight:600;">
                <div>DETALLE (SKU)</div>
                <div style="text-align:right;">STOCK</div>
            </div>
            <div id="dd-list-container" style="max-height:400px; overflow-y:auto;">
                <!-- List Items Injected Here -->
            </div>
        </div>
    `;

    stage2.innerHTML = html;

    // Initial Render of List
    drillDownRenderList(items);
}

window.drillDownApplyFilters = function () {
    if (!window.currentDrillDownType) return;

    const inventory = DataManager.getInventory();
    let items = inventory.filter(i => i.type === window.currentDrillDownType);

    const fColor = document.getElementById('dd-filter-color').value.toLowerCase();
    const fSize = document.getElementById('dd-filter-size').value.toLowerCase();
    const fMin = parseInt(document.getElementById('dd-filter-min').value);
    const fMax = parseInt(document.getElementById('dd-filter-max').value);

    // Filter
    items = items.filter(item => {
        // Color match
        if (fColor && !item.color.toLowerCase().includes(fColor)) return false;
        // Size match
        if (fSize && !item.size.toLowerCase().includes(fSize)) return false;
        // Range match
        if (!isNaN(fMin) && item.quantity < fMin) return false;
        if (!isNaN(fMax) && item.quantity > fMax) return false;

        return true;
    });

    drillDownRenderList(items);
}

window.drillDownRenderList = function (items) {
    const container = document.getElementById('dd-list-container');

    if (items.length === 0) {
        container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">No se encontraron resultados</div>';
        return;
    }

    // Sort: 0 stock at bottom? Or alphabetical? Let's do alphabetical by color -> size
    items.sort((a, b) => {
        if (a.color === b.color) return a.size.localeCompare(b.size);
        return a.color.localeCompare(b.color);
    });

    container.innerHTML = items.map(item => {
        // Highlighting for low stock
        const stockStyle = item.quantity === 0 ? 'color:var(--danger); font-weight:bold;' :
            item.quantity < 5 ? 'color:#fbbf24; font-weight:600;' :
                'color:var(--success); font-weight:600;';

        const rowBg = item.quantity === 0 ? 'background:rgba(239,68,68,0.05);' : '';

        return `
        <div style="display:grid; grid-template-columns: 1fr 100px; padding:12px 20px; border-bottom:1px solid rgba(255,255,255,0.05); align-items:center; ${rowBg}">
            <div style="font-size:0.9rem; color:var(--text-main);">
                ${item.type} - ${item.color} - ${item.size}
            </div>
            <div style="text-align:right; font-size:0.95rem; ${stockStyle}">
                ${item.quantity}
            </div>
        </div>
        `;
    }).join('');
}

// --- Reports Logic ---

let currentReportType = 'Salida'; // 'Entrada' or 'Salida'

// Make setup globally available or call it
function setupReports() {
    // Type Toggles
    const typeBtns = document.querySelectorAll('.report-type-btn');
    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentReportType = btn.dataset.type;
        });
    });

    // Generate Button
    const btnGen = document.getElementById('btn-generate-report');
    if (btnGen) btnGen.addEventListener('click', generateReport);

    // Export Button
    const btnExp = document.getElementById('btn-export-report');
    if (btnExp) btnExp.addEventListener('click', exportReportToCSV);
}

window.renderReports = function () {
    // Set default dates if empty
    const dateStart = document.getElementById('report-date-start');
    const dateEnd = document.getElementById('report-date-end');

    // Only set if not already set, or just checking?
    // Let's set default to first day of month and today if empty
    if (dateStart && !dateStart.value) {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        // Format YYYY-MM-DD
        dateStart.value = firstDay.toISOString().split('T')[0];
    }
    if (dateEnd && !dateEnd.value) {
        dateEnd.value = new Date().toISOString().split('T')[0];
    }
}

function generateReport() {
    const startStr = document.getElementById('report-date-start').value;
    const endStr = document.getElementById('report-date-end').value;
    const container = document.getElementById('report-results');

    if (!startStr || !endStr) {
        alert("Por favor selecciona ambas fechas.");
        return;
    }

    const [startYear, startMonth, startDay] = startStr.split('-').map(Number);
    const [endYear, endMonth, endDay] = endStr.split('-').map(Number);

    // Create dates in local time (00:00:00)
    const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
    // Create end date at end of day (23:59:59.999)
    const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

    const logs = DataManager.getHistory(); // returns array of { action, details, quantity, user, timestamp }

    // Filter
    const filtered = logs.filter(log => {
        const logTimestamp = new Date(log.timestamp).getTime();
        const isTypeMatch = log.action === currentReportType;
        const isDateMatch = logTimestamp >= startDate.getTime() && logTimestamp <= endDate.getTime();
        return isTypeMatch && isDateMatch;
    });

    container.classList.remove('hidden');

    if (filtered.length === 0) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-muted);">No se encontraron registros en este periodo.</div>';
        return;
    }

    // Sort by date desc
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Build Table
    let table = `
        <div style="padding:15px; font-size:1.1rem; font-weight:bold; border-bottom:1px solid var(--border-color); color:var(--text-main);">
            Resultados: ${filtered.length} Movimientos (${currentReportType}s)
        </div>
        <div style="overflow-x:auto;">
            <table class="report-table" style="width:100%; border-collapse:collapse; color:var(--text-main); text-align:left;">
                <thead>
                    <tr style="border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:0.85rem;">
                        <th style="padding:12px;">FECHA</th>
                        <th style="padding:12px;">USUARIO</th>
                        <th style="padding:12px;">DETALLE</th>
                        <th style="padding:12px; text-align:right;">CANTIDAD</th>
                    </tr>
                </thead>
                <tbody>
    `;

    filtered.forEach(log => {
        table += `
            <tr style="border-bottom:1px solid var(--border-color);">
                <td style="padding:12px;">${new Date(log.timestamp).toLocaleString()}</td>
                <td style="padding:12px;">${log.user}</td>
                <td style="padding:12px;">${log.details}</td>
                <td style="padding:12px; text-align:right; font-weight:600; color:${log.action === 'Entrada' ? 'var(--success)' : 'var(--danger)'};">${log.quantity || 1}</td>
            </tr>
        `;
    });

    table += '</tbody></table></div>';
    container.innerHTML = table;
}

function exportReportToCSV() {
    const startStr = document.getElementById('report-date-start').value;
    const endStr = document.getElementById('report-date-end').value;

    // Reuse filter logic (simplified for duplicate code)
    const [startYear, startMonth, startDay] = startStr.split('-').map(Number);
    const [endYear, endMonth, endDay] = endStr.split('-').map(Number);

    const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
    const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

    const logs = DataManager.getHistory().filter(log => {
        const logTimestamp = new Date(log.timestamp).getTime();
        return log.action === currentReportType && logTimestamp >= startDate.getTime() && logTimestamp <= endDate.getTime();
    });

    if (logs.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    // Sort
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // CSV Header
    let csv = "Fecha,Hora,Tipo,Usuario,Detalle,Cantidad\n";

    logs.forEach(log => {
        const d = new Date(log.timestamp);
        const date = d.toLocaleDateString();
        const time = d.toLocaleTimeString();
        // Escape content
        const detail = `"${log.details.replace(/"/g, '""')}"`;

        csv += `${date},${time},${log.action},${log.user},${detail},${log.quantity || 1}\n`;
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reporte_${currentReportType}_${startStr}_${endStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function setupMobileMenu() {
    // We use delegation to ensure it works even if DOM updates or timing issues occur
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#btn-mobile-menu');
        const overlayClick = e.target.closest('.sidebar-overlay');
        const navLink = e.target.closest('.nav-item');
        const sidebar = document.querySelector('.sidebar');

        // Ensure overlay exists (lazy creation)
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }

        // Helper for closing with animation
        const closeSidebar = () => {
            if (!sidebar.classList.contains('active')) return;

            sidebar.classList.add('closing'); // Trigger exit animation

            // Wait for animation to finish before removing active class
            setTimeout(() => {
                sidebar.classList.remove('active');
                sidebar.classList.remove('closing');
                overlay.classList.remove('active');
                const icon = document.querySelector('#btn-mobile-menu i');
                if (icon) icon.className = 'ph ph-list';
            }, 300); // 300ms matches CSS duration
        };

        // Toggle Button Click
        if (btn) {
            e.preventDefault();
            e.stopPropagation();

            if (sidebar.classList.contains('active')) {
                closeSidebar();
            } else {
                sidebar.classList.add('active');
                overlay.classList.add('active');
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'ph ph-x';
            }
        }

        // Overlay Click (Close)
        if (overlayClick) {
            closeSidebar();
        }

        // Nav Link Click (Close on Mobile)
        if (navLink && window.innerWidth < 1024) {
            closeSidebar();
        }
    });
}

// Init Setup Listener
// Init Setup Listener
document.addEventListener('DOMContentLoaded', () => {
    // initApp() handles setupMobileMenu, setupThemeToggle, etc.
    // No need to call them again here if initApp handles them.
    // But looking at code, initApp calls them. 
    // However, initApp is called on DOMContentLoaded too (line 25).
    // So lines 1042-1047 are redundant and potentially harmful if they attach listeners twice.
});

// Theme Toggle Logic
// Make available globally specifically for the onclick handler
window.toggleTheme = function () {
    document.body.classList.toggle('light-mode');

    const isLight = document.body.classList.contains('light-mode');
    const newTheme = isLight ? 'light' : 'dark';

    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);

    // Re-render charts to update colors
    renderChart();
}

function setupThemeToggle() {
    const btn = document.getElementById('btn-theme-toggle');
    if (!btn) return;

    // Check saved theme logic only on init
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
    updateThemeIcon(savedTheme);

    btn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        const newTheme = isLight ? 'light' : 'dark';

        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);

        // Re-render charts to update colors
        renderChart();
    });
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('btn-theme-toggle');
    if (!btn) return;
    const icon = btn.querySelector('i');

    if (theme === 'light') {
        icon.classList.remove('ph-moon');
        icon.classList.add('ph-sun');
    } else {
        icon.classList.remove('ph-sun');
        icon.classList.add('ph-moon');
    }
}


