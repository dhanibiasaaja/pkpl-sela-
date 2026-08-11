// WareFlow Inventaris Gudang - Client-side Application Logic

let token = localStorage.getItem('inventaris_token') || localStorage.getItem('wareflow_token') || null;
let currentUser = JSON.parse(localStorage.getItem('inventaris_user') || localStorage.getItem('wareflow_user') || 'null');

let items = [];
let categories = [];
let logs = [];
let activeView = 'dashboard';
let inventoryViewMode = 'table'; // 'table' or 'cards'

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkAuth();
});

// THEME TOGGLE
function initTheme() {
  const savedTheme = localStorage.getItem('inventaris_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('inventaris_theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
}

// AUTHENTICATION MANAGEMENT
function checkAuth() {
  const authOverlay = document.getElementById('auth-overlay');
  const appContainer = document.getElementById('app-container');

  if (token && currentUser) {
    authOverlay.style.display = 'none';
    appContainer.style.display = 'flex';
    updateUserProfileDisplay();
    loadAllData();
  } else {
    authOverlay.style.display = 'flex';
    appContainer.style.display = 'none';
  }
}

function switchAuthTab(tab) {
  const loginTab = document.getElementById('tab-login');
  const regTab = document.getElementById('tab-register');
  const loginForm = document.getElementById('form-login');
  const regForm = document.getElementById('form-register');

  if (tab === 'login') {
    loginTab.classList.add('active');
    regTab.classList.remove('active');
    loginForm.style.display = 'block';
    regForm.style.display = 'none';
  } else {
    regTab.classList.add('active');
    loginTab.classList.remove('active');
    regForm.style.display = 'block';
    loginForm.style.display = 'none';
  }
}

function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fa-regular fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fa-regular fa-eye';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login gagal.');

    token = data.token;
    currentUser = data.user;
    localStorage.setItem('inventaris_token', token);
    localStorage.setItem('inventaris_user', JSON.stringify(currentUser));

    showToast('Login berhasil! Selamat datang ' + currentUser.name, 'success');
    checkAuth();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const warehouseName = document.getElementById('reg-warehouse').value;
  const role = document.getElementById('reg-role').value;
  const password = document.getElementById('reg-password').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, warehouseName, role, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registrasi gagal.');

    token = data.token;
    currentUser = data.user;
    localStorage.setItem('inventaris_token', token);
    localStorage.setItem('inventaris_user', JSON.stringify(currentUser));

    showToast('Registrasi akun gudang berhasil!', 'success');
    checkAuth();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleLogout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('inventaris_token');
  localStorage.removeItem('inventaris_user');
  localStorage.removeItem('wareflow_token');
  localStorage.removeItem('wareflow_user');
  showToast('Anda telah keluar dari aplikasi.', 'success');
  checkAuth();
}

function updateUserProfileDisplay() {
  if (!currentUser) return;
  const nameElem = document.getElementById('user-display-name');
  if (nameElem) nameElem.textContent = currentUser.name;
  
  const whElem = document.getElementById('user-display-warehouse');
  if (whElem) whElem.textContent = currentUser.warehouseName || 'Gudang Utama';

  const avatarCircle = document.getElementById('user-avatar-circle');
  if (avatarCircle) {
    const parts = (currentUser.name || 'SG').split(' ');
    const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
    avatarCircle.textContent = initials;
  }

  const navUser = document.getElementById('nav-user-name');
  if (navUser) navUser.textContent = currentUser.name.split(' ')[0];

  const pName = document.getElementById('profile-name');
  if (pName) pName.textContent = currentUser.name;
  
  const pEmail = document.getElementById('profile-email');
  if (pEmail) pEmail.textContent = currentUser.email;

  const pWh = document.getElementById('profile-warehouse');
  if (pWh) pWh.textContent = currentUser.warehouseName || 'Gudang Utama';

  const pRole = document.getElementById('profile-role');
  if (pRole) pRole.textContent = currentUser.role || 'Staf Gudang';
}

// FETCH DATA
async function loadAllData() {
  try {
    await Promise.all([fetchCategories(), fetchItems(), fetchLogs()]);
    renderActiveView();
  } catch (err) {
    console.error('Error loading warehouse data:', err);
  }
}

