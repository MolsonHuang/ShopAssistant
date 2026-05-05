const api = `${location.origin}/api`;
const state = {
  products: [],
  orders: [],
  inventory: [],
  deliveryOrders: [],
  items: [],
  editingIndex: null,
  contextIndex: null,
  pendingPhotos: [],
  role: localStorage.getItem('role') || 'boss',
  roleConfig: null,
  tableConfig: null
};

const fields = [
  'productId', 'barcode', 'customerItemNo', 'productImagePath', 'exportImagePath', 'factoryItemNo',
  'productDescription', 'innerPack', 'cartons', 'cartonQty', 'unitPrice', 'cbmPerCarton',
  'unitPieces', 'lengthCm', 'widthCm', 'heightCm', 'grossWeight', 'netWeight', 'deliveryStatus',
  'inspectionStatus', 'supplyStatus', 'warehouseStatus', 'deliveredCartons', 'signatureFilePath',
  'deliveryNotes'
];

const pageLabels = {
  orderEntry: '下订单',
  orderListView: '订单列表',
  products: '商品库',
  inventory: '库存管理',
  delivery: '送货仓库',
  accounting: '会计统计',
  search: '搜索',
  settings: '权限设置'
};

const defaultRoleConfig = {
  boss: { name: '老板', pages: ['orderEntry', 'orderListView', 'products', 'inventory', 'delivery', 'accounting', 'search', 'settings'] },
  sales: { name: '业务/跟单', pages: ['orderEntry', 'orderListView', 'products', 'inventory', 'delivery', 'search'] },
  warehouse: { name: '仓管', pages: ['delivery', 'products'] },
  accounting: { name: '会计', pages: ['accounting', 'orderListView', 'search'] }
};

