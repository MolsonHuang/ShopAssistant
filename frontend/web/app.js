const api = `${location.origin}/api`;
const state = {
  products: [],
  orders: [],
  items: [],
  editingIndex: null,
  role: localStorage.getItem('role') || 'boss'
};

const fields = [
  'productId', 'barcode', 'customerItemNo', 'productImagePath', 'exportImagePath', 'factoryItemNo',
  'productDescription', 'innerPack', 'cartons', 'cartonQty', 'unitPrice', 'cbmPerCarton',
  'unitPieces', 'lengthCm', 'widthCm', 'heightCm', 'grossWeight', 'netWeight', 'deliveryStatus',
  'inspectionStatus', 'supplyStatus', 'warehouseStatus', 'deliveredCartons', 'signatureFilePath',
  'deliveryNotes'
];

const rolePages = {
  boss: ['orders', 'products', 'delivery', 'accounting', 'settings'],
  sales: ['orders', 'delivery'],
  warehouse: ['delivery', 'products'],
  accounting: ['accounting', 'orders']
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
  return {
    ...item,
    cbmPerCarton: rawCbm.endsWith('.') ? item.cbmPerCarton : round(cbmPerCarton, 3),
    totalPieces: Math.round(cartons * cartonQty),
    totalCbm: round(cartons * cbmPerCarton, 3),
    totalAmount: round(cartons * cartonQty * unitPrice, 2)
  };
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
  if (!rolePages[state.role].includes(name)) return;
  $$('.nav').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === name));
  $$('.view').forEach((view) => view.classList.toggle('active', view.id === name));
  $('#pageTitle').textContent = $('.nav.active')?.textContent || '工作台';
  $('#sidebar').classList.remove('open');
}

function applyRole() {
  $$('.nav').forEach((tab) => {
    tab.hidden = !rolePages[state.role].includes(tab.dataset.tab);
  });
  $('#roleSelect').value = state.role;
  const roleName = $('#roleSelect').selectedOptions[0].textContent.split('：')[0];
  $('#roleHint').textContent = `当前角色：${roleName}`;
  const active = $('.nav.active');
  if (!active || active.hidden) setTab(rolePages[state.role][0]);
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
  $('#sheetBody').innerHTML = state.items.map((item, index) => rowHtml(item, index)).join('');
  $('#mobileItems').innerHTML = state.items.map((item, index) => mobileItemHtml(item, index)).join('');
  bindSheetEvents();
  updateTotals();
}

function rowHtml(item, index) {
  return `
    <tr data-index="${index}" class="${item.inspectionStatus === 'failed' || item.supplyStatus === 'unavailable' ? 'row-warn' : ''}">
      <td><div class="row-actions">
        <button type="button" data-action="up">↑</button>
        <button type="button" data-action="down">↓</button>
        <button type="button" data-action="copy">复</button>
        <button type="button" data-action="delete">删</button>
        <button type="button" data-action="scan">扫</button>
        <button type="button" data-action="lookup">查</button>
      </div></td>
      ${inputCell('customerItemNo', item.customerItemNo)}
      <td class="pic-cell">${imageHtml(item.productImagePath)}<input type="file" accept="image/*" data-field="photoFile"></td>
      ${inputCell('factoryItemNo', item.factoryItemNo)}
      <td><textarea data-field="productDescription">${item.productDescription || ''}</textarea></td>
      ${inputCell('innerPack', item.innerPack)}
      ${inputCell('cartons', item.cartons, 'number')}
      ${inputCell('cartonQty', item.cartonQty, 'number')}
      ${inputCell('unitPrice', item.unitPrice, 'number', '0.01')}
      <td data-total="amount">${money(item.totalAmount)}</td>
      <td>
        <input data-field="cbmPerCarton" type="number" step="0.001" value="${item.cbmPerCarton || 0}">
        <button type="button" data-action="volume" class="ghost">体积</button>
      </td>
      <td data-total="cbm">${Number(item.totalCbm || 0).toFixed(3)}</td>
      <td>${statusPills(item)}</td>
    </tr>
  `;
}