async function fetchCategories() {
  const res = await fetch('/api/categories', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (res.ok) {
    categories = await res.json();
    populateCategoryDropdowns();
  }
}

async function fetchItems() {
  const res = await fetch('/api/items', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (res.ok) {
    items = await res.json();
  }
}

async function fetchLogs() {
  const res = await fetch('/api/logs', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (res.ok) {
    logs = await res.json();
  }
}

function populateCategoryDropdowns() {
  const filterSelect = document.getElementById('inv-filter-category');
  const itemSelect = document.getElementById('item-category');

  if (filterSelect) {
    let html = '<option value="ALL">Semua Kategori</option>';
    categories.forEach(c => {
      html += `<option value="${c.id}">${c.name} (${c.code})</option>`;
    });
    filterSelect.innerHTML = html;
  }

  if (itemSelect) {
    let html = '';
    if (categories.length === 0) {
      html = '<option value="CREATE_NEW" selected>+ Buat Kategori Baru...</option>';
      toggleInlineCategoryInput('CREATE_NEW');
    } else {
      html = '<option value="" disabled selected>Pilih Kategori</option>';
      categories.forEach(c => {
        html += `<option value="${c.id}">${c.name} (${c.code} - ${c.location})</option>`;
      });
      html += '<option value="CREATE_NEW">+ Buat Kategori Baru...</option>';
      toggleInlineCategoryInput('');
    }
    itemSelect.innerHTML = html;
  }
}

function toggleInlineCategoryInput(val) {
  const group = document.getElementById('group-inline-new-cat');
  if (group) {
    group.style.display = (val === 'CREATE_NEW' || categories.length === 0) ? 'block' : 'none';
  }
}

// VIEW NAVIGATION
function switchView(viewName) {
  activeView = viewName;

  document.querySelectorAll('.nav-tab-item, .nav-item').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.page-view').forEach(view => view.classList.remove('active'));

  const navElem = document.getElementById(`nav-${viewName}`);
  const viewElem = document.getElementById(`view-${viewName}`);

  if (navElem) navElem.classList.add('active');
  if (viewElem) viewElem.classList.add('active');

  renderActiveView();
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('mobile-open');
}

function renderActiveView() {
  if (activeView === 'dashboard') renderDashboard();
  else if (activeView === 'inventory') renderInventory();
  else if (activeView === 'categories') renderCategories();
  else if (activeView === 'logs') renderLogs();
  else if (activeView === 'settings') updateUserProfileDisplay();
}

function setInventoryViewMode(mode) {
  inventoryViewMode = mode;
  document.getElementById('btn-toggle-table').classList.toggle('active', mode === 'table');
  document.getElementById('btn-toggle-cards').classList.toggle('active', mode === 'cards');
  document.getElementById('inv-table-container').style.display = mode === 'table' ? 'block' : 'none';
  document.getElementById('inv-cards-container').style.display = mode === 'cards' ? 'grid' : 'none';
  renderInventory();
}

// RENDER DASHBOARD
function renderDashboard() {
  const totalItems = items.length;
  const totalUnits = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const alertItems = items.filter(item => item.status === 'Stok Menipis' || item.status === 'Habis');
  const totalVal = items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.price) || 0)), 0);

  document.getElementById('stat-total-items').textContent = totalItems;
  document.getElementById('stat-total-units').textContent = totalUnits.toLocaleString('id-ID');
  document.getElementById('stat-alert-items').textContent = alertItems.length;
  document.getElementById('stat-total-value').textContent = formatRupiah(totalVal);

  const badgeAlert = document.getElementById('badge-alert-count');
  if (badgeAlert) {
    if (alertItems.length > 0) {
      badgeAlert.textContent = alertItems.length;
      badgeAlert.style.display = 'inline-block';
    } else {
      badgeAlert.style.display = 'none';
    }
  }

  // Render Low Stock Alert Panel
  const alertContainer = document.getElementById('dash-stock-alerts-list');
  if (alertItems.length === 0) {
    alertContainer.innerHTML = `
      <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">
        <i class="fa-solid fa-box" style="font-size: 20px; margin-bottom: 8px;"></i>
        <p>Belum ada data barang atau peringatan stok.</p>
      </div>`;
  } else {
    alertContainer.innerHTML = alertItems.map(item => `
      <div class="alert-card ${item.status === 'Habis' ? 'status-out-stock' : 'status-low'}">
        <div class="alert-card-info">
          <h4>${escapeHtml(item.name)} <span class="badge-sku">${escapeHtml(item.sku)}</span></h4>
          <p>Kategori: ${escapeHtml(item.categoryName)} | Stok: <b>${item.quantity} ${item.unit}</b> (Min: ${item.minStock} ${item.unit})</p>
        </div>
        <button class="btn-success-act" style="padding: 5px 10px; font-size: 11.5px;" onclick="openStockAdjustModal('${item.id}', 'IN')">
          + Barang Masuk
        </button>
      </div>
    `).join('');
  }

  // Render Rack Capacity Summary
  const rackContainer = document.getElementById('dash-rack-capacity-list');
  if (categories.length === 0) {
    rackContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px; font-size:13px;">Belum ada kategori/lokasi rak. Klik "+ Tambah Kategori" untuk membuat baru.</p>';
  } else {
    rackContainer.innerHTML = categories.map(cat => {
      const catItems = items.filter(i => i.categoryId === cat.id);
      const totalUnitsInRack = catItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
      const capacity = Number(cat.capacity) || 500;
      const percentage = Math.min(100, Math.round((totalUnitsInRack / capacity) * 100));

      return `
        <div class="rack-card">
          <div class="rack-card-head">
            <h4>${escapeHtml(cat.name)} <span class="badge-sku">${cat.code}</span></h4>
            <span>${totalUnitsInRack} / ${capacity} Unit (${percentage}%)</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
          </div>
          <p style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">
            <i class="fa-solid fa-location-dot"></i> ${escapeHtml(cat.location)} | PJ: ${escapeHtml(cat.manager || '-')}
          </p>
        </div>
      `;
    }).join('');
  }

  // Render Recent Transaction Logs
  const recentLogs = logs.slice(0, 5);
  const tbody = document.getElementById('dash-recent-logs-tbody');
  if (recentLogs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">Belum ada riwayat mutasi stok.</td></tr>';
  } else {
    tbody.innerHTML = recentLogs.map(log => `
      <tr>
        <td style="font-size: 12px; color: var(--text-secondary);">${formatDate(log.timestamp)}</td>
        <td>
          <span class="badge-stock ${log.type === 'IN' ? 'status-in' : 'status-out'}">
            ${log.type === 'IN' ? 'Barang Masuk' : 'Barang Keluar'}
          </span>
        </td>
        <td>
          <b>${escapeHtml(log.itemName)}</b>
          <br><span class="badge-sku">${escapeHtml(log.itemSku || '-')}</span>
        </td>
        <td><b>${log.type === 'IN' ? '+' : '-'}${log.quantity}</b></td>
        <td style="font-family: var(--font-mono); font-size: 12px;">${log.prevQuantity} ➔ <b>${log.newQuantity}</b></td>
        <td style="color: var(--text-secondary); font-size: 12px;">${escapeHtml(log.notes || '-')}</td>
      </tr>
    `).join('');
  }
}