const defaultTableConfig = {
  rowHeight: 64,
  columns: [
    { key: '_actions', label: '', width: 34, type: 'actions', locked: true },
    { key: 'customerItemNo', label: '客人货号', subLabel: 'ITEM NO', width: 110, type: 'text' },
    { key: 'productImagePath', label: '图片', subLabel: 'Picture', width: 110, type: 'image' },
    { key: 'factoryItemNo', label: '工厂货号', subLabel: 'Factory Item No.', width: 120, type: 'text' },
    { key: 'productDescription', label: '描述', subLabel: 'Description', width: 220, type: 'textarea' },
    { key: 'innerPack', label: '单位', subLabel: 'Unit', width: 80, type: 'text', suffix: '' },
    { key: 'cartons', label: '件数', subLabel: 'CTN', width: 80, type: 'number', total: 'sum' },
    { key: 'cartonQty', label: '装箱数', subLabel: 'QTY/CTN', width: 90, type: 'number', totalKey: 'totalPieces' },
    { key: 'unitPrice', label: '单价', subLabel: 'Unit Price', width: 90, type: 'number', step: '0.01', suffix: '$' },
    { key: 'totalAmount', label: '总金额', subLabel: 'Total Amount', width: 100, type: 'formula', formula: 'cartonQty*cartons*unitPrice', total: 'sum', decimals: 2, suffix: '$' },
    { key: 'cbmPerCarton', label: '单件体积', subLabel: 'CBM/CTN', width: 110, type: 'volume', suffix: 'm³' },
    { key: 'totalCbm', label: '总体积', subLabel: 'Total CBM', width: 100, type: 'formula', formula: 'cbmPerCarton*cartons', total: 'sum', decimals: 3, suffix: 'm³' },
    { key: '_status', label: '状态', width: 120, type: 'status' }
  ]
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

async function request(path, options = {}) {
  const response = await fetch(`${api}${path}`, {
    headers: options.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    ...options,
    body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function uploadFiles(kind, files) {
  if (!files || !files.length) return [];
  const form = new FormData();
  [...files].forEach((file) => form.append('files', file));
  const data = await request(`/uploads/${kind}`, { method: 'POST', body: form });
  return data.files;
}

async function loadSettings() {
  const [tableSetting, roleSetting] = await Promise.all([
    request('/settings/orderTableConfig').catch(() => ({ value: null })),
    request('/settings/roleConfig').catch(() => ({ value: null }))
  ]);
  state.tableConfig = tableSetting.value || structuredClone(defaultTableConfig);
  state.roleConfig = normalizeRoleConfig(roleSetting.value || structuredClone(defaultRoleConfig));
  syncConfigEditors();
}

function normalizeRoleConfig(config) {
  const normalized = {};
  Object.entries(config || defaultRoleConfig).forEach(([key, role]) => {
    const pages = (role.pages || []).flatMap((page) => (page === 'orders' ? ['orderEntry', 'orderListView'] : [page]));
    normalized[key] = { ...role, pages: [...new Set(pages)] };
  });
  if (!normalized.boss) normalized.boss = structuredClone(defaultRoleConfig.boss);
  return normalized;
}

async function saveSetting(key, value) {
  const saved = await request(`/settings/${key}`, { method: 'PUT', body: { value } });
  return saved.value;
}

function syncConfigEditors() {
  $('#rolesConfig').value = JSON.stringify(state.roleConfig, null, 2);
  $('#tableConfig').value = JSON.stringify(state.tableConfig, null, 2);
}

async function saveRolesConfig() {
  const parsed = JSON.parse($('#rolesConfig').value);
  state.roleConfig = await saveSetting('roleConfig', normalizeRoleConfig(parsed));
  if (!state.roleConfig[state.role]) state.role = Object.keys(state.roleConfig)[0] || 'boss';
  localStorage.setItem('role', state.role);
  applyRole();
}

async function saveTableConfig() {
  const parsed = JSON.parse($('#tableConfig').value);
  state.tableConfig = await saveSetting('orderTableConfig', parsed);
  renderSheet();
}

async function resetConfig() {
  if (!confirm('确认恢复默认表格和角色配置？')) return;
  state.tableConfig = structuredClone(defaultTableConfig);
  state.roleConfig = structuredClone(defaultRoleConfig);
  await Promise.all([
    saveSetting('orderTableConfig', state.tableConfig),
    saveSetting('roleConfig', state.roleConfig)
  ]);
  syncConfigEditors();
  applyRole();
  renderSheet();
}

function emptyItem(data = {}) {
  return {
    productId: '',
    barcode: '',
    customerItemNo: '',
    productImagePath: '',
    exportImagePath: '',
    factoryItemNo: '',
    productDescription: '',
    innerPack: '',
    cartons: 0,
    cartonQty: 0,
    unitPrice: 0,
    cbmPerCarton: 0,
    unitPieces: 0,
    lengthCm: 0,
    widthCm: 0,
    heightCm: 0,
    grossWeight: 0,
    netWeight: 0,
    deliveryStatus: 'pending',
    inspectionStatus: 'pending',
    supplyStatus: 'normal',
    warehouseStatus: 'not_arrived',
    deliveredCartons: 0,
    signatureFilePath: '',
    deliveryNotes: '',
    ...data
  };
}

function calcItem(item) {
  const cartons = Number(item.cartons || 0);
  const cartonQty = Number(item.cartonQty || 0);
  const unitPrice = Number(item.unitPrice || 0);
  const dimCbm = Number(item.lengthCm || 0) && Number(item.widthCm || 0) && Number(item.heightCm || 0)
    ? (Number(item.lengthCm) * Number(item.widthCm) * Number(item.heightCm)) / 1000000
    : 0;
  const rawCbm = String(item.cbmPerCarton ?? '');
  const cbmPerCarton = Number(rawCbm || 0) || dimCbm;
  const computed = {
    ...item,
    cbmPerCarton: rawCbm.endsWith('.') ? item.cbmPerCarton : round(cbmPerCarton, 3),
    totalPieces: Math.round(cartons * cartonQty),
    totalCbm: round(cartons * cbmPerCarton, 3),
    totalAmount: round(cartons * cartonQty * unitPrice, 2)
  };
  getColumns()
    .filter((column) => column.type === 'formula' && column.formula)
    .forEach((column) => {
      const value = evaluateFormula(column.formula, computed);
      computed[column.key] = round(value, Number(column.decimals ?? 2));
    });
  return computed;
}

function evaluateFormula(formula, row) {
  if (!/^[\w\s+\-*/().]+$/.test(formula)) return 0;
  const expression = formula.replace(/[A-Za-z_]\w*/g, (key) => Number(row[key] || 0));
  if (!/^[\d\s+\-*/().]+$/.test(expression)) return 0;
  try {
    return Function(`"use strict"; return (${expression});`)();
  } catch (error) {
    return 0;
  }
}

function round(value, digits) {
  return Number(Number(value || 0).toFixed(digits));
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

function imageHtml(path) {
  return path ? `<img class="thumb" src="${path}" alt="">` : '';
}

function statusLabel(type, value) {
  const maps = {
    deliveryStatus: { pending: '未送', delivering: '配送中', delivered: '已送' },
    inspectionStatus: { pending: '待验', passed: '验货通过', failed: '验货未过' },
    supplyStatus: { normal: '可供', unavailable: '无法供货' },
    warehouseStatus: { not_arrived: '未到仓', arrived: '已到仓' },
    paidStatus: { unpaid: '未付款', partial: '部分付款', paid: '已付款' }
  };
  return maps[type]?.[value] || value || '';
}

function statusClass(value) {
  return `s-${value || 'pending'}`;
}

function setTab(name) {
  const pages = getAllowedPages();
  if (name !== 'settings' && !pages.includes(name)) return;
  $$('.nav').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === name));
  $$('.view').forEach((view) => view.classList.toggle('active', view.id === name));
  $('#pageTitle').textContent = pageLabels[name] || $('.nav.active')?.textContent || '工作台';
  $('#sidebar').classList.remove('open');
}

function applyRole() {
  renderRoleOptions();
  const pages = getAllowedPages();
  $$('.nav').forEach((tab) => {
    tab.hidden = tab.dataset.tab !== 'settings' && !pages.includes(tab.dataset.tab);
  });
  $('#activeRoleSelect').value = state.role;
  const roleName = state.roleConfig[state.role]?.name || state.role;
  $('#roleHint').textContent = `当前角色：${roleName}`;
  const active = $('.nav.active');
  if (!active || active.hidden) setTab(pages[0] || 'orders');
}

function getAllowedPages() {
  return state.roleConfig?.[state.role]?.pages || defaultRoleConfig.boss.pages;
}

function renderRoleOptions() {
  const options = Object.entries(state.roleConfig || defaultRoleConfig)
    .map(([key, role]) => `<option value="${key}">${role.name || key}</option>`)
    .join('');
  $('#activeRoleSelect').innerHTML = options;
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setForm(form, data) {
  Object.entries(data).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value ?? '';
  });
}

function renderSheet() {
  state.items = state.items.map(calcItem);
  renderSheetStructure();
  $('#sheetBody').innerHTML = state.items.map((item, index) => rowHtml(item, index)).join('');
  $('#mobileItems').innerHTML = state.items.map((item, index) => mobileItemHtml(item, index)).join('');
  bindSheetEvents();
  updateTotals();
}

function renderSheetStructure() {
  const columns = getColumns();
  $('#sheetCols').innerHTML = columns.map((column) => `<col style="width:${Number(column.width || 100)}px">`).join('');
  $('#sheetHead').innerHTML = `<tr>${columns.map((column) => `<th>${escapeHtml(column.label || column.key)}${column.subLabel ? `<br><small>${escapeHtml(column.subLabel)}</small>` : ''}</th>`).join('')}</tr>`;
  $('#sheetFoot').innerHTML = `<tr>${columns.map((column, index) => {
    if (index === 0) return '<td>合计</td>';
    if (column.total === 'sum') return `<td data-sum="${column.key}">0</td>`;
    if (column.totalKey) return `<td data-sum="${column.totalKey}">0</td>`;
    return '<td></td>';
  }).join('')}</tr>`;
}

function getColumns() {
  const columns = (state.tableConfig || defaultTableConfig).columns || defaultTableConfig.columns;
  if ($('.view.active')?.id === 'orderEntry') {
    return columns.filter((column) => column.type !== 'status' && column.key !== '_status');
  }
  return columns;
}

function rowHtml(item, index) {
  return `
    <tr data-index="${index}" draggable="true" class="${item.inspectionStatus === 'failed' || item.supplyStatus === 'unavailable' ? 'row-warn' : ''}">
      ${getColumns().map((column) => cellHtml(column, item)).join('')}
    </tr>
  `;
}

function cellHtml(column, item) {
  if (column.type === 'actions') {
    return '<td class="drag-cell"><button type="button" class="drag-handle" data-action="lookup" title="查商品/拖动">⇅</button></td>';
  }
  if (column.type === 'image') {
    return `<td class="pic-cell">${imageHtml(item[column.key])}<input type="file" accept="image/*" data-field="photoFile"></td>`;
  }
  if (column.type === 'textarea') {
    return `<td><textarea data-field="${column.key}">${escapeHtml(item[column.key] || '')}</textarea></td>`;
  }
  if (column.type === 'formula') {
    const decimals = Number(column.decimals ?? 2);
    return `<td data-computed="${column.key}">${formatValue(Number(item[column.key] || 0).toFixed(decimals), column)}</td>`;
  }
  if (column.type === 'volume') {
    return `<td><div class="cell-with-suffix"><input data-field="${column.key}" type="number" step="${column.step || '0.001'}" value="${escapeHtml(item[column.key] ?? 0)}">${column.suffix ? `<span>${escapeHtml(column.suffix)}</span>` : ''}</div><button type="button" data-action="volume" class="ghost">体积</button></td>`;
  }
  if (column.type === 'status') {
    return `<td>${statusPills(item)}</td>`;
  }
  return inputCell(column.key, item[column.key], column.type === 'number' ? 'number' : 'text', column.step || '', column);
}

function inputCell(field, value, type = 'text', step = '', column = {}) {
  const input = `<input data-field="${field}" type="${type}" ${step ? `step="${step}"` : ''} value="${escapeHtml(value ?? '')}">`;
  return `<td>${column.suffix ? `<div class="cell-with-suffix">${input}<span>${escapeHtml(column.suffix)}</span></div>` : input}</td>`;
}

function formatValue(value, column = {}) {
  return `${value}${column.suffix ? ` ${column.suffix}` : ''}`;
}

function statusPills(item) {
  return `
    <div class="status-pills">
      <span class="pill ${statusClass(item.deliveryStatus)}">${statusLabel('deliveryStatus', item.deliveryStatus)}</span>
      <span class="pill ${statusClass(item.inspectionStatus)}">${statusLabel('inspectionStatus', item.inspectionStatus)}</span>
      <span class="pill ${statusClass(item.warehouseStatus)}">${statusLabel('warehouseStatus', item.warehouseStatus)}</span>
    </div>
  `;
}

function mobileItemHtml(item, index) {
  return `
    <article class="mobile-item" data-index="${index}">
      <div class="actions">
        <strong>${item.customerItemNo || item.factoryItemNo || `产品 ${index + 1}`}</strong>
        <button type="button" data-mobile-edit="${index}" class="ghost">编辑</button>
      </div>
      ${imageHtml(item.productImagePath)}
      <div class="meta">件数：${item.cartons || 0} / 装箱数：${item.cartonQty || 0} / 金额：${money(item.totalAmount)}<br>${statusPills(item)}</div>
    </article>
  `;
}

function bindSheetEvents() {
  $$('#sheetBody tr').forEach((row) => {
    const index = Number(row.dataset.index);
    row.addEventListener('contextmenu', (event) => showRowMenu(event, index));
    row.addEventListener('dragstart', (event) => event.dataTransfer.setData('text/plain', String(index)));
    row.addEventListener('dragover', (event) => event.preventDefault());
    row.addEventListener('drop', (event) => {
      event.preventDefault();
      const from = Number(event.dataTransfer.getData('text/plain'));
      moveRow(from, index);
    });
    $$('[data-field]', row).forEach((input) => {
      if (input.type === 'file') {
        input.addEventListener('change', (event) => uploadItemPhoto(index, event.target.files));
      } else {
        input.addEventListener('input', () => {
          state.items[index][input.dataset.field] = input.value;
          state.items[index] = calcItem(state.items[index]);
          updateRowComputed(row, index);
          updateTotals();
        });
        input.addEventListener('change', () => {
          state.items[index] = calcItem(state.items[index]);
          updateRowComputed(row, index);
          updateTotals();
        });
      }
    });
    $$('[data-action]', row).forEach((button) => button.addEventListener('click', () => handleRowAction(index, button.dataset.action)));
  });
  $$('[data-mobile-edit]').forEach((button) => button.addEventListener('click', () => openItemDialog(Number(button.dataset.mobileEdit))));
}

function showRowMenu(event, index) {
  event.preventDefault();
  state.contextIndex = index;
  const menu = $('#rowMenu');
  menu.style.left = `${event.clientX}px`;
  menu.style.top = `${event.clientY}px`;
  menu.hidden = false;
}

function moveRow(from, to) {
  if (Number.isNaN(from) || from === to) return;
  const [item] = state.items.splice(from, 1);
  state.items.splice(to, 0, item);
  renderSheet();
}

function updateRowComputed(row, index) {
  const item = calcItem(state.items[index]);
  getColumns().forEach((column) => {
    const cell = row.querySelector(`[data-computed="${column.key}"]`);
    if (cell) cell.textContent = Number(item[column.key] || 0).toFixed(Number(column.decimals ?? 2));
  });
}

async function uploadItemPhoto(index, files) {
  const uploaded = await uploadFiles('products', files);
  if (!uploaded[0]) return;
  state.items[index].productImagePath = uploaded[0].path;
  state.items[index].exportImagePath = uploaded[0].path;
  if (confirm('是否保存这张照片和基础资料到商品库？')) {
    await saveItemToProduct(state.items[index]);
  }
  renderSheet();
}

async function handleBatchPhotos(files) {
  const uploaded = await uploadFiles('products', files);
  if (!uploaded.length) return;
  if (!hasMeaningfulItems()) {
    state.items = uploaded.map((file) => emptyItem({ productImagePath: file.path, exportImagePath: file.path }));
    renderSheet();
    return;
  }
  state.pendingPhotos = uploaded;
  $('#photoAssignList').innerHTML = uploaded.map((file, photoIndex) => `
    <article class="card photo-assign-row">
      ${imageHtml(file.path)}
      <label>插入到行
        <select data-photo-index="${photoIndex}">
          <option value="new">新增一行</option>
          ${state.items.map((item, index) => `<option value="${index}">${index + 1}. ${escapeHtml(item.customerItemNo || item.factoryItemNo || '未命名产品')}</option>`).join('')}
        </select>
      </label>
    </article>
  `).join('');
  $('#photoAssignDialog').showModal();
}

function applyPhotoAssign() {
  $$('[data-photo-index]').forEach((select) => {
    const file = state.pendingPhotos[Number(select.dataset.photoIndex)];
    if (!file) return;
    if (select.value === 'new') {
      state.items.push(emptyItem({ productImagePath: file.path, exportImagePath: file.path }));
      return;
    }
    const index = Number(select.value);
    state.items[index].productImagePath = file.path;
    state.items[index].exportImagePath = file.path;
  });
  state.pendingPhotos = [];
  $('#photoAssignDialog').close();
  renderSheet();
}

function hasMeaningfulItems() {
  return state.items.some((item) => fields.some((field) => {
    if (['deliveryStatus', 'inspectionStatus', 'supplyStatus', 'warehouseStatus'].includes(field)) return false;
    const value = item[field];
    return value !== undefined && value !== null && value !== '' && value !== 0;
  }));
}

function batchFillItemNos() {
  const pattern = prompt('输入规律：前缀,起始数字,数量,位数。例如：A,1,100,3 会生成 A001-A100');
  if (!pattern) return;
  const [prefix = '', start = '1', count = '1', pad = '0'] = pattern.split(',').map((part) => part.trim());
  const startNo = Number(start);
  const total = Number(count);
  const padSize = Number(pad);
  if (!Number.isFinite(startNo) || !Number.isFinite(total)) return alert('格式不正确');
  while (state.items.length < total) state.items.push(emptyItem());
  for (let index = 0; index < total; index += 1) {
    state.items[index].customerItemNo = `${prefix}${String(startNo + index).padStart(padSize, '0')}`;
  }
  renderSheet();
}

async function handleRowAction(index, action) {
  if (action === 'up' && index > 0) {
    [state.items[index - 1], state.items[index]] = [state.items[index], state.items[index - 1]];
  }
  if (action === 'down' && index < state.items.length - 1) {
    [state.items[index + 1], state.items[index]] = [state.items[index], state.items[index + 1]];
  }
  if (action === 'copy') state.items.splice(index + 1, 0, { ...state.items[index] });
  if (action === 'delete' && state.items.length > 1) state.items.splice(index, 1);
  if (action === 'lookup') await lookupProduct(index);
  if (action === 'scan') await scanBarcode(index);
  if (action === 'volume') volumeCalculator(index);
  renderSheet();
}

function handleContextAction(action) {
  const index = state.contextIndex;
  if (index === null || index === undefined) return;
  if (action === 'insertAbove') state.items.splice(index, 0, emptyItem());
  if (action === 'insertBelow') state.items.splice(index + 1, 0, emptyItem());
  if (action === 'copy') state.items.splice(index + 1, 0, { ...state.items[index] });
  if (action === 'delete' && state.items.length > 1) state.items.splice(index, 1);
  $('#rowMenu').hidden = true;
  renderSheet();
}

function volumeCalculator(index) {
  const input = prompt('输入长 宽 高，单位 cm，例如：30 50 60');
  if (!input) return;
  const [lengthCm, widthCm, heightCm] = input.split(/[,\s]+/).map(Number);
  if (!lengthCm || !widthCm || !heightCm) return alert('请按 “30 50 60” 格式输入');
  Object.assign(state.items[index], { lengthCm, widthCm, heightCm, cbmPerCarton: round(lengthCm * widthCm * heightCm / 1000000, 3) });
}

async function lookupProduct(index) {
  const barcode = state.items[index].barcode || prompt('请输入条码');
  if (!barcode) return;
  state.items[index].barcode = barcode;
  try {
    const product = await request(`/products/barcode/${encodeURIComponent(barcode)}`);
    Object.assign(state.items[index], {
      productId: product.id,
      factoryItemNo: product.factoryItemNo,
      productImagePath: product.productImagePath,
      exportImagePath: product.exportImagePath || product.productImagePath,
      productDescription: product.description,
      innerPack: product.innerPack,
      cartonQty: product.cartonQty,
      cbmPerCarton: product.cbmPerCarton,
      unitPieces: product.unitPieces
    });
  } catch (error) {
    if (confirm('商品库没有这个条码。填写基础信息后保存到商品库？')) {
      await saveItemToProduct(state.items[index]);
    }
  }
}

async function saveItemToProduct(item) {
  await request('/products', {
    method: 'POST',
    body: {
      barcode: item.barcode,
      factoryItemNo: item.factoryItemNo,
      productImagePath: item.productImagePath,
      exportImagePath: item.exportImagePath,
      description: item.productDescription,
      innerPack: item.innerPack,
      cartonQty: item.cartonQty,
      cbmPerCarton: item.cbmPerCarton,
      unitPieces: item.unitPieces
    }
  }).catch(() => {});
  await loadProducts();
}

let scannerControls = null;
async function scanBarcode(index) {
  if (!window.ZXingBrowser) return alert('扫码库未加载，请手动输入条码');
  if (!window.isSecureContext) {
    alert('浏览器相机权限通常要求 HTTPS 或 localhost。手机用局域网 http 打开时无法调用相机，请改用 HTTPS 部署、localhost 调试，或手动输入/上传条码图片。');
    return;
  }
  $('#scannerModal').hidden = false;
  const reader = new ZXingBrowser.BrowserMultiFormatReader();
  try {
    scannerControls = await reader.decodeFromVideoDevice(null, $('#scannerVideo'), async (result) => {
      if (!result) return;
      state.items[index].barcode = result.getText();
      stopScanner();
      await lookupProduct(index);
      renderSheet();
    });
  } catch (error) {
    stopScanner();
    alert('无法打开摄像头，请检查浏览器权限或手动输入条码');
  }
}

function stopScanner() {
  if (scannerControls) scannerControls.stop();
  scannerControls = null;
  $('#scannerModal').hidden = true;
}

function updateTotals() {
  const totals = state.items.reduce((sum, item) => {
    const row = calcItem(item);
    Object.keys(row).forEach((key) => {
      if (typeof row[key] === 'number') {
        sum[key] = (sum[key] || 0) + Number(row[key] || 0);
      }
    });
    return sum;
  }, {});
  $$('[data-sum]').forEach((cell) => {
    const key = cell.dataset.sum;
    const column = getColumns().find((item) => item.key === key || item.totalKey === key);
    const decimals = Number(column?.decimals ?? (key.toLowerCase().includes('amount') ? 2 : key.toLowerCase().includes('cbm') ? 3 : 0));
    cell.textContent = formatValue(Number(totals[key] || 0).toFixed(decimals), column);
  });
}

async function saveOrder(event) {
  event.preventDefault();
  const form = $('#orderForm');
  const front = await uploadFiles('marks', $('#frontMarkUpload').files);
  const side = await uploadFiles('marks', $('#sideMarkUpload').files);
  const barcode = await uploadFiles('barcodes', $('#barcodeUpload').files);
  if (front[0]) form.elements.frontMarkImagePath.value = front[0].path;
  if (side[0]) form.elements.sideMarkImagePath.value = side[0].path;
  if (barcode[0]) form.elements.barcodeFilePath.value = barcode[0].path;
  const payload = { ...formData(form), items: state.items.map((item) => ({ ...calcItem(item), cbmPerCarton: Number(item.cbmPerCarton || 0) })) };
  const id = payload.id;
  delete payload.id;
  const saved = await request(id ? `/orders/${id}` : '/orders', { method: id ? 'PUT' : 'POST', body: payload });
  form.elements.id.value = saved.id || id;
  await refreshAll();
  alert('订单已保存');
}

async function loadOrders() {
  state.orders = await request('/orders');
  renderOrderList();
  renderAccounting();
}

function renderOrderList() {
  const keyword = ($('#orderSearchInput')?.value || '').toLowerCase();
  const rows = state.orders.filter((order) => JSON.stringify(order).toLowerCase().includes(keyword));
  $('#orderList').innerHTML = rows.map(orderCard).join('') || '<p class="meta">暂无订单</p>';
  $$('.edit-order').forEach((button) => button.addEventListener('click', () => editOrder(button.dataset.id)));
  $$('.delete-order').forEach((button) => button.addEventListener('click', () => deleteOrder(button.dataset.id)));
}

function orderCard(order) {
  const stats = order.statusStats || {};
  const deliveredRatio = stats.total ? Math.round((stats.delivered || 0) / stats.total * 360) : 0;
  return `
    <article class="card">
      <div class="actions">
        <div>
          <div class="card-title">${order.orderNo || order.id} · ${order.customerName || '未填写客户'}</div>
          <div class="meta">送货：${order.deliveryTime || ''}<br>已送：${stats.delivered || 0}/${stats.total || 0}，到仓：${stats.arrived || 0}，异常：${(stats.failed || 0) + (stats.unavailable || 0)}</div>
          <span class="pill ${statusClass(order.paidStatus)}">${statusLabel('paidStatus', order.paidStatus)}</span>
        </div>
        <div class="pie" style="--a:${deliveredRatio}deg" title="送货进度"></div>
      </div>
      <div class="actions">
        <button class="ghost edit-order" data-id="${order.id}">编辑</button>
        <a class="link-btn" href="/api/orders/${order.id}/export/excel">Excel</a>
        <a class="link-btn" href="/api/orders/${order.id}/export/pdf">PDF</a>
        <button class="danger delete-order" data-id="${order.id}">删除</button>
      </div>
    </article>
  `;
}

async function editOrder(id) {
  const order = await request(`/orders/${id}`);
  setForm($('#orderForm'), order);
  state.items = (order.items.length ? order.items : [{}]).map(emptyItem);
  renderSheet();
  setTab('orderEntry');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteOrder(id) {
  if (!confirm('确认删除？删除会保留历史记录。')) return;
  await request(`/orders/${id}`, { method: 'DELETE' });
  await refreshAll();
}

async function loadProducts() {
  state.products = await request('/products');
  $('#productList').innerHTML = state.products.map((item) => `
    <tr data-product-id="${item.id}">
      <td>${imageHtml(item.productImagePath)}</td>
      <td>${escapeHtml(item.barcode || '')}</td>
      <td>${escapeHtml(item.factoryItemNo || '')}</td>
      <td>${escapeHtml(item.description || '')}</td>
      <td>${escapeHtml(item.innerPack || '')}</td>
      <td>${item.cartonQty || 0}</td>
      <td>${item.cbmPerCarton || 0}</td>
      <td>${item.stock || 0}</td>
      <td>${escapeHtml(item.location || '')}</td>
    </tr>
  `).join('');
}

async function loadInventory() {
  state.inventory = await request('/dashboard/inventory');
  $('#inventoryList').innerHTML = state.inventory.map((item) => `
    <article class="card">
      ${imageHtml(item.productImagePath)}
      <div class="card-title">${escapeHtml(item.name || item.factoryItemNo || '')}</div>
      <div class="meta">条码：${escapeHtml(item.barcode || '')}<br>库存：${item.stock || 0}<br>货位：${escapeHtml(item.location || '待补充')}</div>
    </article>
  `).join('') || '<p class="meta">暂无库存</p>';
}

async function loadDelivery() {
  const orders = await request('/orders');
  const sortMode = $('#deliverySortMode')?.value || 'orderTime';
  const details = await Promise.all(orders.map((order) => request(`/orders/${order.id}`)));
  state.deliveryOrders = details.sort((a, b) => String(a[sortMode] || '').localeCompare(String(b[sortMode] || '')));
  const mode = $('#deliveryViewMode')?.value || 'list';
  $('#deliveryList').classList.toggle('calendar-grid', mode === 'calendar');
  $('#deliveryList').innerHTML = mode === 'calendar'
    ? renderDeliveryCalendar(state.deliveryOrders)
    : state.deliveryOrders.flatMap((order) => order.items.map((item, index) => deliveryCard(order, item, index))).join('') || '<p class="meta">暂无待送货物</p>';
  $$('.delivery-save').forEach((button) => button.addEventListener('click', () => saveDeliveryItem(button.dataset.orderId, Number(button.dataset.index))));
  $$('.signature-upload').forEach((input) => input.addEventListener('change', (event) => uploadSignature(input.dataset.orderId, Number(input.dataset.index), event.target.files)));
}

function renderDeliveryCalendar(orders) {
  const groups = {};
  orders.forEach((order) => {
    const day = order.deliveryTime || '未定日期';
    groups[day] = groups[day] || [];
    groups[day].push(order);
  });
  return Object.entries(groups).map(([day, rows]) => `
    <article class="card calendar-day">
      <div class="card-title">${escapeHtml(day)}</div>
      ${rows.map((order) => `<div class="meta">${escapeHtml(order.orderNo || String(order.id))} · ${escapeHtml(order.customerName || '')}</div>`).join('')}
    </article>
  `).join('');
}

function deliveryCard(order, item, index) {
  return `
    <article class="card" data-order-id="${order.id}" data-index="${index}">
      <div class="card-title">${order.orderNo || order.id} · ${item.factoryItemNo || item.customerItemNo || '产品'}</div>
      ${imageHtml(item.productImagePath)}
      <div class="meta">客户：${order.customerName || ''}<br>地址：${order.deliveryAddress || ''}</div>
      <label>配送状态${selectHtml('deliveryStatus', item.deliveryStatus, { pending: '未送', delivering: '配送中', delivered: '已送' })}</label>
      <label>验货状态${selectHtml('inspectionStatus', item.inspectionStatus, { pending: '待验', passed: '通过', failed: '未通过' })}</label>
      <label>到仓状态${selectHtml('warehouseStatus', item.warehouseStatus, { not_arrived: '未到仓', arrived: '已到仓' })}</label>
      <label>供货状态${selectHtml('supplyStatus', item.supplyStatus, { normal: '可供', unavailable: '无法供货' })}</label>
      <div class="form-grid">
        <label>已送件数<input data-field="deliveredCartons" type="number" value="${item.deliveredCartons || 0}"></label>
        <label>毛重<input data-field="grossWeight" type="number" step="0.01" value="${item.grossWeight || 0}"></label>
        <label>净重<input data-field="netWeight" type="number" step="0.01" value="${item.netWeight || 0}"></label>
      </div>
      <label>签字单<input class="signature-upload" data-order-id="${order.id}" data-index="${index}" type="file" accept="image/*,.pdf" capture="environment"></label>
      <label>备注<textarea data-field="deliveryNotes">${item.deliveryNotes || ''}</textarea></label>
      <button class="primary delivery-save" data-order-id="${order.id}" data-index="${index}">保存送货记录</button>
    </article>
  `;
}

function selectHtml(field, value, options) {
  return `<select data-field="${field}">${Object.entries(options).map(([key, label]) => `<option value="${key}" ${key === value ? 'selected' : ''}>${label}</option>`).join('')}</select>`;
}

async function uploadSignature(orderId, index, files) {
  const uploaded = await uploadFiles('signatures', files);
  if (!uploaded[0]) return;
  const order = await request(`/orders/${orderId}`);
  order.items[index].signatureFilePath = uploaded[0].path;
  await request(`/orders/${orderId}`, { method: 'PUT', body: order });
  await refreshAll();
}

async function saveDeliveryItem(orderId, index) {
  const card = $(`.card[data-order-id="${orderId}"][data-index="${index}"]`);
  const order = await request(`/orders/${orderId}`);
  $$('[data-field]', card).forEach((input) => {
    order.items[index][input.dataset.field] = input.value;
  });
  await request(`/orders/${orderId}`, { method: 'PUT', body: order });
  await refreshAll();
}

function renderAccounting() {
  const totals = state.orders.reduce((sum, order) => {
    sum.amount += Number(order.total || 0);
    sum.paid += Number(order.paidAmount || 0);
    if (order.paidStatus === 'paid') sum.paidOrders += 1;
    return sum;
  }, { amount: 0, paid: 0, paidOrders: 0 });
  $('#accountingSummary').innerHTML = `
    <article class="card"><div class="card-title">订单总金额</div><div class="meta">${money(totals.amount)}</div></article>
    <article class="card"><div class="card-title">已收金额</div><div class="meta">${money(totals.paid)}</div></article>
    <article class="card"><div class="card-title">未收金额</div><div class="meta">${money(totals.amount - totals.paid)}</div></article>
    <article class="card"><div class="card-title">已付款订单</div><div class="meta">${totals.paidOrders}/${state.orders.length}</div></article>
  `;
  $('#accountingList').innerHTML = state.orders.map((order) => `
    <article class="card">
      <div class="card-title">${order.orderNo || order.id} · ${order.customerName || ''}</div>
      <div class="meta">订单金额：${money(order.total)} / 已付：${money(order.paidAmount)} / ${statusLabel('paidStatus', order.paidStatus)}</div>
    </article>
  `).join('');
}

function openItemDialog(index) {
  state.editingIndex = index;
  const item = state.items[index];
  $('#dialogFields').innerHTML = `
    <div class="dialog-grid">
      ${dialogInput('barcode', '条码', item.barcode)}
      ${dialogInput('customerItemNo', '客人货号', item.customerItemNo)}
      ${dialogInput('factoryItemNo', '厂家货号', item.factoryItemNo)}
      ${dialogInput('innerPack', '内装', item.innerPack)}
      ${dialogInput('cartons', '件数', item.cartons, 'number')}
      ${dialogInput('cartonQty', '装箱数', item.cartonQty, 'number')}
      ${dialogInput('unitPrice', '单价', item.unitPrice, 'number')}
      ${dialogInput('cbmPerCarton', '单件体积', item.cbmPerCarton, 'number')}
    </div>
    <label>描述<textarea data-dialog-field="productDescription">${item.productDescription || ''}</textarea></label>
  `;
  $('#itemDialog').showModal();
}

function dialogInput(field, label, value, type = 'text') {
  return `<label>${label}<input data-dialog-field="${field}" type="${type}" value="${escapeHtml(value ?? '')}"></label>`;
}

function saveDialogItem() {
  const index = state.editingIndex;
  $$('[data-dialog-field]').forEach((input) => {
    state.items[index][input.dataset.dialogField] = input.value;
  });
  state.items[index] = calcItem(state.items[index]);
  $('#itemDialog').close();
  renderSheet();
}

async function exportCurrent(kind) {
  const id = $('#orderForm').elements.id.value;
  if (!id) return alert('请先保存订单');
  location.href = `/api/orders/${id}/export/${kind}`;
}

async function runGlobalSearch() {
  const keyword = $('#globalSearchInput').value.trim();
  if (!keyword) return;
  const result = await request(`/search?q=${encodeURIComponent(keyword)}`);
  $('#globalSearchResults').innerHTML = `
    <article class="card"><div class="card-title">订单</div>${result.orders.map((order) => `<div class="meta"><button class="ghost edit-order" data-id="${order.id}">打开</button> ${escapeHtml(order.orderNo || String(order.id))} · ${escapeHtml(order.customerName || '')}</div>`).join('') || '<div class="meta">无结果</div>'}</article>
    <article class="card"><div class="card-title">商品</div>${result.products.map((product) => `<div class="meta">${imageHtml(product.productImagePath)}${escapeHtml(product.factoryItemNo || '')} · ${escapeHtml(product.barcode || '')}<br>${escapeHtml(product.description || '')}</div>`).join('') || '<div class="meta">无结果</div>'}</article>
  `;
  $$('#globalSearchResults .edit-order').forEach((button) => button.addEventListener('click', () => editOrder(button.dataset.id)));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

async function refreshAll() {
  await Promise.all([loadProducts(), loadOrders(), loadInventory(), loadDelivery()]);
}

$$('.nav').forEach((tab) => tab.addEventListener('click', () => setTab(tab.dataset.tab)));
$('#menuToggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#activeRoleSelect').addEventListener('change', (event) => {
  state.role = event.target.value;
  localStorage.setItem('role', state.role);
  applyRole();
});
$('#orderForm').addEventListener('submit', saveOrder);
$('#addRow').addEventListener('click', () => {
  state.items.push(emptyItem());
  renderSheet();
});
$('#batchImages').addEventListener('click', () => $('#batchImagesInput').click());
$('#batchImagesInput').addEventListener('change', async (event) => {
  await handleBatchPhotos(event.target.files);
});
$('#batchItemNos').addEventListener('click', batchFillItemNos);
$('#exportExcel').addEventListener('click', () => exportCurrent('excel'));
$('#exportPdf').addEventListener('click', () => exportCurrent('pdf'));
$('#refreshAll').addEventListener('click', refreshAll);
$('#stopScanner').addEventListener('click', stopScanner);
$('#saveDialogItem').addEventListener('click', saveDialogItem);
$('#applyPhotoAssign').addEventListener('click', applyPhotoAssign);
$('#orderSearchInput').addEventListener('input', renderOrderList);
$('#globalSearchBtn').addEventListener('click', runGlobalSearch);
$('#globalSearchInput').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') runGlobalSearch();
});
$('#deliveryViewMode').addEventListener('change', loadDelivery);
$('#deliverySortMode').addEventListener('change', loadDelivery);
document.addEventListener('click', () => {
  $('#rowMenu').hidden = true;
});
$$('#rowMenu [data-menu-action]').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    handleContextAction(button.dataset.menuAction);
  });
});
$('#sheetDropZone').addEventListener('dragover', (event) => {
  event.preventDefault();
  $('#sheetDropZone').classList.add('drag-over');
});
$('#sheetDropZone').addEventListener('dragleave', () => $('#sheetDropZone').classList.remove('drag-over'));
$('#sheetDropZone').addEventListener('drop', async (event) => {
  event.preventDefault();
  $('#sheetDropZone').classList.remove('drag-over');
  const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith('image/'));
  await handleBatchPhotos(files);
});
$('#saveRolesConfig').addEventListener('click', () => saveRolesConfig().then(() => alert('角色权限已保存')).catch((error) => alert(`角色配置格式错误：${error.message}`)));
$('#saveTableConfig').addEventListener('click', () => saveTableConfig().then(() => alert('表格配置已保存')).catch((error) => alert(`表格配置格式错误：${error.message}`)));
$('#resetConfig').addEventListener('click', resetConfig);

async function init() {
  await loadSettings();
  state.items = [emptyItem()];
  applyRole();
  renderSheet();
  await refreshAll();
}

init().catch((error) => alert(`加载失败：${error.message}`));