function inputCell(field, value, type = 'text', step = '') {
  return `<td><input data-field="${field}" type="${type}" ${step ? `step="${step}"` : ''} value="${escapeHtml(value ?? '')}"></td>`;
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

function updateRowComputed(row, index) {
  const item = calcItem(state.items[index]);
  row.querySelector('[data-total="amount"]').textContent = money(item.totalAmount);
  row.querySelector('[data-total="cbm"]').textContent = Number(item.totalCbm || 0).toFixed(3);
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
    sum.cartons += Number(row.cartons || 0);
    sum.pieces += Number(row.totalPieces || 0);
    sum.amount += Number(row.totalAmount || 0);
    sum.cbm += Number(row.totalCbm || 0);
    return sum;
  }, { cartons: 0, pieces: 0, amount: 0, cbm: 0 });
  $('#sumCartons').textContent = totals.cartons;
  $('#sumPieces').textContent = totals.pieces;
  $('#sumAmount').textContent = money(totals.amount);
  $('#sumCbm').textContent = totals.cbm.toFixed(3);
  $('#sumStatus').textContent = `${state.items.filter((i) => i.deliveryStatus === 'delivered').length}/${state.items.length} 已送`;
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
  $('#orderList').innerHTML = state.orders.map(orderCard).join('') || '<p class="meta">暂无订单</p>';
  $$('.edit-order').forEach((button) => button.addEventListener('click', () => editOrder(button.dataset.id)));
  $$('.delete-order').forEach((button) => button.addEventListener('click', () => deleteOrder(button.dataset.id)));
  renderAccounting();
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
  setTab('orders');
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
    <article class="card">
      ${imageHtml(item.productImagePath)}
      <div class="card-title">${item.factoryItemNo || '未填写厂家货号'}</div>
      <div class="meta">条码：${item.barcode || ''}<br>描述：${item.description || ''}<br>内装：${item.innerPack || ''} / 装箱数：${item.cartonQty || 0}<br>体积：${item.cbmPerCarton || 0}</div>
    </article>
  `).join('') || '<p class="meta">暂无商品</p>';
}

async function loadDelivery() {
  const orders = await request('/orders');
  const details = await Promise.all(orders.map((order) => request(`/orders/${order.id}`)));
  $('#deliveryList').innerHTML = details.flatMap((order) => order.items.map((item, index) => deliveryCard(order, item, index))).join('') || '<p class="meta">暂无待送货物</p>';
  $$('.delivery-save').forEach((button) => button.addEventListener('click', () => saveDeliveryItem(button.dataset.orderId, Number(button.dataset.index))));
  $$('.signature-upload').forEach((input) => input.addEventListener('change', (event) => uploadSignature(input.dataset.orderId, Number(input.dataset.index), event.target.files)));
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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

async function refreshAll() {
  await Promise.all([loadProducts(), loadOrders(), loadDelivery()]);
}

$$('.nav').forEach((tab) => tab.addEventListener('click', () => setTab(tab.dataset.tab)));
$('#menuToggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#roleSelect').addEventListener('change', (event) => {
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
  const uploaded = await uploadFiles('products', event.target.files);
  uploaded.forEach((file) => state.items.push(emptyItem({ productImagePath: file.path, exportImagePath: file.path })));
  renderSheet();
});
$('#exportExcel').addEventListener('click', () => exportCurrent('excel'));
$('#exportPdf').addEventListener('click', () => exportCurrent('pdf'));
$('#refreshAll').addEventListener('click', refreshAll);
$('#stopScanner').addEventListener('click', stopScanner);
$('#saveDialogItem').addEventListener('click', saveDialogItem);

state.items = [emptyItem()];
applyRole();
renderSheet();
refreshAll().catch((error) => alert(`加载失败：${error.message}`));
