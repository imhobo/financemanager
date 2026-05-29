const API = window.location.origin;
let state = { user: null, token: null, page: 'dashboard', assets: [], liabilities: [], netWorth: null };

function getToken() { return state.token || localStorage.getItem('fm_token'); }
function setToken(t) { state.token = t; if (t) localStorage.setItem('fm_token', t); else localStorage.removeItem('fm_token'); }

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const token = getToken();
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, opts);
  if (res.status === 401) { setToken(null); state.user = null; render(); throw new Error('Unauthorized'); }
  return res.json();
}

function render() {
  const app = document.getElementById('app');
  if (!state.user) {
    app.innerHTML = `
      <div class="login-page">
        <div class="login-card">
          <h1>FinanceManager</h1>
          <p>Track your net worth. All in one place.</p>
          <div id="google-button"></div>
        </div>
      </div>`;
    const clientId = window.GOOGLE_CLIENT_ID;
    if (clientId && typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleSignIn,
        auto_select: false,
      });
      google.accounts.id.renderButton(
        document.getElementById('google-button'),
        { type: 'standard', shape: 'rectangular', theme: 'outline', text: 'signin_with', size: 'large', logo_alignment: 'left' }
      );
    } else {
      document.getElementById('google-button').innerHTML = '<p style="color:#6b7280;font-size:13px;margin-top:12px">Google Sign-In not configured. Set GOOGLE_CLIENT_ID in .env</p>';
    }
    return;
  }
  app.innerHTML = `
    <div class="app-header">
      <h1>FinanceManager</h1>
      <div class="user-info">
        <img class="user-avatar" src="${state.user.avatar_url || ''}" alt="">
        <span>${state.user.name || state.user.email}</span>
        <button class="logout-btn" onclick="logout()">Sign out</button>
      </div>
    </div>
    <div class="app-layout">
      <nav class="app-nav">
        ${['dashboard','assets','liabilities'].map(p => `
          <button class="nav-item ${state.page === p ? 'active' : ''}" onclick="navigate('${p}')">
            ${p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        `).join('')}
      </nav>
      <main class="app-content" id="page-content"></main>
    </div>`;
  renderPage();
}

window.navigate = function(page) { state.page = page; render(); };

async function renderPage() {
  const el = document.getElementById('page-content');
  if (!el) return;
  try {
    if (state.page === 'dashboard') await renderDashboard(el);
    else if (state.page === 'assets') await renderAssets(el);
    else if (state.page === 'liabilities') await renderLiabilities(el);
  } catch (e) { console.error(e); }
}