// RENDER INVENTORY
function renderInventory() {
  const searchQuery = (document.getElementById('inv-search-input')?.value || '').toLowerCase();
  const categoryFilter = document.getElementById('inv-filter-category')?.value || 'ALL';
  const statusFilter = document.getElementById('inv-filter-status')?.value || 'ALL';
  const sortBy = document.getElementById('inv-sort-by')?.value || 'name-asc';

  let filtered = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery) ||
                          item.sku.toLowerCase().includes(searchQuery) ||
                          (item.supplier || '').toLowerCase().includes(searchQuery);

    const matchesCategory = categoryFilter === 'ALL' || item.categoryId === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
    if (sortBy === 'qty-asc') return a.quantity - b.quantity;
    if (sortBy === 'qty-desc') return b.quantity - a.quantity;
    if (sortBy === 'price-desc') return (b.price || 0) - (a.price || 0);
    return 0;
  });

  if (inventoryViewMode === 'table') {
    const tbody = document.getElementById('inv-tbody');
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:var(--text-muted); padding:32px;">Belum ada barang di inventaris. Klik "+ Tambah Barang" untuk mulai mengisi data.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(item => `
      <tr>
        <td>
          <div style="display: flex; gap: 4px;">
            <button class="btn-action-table act-in" onclick="openStockAdjustModal('${item.id}', 'IN')">
              + Masuk
            </button>
            <button class="btn-action-table act-out" onclick="openStockAdjustModal('${item.id}', 'OUT')">
              - Keluar
            </button>
          </div>
        </td>
        <td><span class="badge-sku">${escapeHtml(item.sku)}</span></td>
        <td>
          <b style="font-size: 13.5px;">${escapeHtml(item.name)}</b>
          <div style="font-size: 11.5px; color: var(--text-secondary);">${escapeHtml(item.description || '-')}</div>
        </td>
        <td>
          <span class="badge-tag">
            ${escapeHtml(item.categoryName)} (${escapeHtml(item.categoryCode)})
          </span>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.categoryLocation)}</div>
        </td>
        <td><b style="font-size: 14px;">${item.quantity}</b> <span style="font-size: 11.5px; color: var(--text-secondary);">${escapeHtml(item.unit)}</span></td>
        <td style="font-size: 12px; color: var(--text-secondary);">${item.minStock} ${escapeHtml(item.unit)}</td>
        <td>
          <span class="badge-stock ${getStatusBadgeClass(item.status)}">
            ${item.status}
          </span>
        </td>
        <td><b>${formatRupiah(item.price)}</b></td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 4px;">
            <button class="btn-icon" title="Edit Barang" onclick="openItemModal('${item.id}')">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-icon" title="Hapus Barang" onclick="handleDeleteItem('${item.id}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  } else {
    const cardContainer = document.getElementById('inv-cards-container');
    if (filtered.length === 0) {
      cardContainer.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding:32px; color:var(--text-muted);">Belum ada barang di inventaris.</p>';
      return;
    }

    cardContainer.innerHTML = filtered.map(item => `
      <div class="item-card">
        <div>
          <div class="item-card-header">
            <span class="badge-sku">${escapeHtml(item.sku)}</span>
            <span class="badge-stock ${getStatusBadgeClass(item.status)}">
              ${item.status}
            </span>
          </div>
          <h3 class="item-card-title">${escapeHtml(item.name)}</h3>
          <p style="font-size: 12px; color: var(--text-secondary); margin: 4px 0 10px;">${escapeHtml(item.description || 'Tidak ada deskripsi.')}</p>
        </div>

        <div class="item-card-body">
          <div class="item-stat-row">
            <span style="color: var(--text-muted);">Stok / Min:</span>
            <span><b>${item.quantity} ${item.unit}</b> / ${item.minStock} ${item.unit}</span>
          </div>
          <div class="item-stat-row">
            <span style="color: var(--text-muted);">Kategori:</span>
            <span>${escapeHtml(item.categoryName)}</span>
          </div>
          <div class="item-stat-row">
            <span style="color: var(--text-muted);">Harga Per Unit:</span>
            <span><b>${formatRupiah(item.price)}</b></span>
          </div>
        </div>

        <div class="item-card-footer">
          <button class="btn-success-act" style="flex:1; justify-content:center; padding: 6px; font-size:12px;" onclick="openStockAdjustModal('${item.id}', 'IN')">
            + Masuk
          </button>
          <button class="btn-danger-act" style="flex:1; justify-content:center; padding: 6px; font-size:12px;" onclick="openStockAdjustModal('${item.id}', 'OUT')">
            - Keluar
          </button>
          <button class="btn-icon" onclick="openItemModal('${item.id}')"><i class="fa-solid fa-pen"></i></button>
        </div>
      </div>
    `).join('');
  }
}