/* Dashboard */
async function renderDashboard(el) {
  const [assetsRes, liabilitiesRes, nwRes] = await Promise.all([
    api('GET', '/api/assets'),
    api('GET', '/api/liabilities'),
    api('GET', '/api/net-worth')
  ]);
  state.assets = assetsRes;
  state.liabilities = liabilitiesRes;
  const nw = nwRes;
  state.netWorth = nw;

  const totalAssets = nw.total_assets || 0;
  const totalLiabilities = nw.total_liabilities || 0;
  const netWorth = nw.net_worth || 0;

  el.innerHTML = `
    <div class="net-worth-card">
      <div class="label">Net Worth</div>
      <div class="amount">${fmt(netWorth)}</div>
      <div class="sub">
        <span>Assets: ${fmt(totalAssets)}</span>
        <span>Liabilities: ${fmt(totalLiabilities)}</span>
      </div>
    </div>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="label">Total Assets</div>
        <div class="value green">${fmt(totalAssets)}</div>
      </div>
      <div class="summary-card">
        <div class="label">Total Liabilities</div>
        <div class="value red">${fmt(totalLiabilities)}</div>
      </div>
      <div class="summary-card">
        <div class="label">Asset Categories</div>
        <div class="value" style="font-size:16px">${countByType(assetsRes, 'type').map(t => `${t.type} (${t.count})`).join(', ') || 'None'}</div>
      </div>
      <div class="summary-card">
        <div class="label">Liabilities</div>
        <div class="value" style="font-size:16px">${countByType(liabilitiesRes, 'type').map(t => `${t.type} (${t.count})`).join(', ') || 'None'}</div>
      </div>
    </div>
    <div class="chart-row">
      <div class="chart-card">
        <h3>Asset Allocation</h3>
        <canvas id="allocationChart"></canvas>
      </div>
      <div class="chart-card">
        <h3>Net Worth History</h3>
        <canvas id="historyChart"></canvas>
      </div>
    </div>`;

  const assetTypes = {};
  assetsRes.forEach(a => { assetTypes[a.type] = (assetTypes[a.type] || 0) + parseFloat(a.value); });
  if (Object.keys(assetTypes).length > 0) {
    const ctx1 = document.getElementById('allocationChart').getContext('2d');
    new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels: Object.keys(assetTypes).map(k => k.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase())),
        datasets: [{ data: Object.values(assetTypes), backgroundColor: ['#1a73e8','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#db2777','#65a30d','#9333ea','#0d9488'] }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } } } }
    });
  }
  if (nw.history && nw.history.length > 1) {
    const ctx2 = document.getElementById('historyChart').getContext('2d');
    new Chart(ctx2, {
      type: 'line',
      data: {
        labels: nw.history.map(h => new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })),
        datasets: [{
          label: 'Net Worth', data: nw.history.map(h => h.net_worth),
          borderColor: '#1a73e8', backgroundColor: 'rgba(26,115,232,0.1)', fill: true, tension: 0.3
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => '₹' + (v/1000).toFixed(0) + 'K' } } } }
    });
  }
}

/* Assets page */
async function renderAssets(el) {
  if (state.assets.length === 0 && state.page === 'assets') {
    state.assets = await api('GET', '/api/assets');
  }
  el.innerHTML = `
    <div class="page-header">
      <h2>Assets</h2>
      <button onclick="showAssetForm()">+ Add Asset</button>
    </div>
    <div class="item-list">
      ${state.assets.length === 0 ? '<p style="color:#6b7280;text-align:center;padding:40px">No assets yet. Add your first one!</p>' : ''}
      ${state.assets.map(a => `
        <div class="item-row">
          <div class="info">
            <div class="name">${esc(a.name)}</div>
            <div class="meta">${a.type.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())} · ${a.source}${a.data ? ' · ' + Object.values(JSON.parse(a.data)).filter(v=>v).slice(0,2).join(', ') : ''}</div>
          </div>
          <div class="value-col">${fmt(a.value, a.currency)}</div>
          <div class="actions">
            <button class="btn-edit" onclick="showAssetForm('${a.id}')">Edit</button>
            <button class="btn-delete" onclick="deleteAsset('${a.id}')">Delete</button>
          </div>
        </div>
      `).join('')}
    </div>`;
}

/* Liabilities page */
async function renderLiabilities(el) {
  if (state.liabilities.length === 0 && state.page === 'liabilities') {
    state.liabilities = await api('GET', '/api/liabilities');
  }
  el.innerHTML = `
    <div class="page-header">
      <h2>Liabilities</h2>
      <button onclick="showLiabilityForm()">+ Add Liability</button>
    </div>
    <div class="item-list">
      ${state.liabilities.length === 0 ? '<p style="color:#6b7280;text-align:center;padding:40px">No liabilities yet.</p>' : ''}
      ${state.liabilities.map(l => `
        <div class="item-row">
          <div class="info">
            <div class="name">${esc(l.name)}</div>
            <div class="meta">${l.type.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())} · ${l.source}${l.data ? ' · ' + Object.values(JSON.parse(l.data)).filter(v=>v).slice(0,2).join(', ') : ''}</div>
          </div>
          <div class="value-col" style="color:#dc2626">${fmt(l.value, l.currency)}</div>
          <div class="actions">
            <button class="btn-edit" onclick="showLiabilityForm('${l.id}')">Edit</button>
            <button class="btn-delete" onclick="deleteLiability('${l.id}')">Delete</button>
          </div>
        </div>
      `).join('')}
    </div>`;
}

/* Asset form modal */
window.showAssetForm = async (id) => {
  const isEdit = !!id;
  const existing = isEdit ? state.assets.find(a => a.id === id) : null;
  const data = existing ? JSON.parse(existing.data) : {};

  const fields = getAssetFields(existing ? existing.type : 'cash', data);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h3>${isEdit ? 'Edit Asset' : 'Add Asset'}</h3>
      <div class="form-group">
        <label>Type</label>
        <select id="af_type" onchange="updateAssetFields()">
          ${ASSET_TYPES.map(t => `<option value="${t.value}" ${(existing ? existing.type : 'cash') === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Name</label>
        <input id="af_name" value="${existing ? esc(existing.name) : ''}" placeholder="e.g. HDFC Savings Account">
      </div>
      <div id="af_dynamic">${fields}</div>
      <div class="form-row">
        <div class="form-group">
          <label>Value (INR)</label>
          <input id="af_value" type="number" step="0.01" value="${existing ? existing.value : ''}" placeholder="0.00">
        </div>
        <div class="form-group">
          <label>Currency</label>
          <select id="af_currency">
            <option value="INR" ${existing && existing.currency === 'INR' ? 'selected' : ''}>INR (₹)</option>
            <option value="USD" ${existing && existing.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
          </select>
        </div>
      </div>
      <div class="modal-actions">
        <button class="cancel" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="save" onclick="saveAsset('${id || ''}')">${isEdit ? 'Update' : 'Add'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
};

window.updateAssetFields = () => {
  const type = document.getElementById('af_type').value;
  const container = document.getElementById('af_dynamic');
  container.innerHTML = getAssetFields(type, {});
};

function getAssetFields(type, data) {
  const f = (label, id, ph, val) =>
    `<div class="form-group"><label>${label}</label><input id="${id}" value="${val || ''}" placeholder="${ph}"></div>`;
  const m = {
    mutual_fund: f('Fund Name', 'af_f1', 'e.g. HDFC Mid-Cap Fund', data.fund_name) +
      f('Folio Number', 'af_f2', 'e.g. 1234567890', data.folio) +
      f('Units Held', 'af_f3', 'e.g. 500', data.units) +
      f('Current NAV', 'af_f4', 'e.g. 125.50', data.nav),
    cash: f('Account Name', 'af_f1', 'e.g. HDFC Savings', data.account_name) + f('Bank', 'af_f2', 'e.g. HDFC Bank', data.bank),
    us_equity: f('Ticker', 'af_f1', 'e.g. AAPL', data.ticker) +
      f('Company', 'af_f2', 'e.g. Apple Inc.', data.company) +
      f('Shares', 'af_f3', 'e.g. 10', data.shares) +
      f('Avg Buy Price (USD)', 'af_f4', 'e.g. 180', data.avg_price),
    pf: f('UAN', 'af_f1', 'e.g. 123456789012', data.uan) +
      f('Employer', 'af_f2', 'e.g. Acme Corp', data.employer) +
      f('Employee Contribution', 'af_f3', 'e.g. 1800', data.employee_contrib),
    fd: f('Bank Name', 'af_f1', 'e.g. SBI', data.bank) +
      f('FD Number', 'af_f2', 'e.g. FD12345', data.fd_number) +
      f('Interest Rate (%)', 'af_f3', 'e.g. 7.5', data.interest_rate) +
      f('Start Date', 'af_f4', 'YYYY-MM-DD', data.start_date) +
      f('Maturity Date', 'af_f5', 'YYYY-MM-DD', data.maturity_date),
    indian_stock: f('Ticker', 'af_f1', 'e.g. RELIANCE', data.ticker) +
      f('Company', 'af_f2', 'e.g. Reliance Industries', data.company) +
      f('Quantity', 'af_f3', 'e.g. 5', data.quantity) +
      f('Avg Buy Price', 'af_f4', 'e.g. 2500', data.avg_price),
    gold: f('Type', 'af_f1', 'Sovereign/ETF/Physical', data.gold_type) +
      f('Weight (grams)', 'af_f2', 'e.g. 10', data.weight) +
      f('Rate per gram', 'af_f3', 'e.g. 6500', data.rate_per_gm),
    real_estate: f('Property Name', 'af_f1', 'e.g. My Apartment', data.property) +
      f('Type', 'af_f2', 'Residential/Commercial', data.estate_type) +
      f('Location', 'af_f3', 'e.g. Bangalore', data.location),
    nps: f('PRAN', 'af_f1', 'e.g. 1234567890', data.pran) +
      f('Tier', 'af_f2', 'I or II', data.tier) +
      f('Subscriber Name', 'af_f3', data.full_name || '', 'Full name'),
    other: f('Notes', 'af_f1', 'e.g. Crypto, collectibles', data.notes)
  };
  return m[type] || f('Details', 'af_f1', 'Description', data.details);
}

window.saveAsset = async (id) => {
  const isEdit = !!id;
  const type = document.getElementById('af_type').value;
  const name = document.getElementById('af_name').value.trim();
  const value = parseFloat(document.getElementById('af_value').value);
  const currency = document.getElementById('af_currency').value;

  if (!name || isNaN(value)) { alert('Name and value are required'); return; }

  const data = collectAssetFields(type);
  const body = { type, name, value, currency, data, source: 'manual' };

  if (isEdit) {
    await api('PUT', `/api/assets/${id}`, body);
    state.assets = await api('GET', '/api/assets');
  } else {
    state.assets.push(await api('POST', '/api/assets', body));
  }
  document.querySelector('.modal-overlay')?.remove();
  render();
};

function collectAssetFields(type) {
  const ids = ['af_f1','af_f2','af_f3','af_f4','af_f5'];
  const vals = {};
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) vals[`field_${i+1}`] = el.value;
  });
  return vals;
}

/* Liability form modal */
window.showLiabilityForm = (id) => {
  const isEdit = !!id;
  const existing = isEdit ? state.liabilities.find(l => l.id === id) : null;
  const data = existing ? JSON.parse(existing.data) : {};

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h3>${isEdit ? 'Edit Liability' : 'Add Liability'}</h3>
      <div class="form-group">
        <label>Type</label>
        <select id="lf_type">
          <option value="credit_card" ${existing && existing.type === 'credit_card' ? 'selected' : ''}>Credit Card</option>
          <option value="loan" ${existing && existing.type === 'loan' ? 'selected' : ''}>Loan</option>
          <option value="other" ${existing && existing.type === 'other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label>Name</label>
        <input id="lf_name" value="${existing ? esc(existing.name) : ''}" placeholder="e.g. HDFC Credit Card">
      </div>
      ${existing && existing.type === 'credit_card' || (!existing) ? `
      <div class="form-group"><label>Card Name / Issuer</label><input id="lf_f1" value="${data.field_1 || ''}" placeholder="e.g. HDFC Regalia"></div>
      <div class="form-group"><label>Due Date</label><input id="lf_f2" value="${data.field_2 || ''}" placeholder="e.g. 5th of month"></div>
      <div class="form-group"><label>Credit Limit</label><input id="lf_f3" value="${data.field_3 || ''}" placeholder="e.g. 300000"></div>
      ` : existing && existing.type === 'loan' ? `
      <div class="form-group"><label>Lender</label><input id="lf_f1" value="${data.field_1 || ''}" placeholder="e.g. SBI"></div>
      <div class="form-group"><label>Loan Type</label><input id="lf_f2" value="${data.field_2 || ''}" placeholder="Home/Car/Personal/Education"></div>
      <div class="form-group"><label>Interest Rate (%)</label><input id="lf_f3" value="${data.field_3 || ''}" placeholder="e.g. 8.5"></div>
      <div class="form-group"><label>EMI</label><input id="lf_f4" value="${data.field_4 || ''}" placeholder="e.g. 25000"></div>
      ` : `
      <div class="form-group"><label>Notes</label><input id="lf_f1" value="${data.field_1 || ''}" placeholder="Description"></div>
      `}
      <div class="form-group">
        <label>Outstanding Amount (INR)</label>
        <input id="lf_value" type="number" step="0.01" value="${existing ? existing.value : ''}" placeholder="0.00">
      </div>
      <div class="modal-actions">
        <button class="cancel" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="save" onclick="saveLiability('${id || ''}')">${isEdit ? 'Update' : 'Add'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
};

window.saveLiability = async (id) => {
  const isEdit = !!id;
  const type = document.getElementById('lf_type').value;
  const name = document.getElementById('lf_name').value.trim();
  const value = parseFloat(document.getElementById('lf_value').value);

  if (!name || isNaN(value)) { alert('Name and value are required'); return; }

  const data = {};
  ['lf_f1','lf_f2','lf_f3','lf_f4'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) data[`field_${i+1}`] = el.value;
  });

  const body = { type, name, value, currency: 'INR', data, source: 'manual' };

  if (isEdit) {
    await api('PUT', `/api/liabilities/${id}`, body);
    state.liabilities = await api('GET', '/api/liabilities');
  } else {
    state.liabilities.push(await api('POST', '/api/liabilities', body));
  }
  document.querySelector('.modal-overlay')?.remove();
  render();
};

/* Delete */
window.deleteAsset = async (id) => {
  if (!confirm('Delete this asset?')) return;
  await api('DELETE', `/api/assets/${id}`);
  state.assets = state.assets.filter(a => a.id !== id);
  render();
};

window.deleteLiability = async (id) => {
  if (!confirm('Delete this liability?')) return;
  await api('DELETE', `/api/liabilities/${id}`);
  state.liabilities = state.liabilities.filter(l => l.id !== id);
  render();
};

/* Google Sign-In */
window.handleGoogleSignIn = async (response) => {
  try {
    const res = await api('POST', '/api/auth/google', { id_token: response.credential });
    setToken(res.session_token);
    state.user = res.user;
    render();
  } catch (e) {
    alert('Sign in failed. Check console for details.');
    console.error(e);
  }
};

window.logout = () => {
  setToken(null);
  state.user = null;
  state.assets = [];
  state.liabilities = [];
  render();
};

/* Utilities */
function fmt(val, currency = 'INR') {
  const n = parseFloat(val) || 0;
  if (currency === 'USD') return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2 });
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}
function esc(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function countByType(arr, key) {
  const counts = {};
  arr.forEach(a => { counts[a[key]] = (counts[a[key]] || 0) + 1; });
  return Object.entries(counts).map(([type, count]) => ({ type: type.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase()), count }));
}

const ASSET_TYPES = [
  { value: 'cash', label: 'Cash / Bank Account' },
  { value: 'mutual_fund', label: 'Indian Mutual Fund' },
  { value: 'us_equity', label: 'US Equity' },
  { value: 'pf', label: 'Provident Fund (PF)' },
  { value: 'fd', label: 'Fixed Deposit' },
  { value: 'indian_stock', label: 'Indian Stock' },
  { value: 'gold', label: 'Gold' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'nps', label: 'NPS' },
  { value: 'other', label: 'Other Asset' },
];

/* Init */
(async function init() {
  try {
    const config = await (await fetch('/api/config')).json();
    window.GOOGLE_CLIENT_ID = config.googleClientId;
  } catch {}
  const token = getToken();
  if (token) {
    try {
      const user = await api('GET', '/api/auth/me');
      state.user = user;
      state.token = token;
    } catch {
      setToken(null);
    }
  }
  render();
})();