function getStatusBadgeClass(status) {
  if (status === 'Tersedia') return 'status-available';
  if (status === 'Stok Menipis') return 'status-low';
  return 'status-out-stock';
}

// RENDER CATEGORIES
function renderCategories() {
  const container = document.getElementById('categories-grid-container');
  if (categories.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-muted);">Belum ada kategori/lokasi rak. Klik "+ Tambah Kategori" untuk membuat baru.</p>';
    return;
  }

  container.innerHTML = categories.map(cat => {
    const catItems = items.filter(i => i.categoryId === cat.id);
    const totalUnits = catItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    const capacity = Number(cat.capacity) || 500;
    const percentage = Math.min(100, Math.round((totalUnits / capacity) * 100));

    return `
      <div class="category-card">
        <div class="category-card-head">
          <div>
            <span class="badge-sku">${cat.code}</span>
            <h3 class="category-title" style="margin-top: 4px;">${escapeHtml(cat.name)}</h3>
          </div>
        </div>

        <div style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 14px;">
          <p><i class="fa-solid fa-location-dot"></i> Lokasi Rak: <b>${escapeHtml(cat.location)}</b></p>
          <p><i class="fa-solid fa-user"></i> PJ Rak: <b>${escapeHtml(cat.manager || '-')}</b></p>
          <p><i class="fa-solid fa-box"></i> Jumlah SKU: <b>${catItems.length} Jenis</b></p>
        </div>

        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">
            <span>Kapasitas Digunakan</span>
            <span><b>${totalUnits} / ${capacity} Unit</b></span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
          </div>
        </div>

        <div style="display: flex; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 12px;">
          <button class="btn-secondary" style="flex:1; justify-content:center;" onclick="openCategoryModal('${cat.id}')">
            Edit Rak
          </button>
          <button class="btn-secondary" onclick="handleDeleteCategory('${cat.id}')">
            Hapus
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// RENDER LOGS
function renderLogs() {
  const typeFilter = document.getElementById('logs-filter-type')?.value || 'ALL';
  const filtered = logs.filter(l => typeFilter === 'ALL' || l.type === typeFilter);

  const tbody = document.getElementById('logs-tbody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:32px;">Belum ada riwayat mutasi stok.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(log => `
    <tr>
      <td style="font-size: 12px; color: var(--text-secondary);">${formatDate(log.timestamp)}</td>
      <td>
        <span class="badge-stock ${log.type === 'IN' ? 'status-in' : 'status-out'}">
          ${log.type === 'IN' ? 'Barang Masuk' : 'Barang Keluar'}
        </span>
      </td>
      <td><span class="badge-sku">${escapeHtml(log.itemSku || '-')}</span></td>
      <td><b>${escapeHtml(log.itemName)}</b></td>
      <td><b>${log.type === 'IN' ? '+' : '-'}${log.quantity}</b></td>
      <td style="font-family: var(--font-mono); font-size: 12px;">${log.prevQuantity} ➔ <b>${log.newQuantity}</b></td>
      <td style="color: var(--text-secondary); font-size: 12.5px;">${escapeHtml(log.notes || '-')}</td>
    </tr>
  `).join('');
}

// GLOBAL SEARCH HANDLER
function handleGlobalSearch(query) {
  if (query.trim().length > 0 && activeView !== 'inventory') {
    switchView('inventory');
  }
  const invInput = document.getElementById('inv-search-input');
  if (invInput) {
    invInput.value = query;
    renderInventory();
  }
}

// MODAL HANDLERS FOR ITEMS
function openItemModal(itemId = null) {
  populateCategoryDropdowns();
  const modal = document.getElementById('modal-item');
  const title = document.getElementById('modal-item-title');
  const form = document.getElementById('form-item');

  form.reset();
  document.getElementById('item-id-hidden').value = '';
  const newCatInput = document.getElementById('item-new-cat-name');
  if (newCatInput) newCatInput.value = '';

  if (itemId) {
    const item = items.find(i => i.id === itemId);
    if (item) {
      title.textContent = 'Edit Barang Inventaris';
      document.getElementById('item-id-hidden').value = item.id;
      document.getElementById('item-sku').value = item.sku;
      document.getElementById('item-category').value = item.categoryId;
      document.getElementById('item-name').value = item.name;
      document.getElementById('item-description').value = item.description || '';
      document.getElementById('item-quantity').value = item.quantity;
      document.getElementById('item-min-stock').value = item.minStock;
      document.getElementById('item-unit').value = item.unit || 'Pcs';
      document.getElementById('item-price').value = item.price || 0;
      document.getElementById('item-supplier').value = item.supplier || '';
      toggleInlineCategoryInput(item.categoryId);
    }
  } else {
    title.textContent = 'Tambah Barang Inventaris';
    if (categories.length === 0) {
      const select = document.getElementById('item-category');
      if (select) select.value = 'CREATE_NEW';
      toggleInlineCategoryInput('CREATE_NEW');
    }
  }

  modal.classList.add('active');
}

async function handleSaveItem(e) {
  e.preventDefault();
  const id = document.getElementById('item-id-hidden').value;

  const categorySelectVal = document.getElementById('item-category').value;
  const newCatName = document.getElementById('item-new-cat-name')?.value || '';

  const payload = {
    sku: document.getElementById('item-sku').value,
    categoryId: categorySelectVal === 'CREATE_NEW' ? '' : categorySelectVal,
    newCategoryName: newCatName,
    name: document.getElementById('item-name').value,
    description: document.getElementById('item-description').value,
    quantity: parseInt(document.getElementById('item-quantity').value) || 0,
    minStock: parseInt(document.getElementById('item-min-stock').value) || 5,
    unit: document.getElementById('item-unit').value,
    price: parseFloat(document.getElementById('item-price').value) || 0,
    supplier: document.getElementById('item-supplier').value
  };

  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/items/${id}` : '/api/items';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan barang.');

    showToast(id ? 'Data barang berhasil diupdate!' : 'Barang baru berhasil ditambahkan!', 'success');
    closeModal('modal-item');
    await loadAllData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDeleteItem(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus barang ini dari inventaris?')) return;

  try {
    const res = await fetch(`/api/items/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus barang.');

    showToast(data.message, 'success');
    await loadAllData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// STOCK ADJUSTMENT MODAL
function openStockAdjustModal(itemId, type = 'IN') {
  const item = items.find(i => i.id === itemId);
  if (!item) return;

  document.getElementById('adjust-item-id').value = item.id;
  document.getElementById('adjust-type').value = type;

  const title = document.getElementById('modal-adjust-title');
  const btnSubmit = document.getElementById('btn-submit-adjust');

  if (type === 'IN') {
    title.textContent = 'Barang Masuk (+ Restock)';
    btnSubmit.textContent = '+ Proses Barang Masuk';
    btnSubmit.className = 'btn-success-act';
  } else {
    title.textContent = 'Barang Keluar (- Pengeluaran)';
    btnSubmit.textContent = '- Proses Barang Keluar';
    btnSubmit.className = 'btn-danger-act';
  }

  document.getElementById('adjust-item-name').textContent = item.name;
  document.getElementById('adjust-item-info').textContent = `SKU: ${item.sku} | Stok Saat Ini: ${item.quantity} ${item.unit}`;
  document.getElementById('adjust-amount').value = '';
  document.getElementById('adjust-notes').value = '';

  document.getElementById('modal-stock-adjust').classList.add('active');
}

function openQuickAdjustModal(type) {
  if (items.length === 0) {
    showToast('Belum ada barang di inventaris. Silakan "+ Tambah Barang" terlebih dahulu.', 'error');
    return;
  }
  openStockAdjustModal(items[0].id, type);
}

async function handleSaveStockAdjustment(e) {
  e.preventDefault();
  const id = document.getElementById('adjust-item-id').value;
  const type = document.getElementById('adjust-type').value;
  const amount = parseInt(document.getElementById('adjust-amount').value);
  const notes = document.getElementById('adjust-notes').value;

  try {
    const res = await fetch(`/api/items/${id}/adjust-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ type, amount, notes })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memperbarui stok.');

    showToast(`Stok berhasil di-update! ${type === 'IN' ? '+' : '-'}${amount} unit`, 'success');
    closeModal('modal-stock-adjust');
    await loadAllData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// CATEGORY MODAL & CRUD
function openCategoryModal(catId = null) {
  const modal = document.getElementById('modal-category');
  const title = document.getElementById('modal-cat-title');
  const form = document.getElementById('form-category');

  form.reset();
  document.getElementById('cat-id-hidden').value = '';

  if (catId) {
    const cat = categories.find(c => c.id === catId);
    if (cat) {
      title.textContent = 'Edit Kategori & Rak';
      document.getElementById('cat-id-hidden').value = cat.id;
      document.getElementById('cat-code').value = cat.code;
      document.getElementById('cat-name').value = cat.name;
      document.getElementById('cat-location').value = cat.location;
      document.getElementById('cat-manager').value = cat.manager || '';
      document.getElementById('cat-capacity').value = cat.capacity || 500;
    }
  } else {
    title.textContent = 'Tambah Kategori & Rak Gudang';
  }

  modal.classList.add('active');
}

async function handleSaveCategory(e) {
  e.preventDefault();
  const id = document.getElementById('cat-id-hidden').value;

  const payload = {
    code: document.getElementById('cat-code').value,
    name: document.getElementById('cat-name').value,
    location: document.getElementById('cat-location').value,
    manager: document.getElementById('cat-manager').value,
    capacity: parseInt(document.getElementById('cat-capacity').value) || 500
  };

  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/categories/${id}` : '/api/categories';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan kategori.');

    showToast(id ? 'Kategori berhasil diupdate!' : 'Kategori baru berhasil ditambahkan!', 'success');
    closeModal('modal-category');
    await loadAllData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDeleteCategory(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus kategori ini beserta barang di dalamnya?')) return;

  try {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus kategori.');

    showToast(data.message, 'success');
    await loadAllData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// UTILITY FUNCTIONS
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
}

function formatDate(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
