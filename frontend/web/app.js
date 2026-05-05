const api = `${location.origin}/api`;
const state = { products: [], orders: [], inventory: [] };

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

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

function number(value, digits = 3) {
  return Number(value || 0).toFixed(digits);
}

function setTab(name) {
  $$('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === name));
  $$('.view').forEach((view) => view.classList.toggle('active', view.id === name));
}

function imageHtml(path) {
  return path ? `<img class="thumb" src="${path}" alt="">` : '';
}

async function loadProducts() {
  state.products = await request('/products');
  $('#productList').innerHTML = state.products.map((item) => `
    <article class="card">
      ${imageHtml(item.productImagePath)}
      <div class="card-title">${item.factoryItemNo || '未填写厂家货号'}</div>
      <div class="meta">条码：${item.barcode || '未填写'}<br>描述：${item.description || ''}<br>内装：${item.innerPack || ''} / 装箱数：${item.cartonQty || 0}<br>体积：${item.cbmPerCarton || 0} / 单件件数：${item.unitPieces || 0}</div>
      <button class="ghost edit-product" data-id="${item.id}">编辑</button>
    </article>
  `).join('') || '<p class="meta">暂无商品</p>';

  $$('.edit-product').forEach((button) => {
    button.addEventListener('click', () => {
      const product = state.products.find((item) => item.id === Number(button.dataset.id));
      const form = $('#productForm');
      Object.entries(product).forEach(([key, value]) => {
        if (form.elements[key]) form.elements[key].value = value || '';
      });
    });
  });
}

async function saveProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const uploaded = await uploadFiles('products', $('#productImageUpload').files);
  if (uploaded[0]) {
    form.elements.productImagePath.value = uploaded[0].path;
    form.elements.exportImagePath.value = uploaded[0].path;
  }
  const payload = formData(form);
  const id = payload.id;
  delete payload.id;
  await request(id ? `/products/${id}` : '/products', { method: id ? 'PUT' : 'POST', body: payload });
  form.reset();
  await refreshAll();
}

function addOrderItem(item = {}) {
  const node = $('#itemTemplate').content.firstElementChild.cloneNode(true);
  Object.entries(item).forEach(([key, value]) => {
    if ($( `[name="${key}"]`, node)) $( `[name="${key}"]`, node).value = value || '';
  });
  renderPreview(node);
  $('.remove-item', node).addEventListener('click', () => {
    if ($$('#orderItems .item-card').length > 1) node.remove();
    updateTotals();
  });
  $('.scan', node).addEventListener('click', () => scanBarcode(node));
  $('.lookup', node).addEventListener('click', () => lookupProduct(node));
  $('[name="photoFile"]', node).addEventListener('change', async (event) => {
    const uploaded = await uploadFiles('products', event.target.files);
    if (uploaded[0]) {
      $('[name="productImagePath"]', node).value = uploaded[0].path;
      $('[name="exportImagePath"]', node).value = uploaded[0].path;
      renderPreview(node);
      if (confirm('是否保存这张照片和基础资料到商品库？')) {
        await saveItemToProduct(node);
      }
    }
  });
  $$('input, textarea', node).forEach((input) => input.addEventListener('input', () => autoCalc(node)));
  $('#orderItems').appendChild(node);
  autoCalc(node);
}

let scannerControls = null;

async function scanBarcode(node) {
  if (!window.ZXingBrowser) {
    alert('扫码库未加载，请手动输入条码');
    return;
  }
  $('#scannerModal').hidden = false;
  const reader = new ZXingBrowser.BrowserMultiFormatReader();
  try {
    scannerControls = await reader.decodeFromVideoDevice(null, $('#scannerVideo'), async (result) => {
      if (!result) return;
      $('[name="barcode"]', node).value = result.getText();
      stopScanner();
      await lookupProduct(node);
    });
  } catch (error) {
    stopScanner();
    alert('无法打开摄像头，请检查浏览器权限或改为手动输入条码');
  }
}

function stopScanner() {
  if (scannerControls) {
    scannerControls.stop();
    scannerControls = null;
  }
  $('#scannerModal').hidden = true;
}

function renderPreview(node) {
  const path = $('[name="productImagePath"]', node).value;
  $('.photo-preview', node).innerHTML = imageHtml(path);
}

async function lookupProduct(node) {
  const barcode = $('[name="barcode"]', node).value.trim();
  if (!barcode) return alert('请先填写或扫码得到条码');
  try {
    const product = await request(`/products/barcode/${encodeURIComponent(barcode)}`);
    $('[name="productId"]', node).value = product.id;
    $('[name="factoryItemNo"]', node).value = product.factoryItemNo || '';
    $('[name="productImagePath"]', node).value = product.productImagePath || '';
    $('[name="exportImagePath"]', node).value = product.exportImagePath || product.productImagePath || '';
    $('[name="productDescription"]', node).value = product.description || '';
    $('[name="innerPack"]', node).value = product.innerPack || '';
    $('[name="cartonQty"]', node).value = product.cartonQty || 0;
    $('[name="cbmPerCarton"]', node).value = product.cbmPerCarton || 0;
    $('[name="unitPieces"]', node).value = product.unitPieces || 0;
    renderPreview(node);
    autoCalc(node);
    $('[name="cartons"]', node).focus();
  } catch (error) {
    if (confirm('商品库没有这个条码。现场填写后是否保存到商品库？')) {
      await saveItemToProduct(node);
    }
  }
}

async function saveItemToProduct(node) {
  const payload = itemFromNode(node);
  await request('/products', {
    method: 'POST',
    body: {
      barcode: payload.barcode,
      factoryItemNo: payload.factoryItemNo,
      productImagePath: payload.productImagePath,
      exportImagePath: payload.exportImagePath,
      description: payload.productDescription,
      innerPack: payload.innerPack,
      cartonQty: payload.cartonQty,
      cbmPerCarton: payload.cbmPerCarton,
      unitPieces: payload.unitPieces
    }
  }).catch(() => {});
  await loadProducts();
}

function autoCalc(node) {
  const cartonQty = Number($('[name="cartonQty"]', node).value || 0);
  const cartons = Number($('[name="cartons"]', node).value || 0);
  const unitPrice = Number($('[name="unitPrice"]', node).value || 0);
  const cbmPerCarton = Number($('[name="cbmPerCarton"]', node).value || 0);
  $('[name="totalPieces"]', node).value = Math.round(cartonQty * cartons);
  $('[name="totalCbm"]', node).value = number(cbmPerCarton * cartons);
  $('[name="totalAmount"]', node).value = money(unitPrice * cartons);
  updateTotals();
}

function itemFromNode(node) {
  const data = {};
  $$('input, textarea', node).forEach((input) => {
    if (input.name && input.type !== 'file') data[input.name] = input.value;
  });
  return data;
}

function collectOrderItems() {
  return $$('#orderItems .item-card').map(itemFromNode);
}

function updateTotals() {
  const items = collectOrderItems();
  $('#totalCbm').textContent = number(items.reduce((sum, item) => sum + Number(item.totalCbm || 0), 0));
  $('#totalPieces').textContent = Math.round(items.reduce((sum, item) => sum + Number(item.totalPieces || 0), 0));
  $('#orderTotal').textContent = money(items.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0));
}

async function saveOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const front = await uploadFiles('marks', $('#frontMarkUpload').files);
  const side = await uploadFiles('marks', $('#sideMarkUpload').files);
  const barcode = await uploadFiles('barcodes', $('#barcodeUpload').files);
  if (front[0]) form.elements.frontMarkImagePath.value = front[0].path;
  if (side[0]) form.elements.sideMarkImagePath.value = side[0].path;
  if (barcode[0]) form.elements.barcodeFilePath.value = barcode[0].path;
  const payload = { ...formData(form), items: collectOrderItems() };
  const id = payload.id;
  delete payload.id;
  const saved = await request(id ? `/orders/${id}` : '/orders', { method: id ? 'PUT' : 'POST', body: payload });
  form.elements.id.value = saved.id || id;
  await refreshAll();
  alert('订单已保存');
}

async function loadOrders() {
  state.orders = await request('/orders');
  $('#orderList').innerHTML = state.orders.map((order) => `
    <article class="card">
      <div class="card-title">${order.orderNo || order.id} · ${order.customerName || '未填写客户'}</div>
      <div class="meta">电话：${order.customerPhone || ''}<br>联系人：${order.contactName || ''}<br>送货：${order.deliveryTime || ''}</div>
      <div class="actions">
        <button class="ghost edit-order" data-id="${order.id}">编辑</button>
        <a class="ghost link-btn" href="/api/orders/${order.id}/export/excel">Excel</a>
        <a class="ghost link-btn" href="/api/orders/${order.id}/export/pdf">PDF</a>
        <button class="danger delete-order" data-id="${order.id}">删除</button>
      </div>
    </article>
  `).join('') || '<p class="meta">暂无订单</p>';
  $$('.edit-order').forEach((button) => button.addEventListener('click', () => editOrder(button.dataset.id)));
  $$('.delete-order').forEach((button) => button.addEventListener('click', () => deleteOrder(button.dataset.id)));
}

async function editOrder(id) {
  const order = await request(`/orders/${id}`);
  const form = $('#orderForm');
  Object.entries(order).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value || '';
  });
  $('#orderItems').innerHTML = '';
  (order.items.length ? order.items : [{}]).forEach(addOrderItem);
  setTab('orders');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteOrder(id) {
  if (!confirm('确认删除？删除会保留历史记录。')) return;
  await request(`/orders/${id}`, { method: 'DELETE' });
  await refreshAll();
}

async function exportCurrent(kind) {
  const id = $('#orderForm').elements.id.value;
  if (!id) return alert('请先保存订单');
  location.href = `/api/orders/${id}/export/${kind}`;
}

async function loadInventory() {
  state.inventory = await request('/dashboard/inventory');
  renderInventory();
}

function renderInventory() {
  const keyword = $('#inventorySearch').value.trim().toLowerCase();
  const rows = state.inventory.filter((item) => `${item.name || ''}${item.barcode || ''}`.toLowerCase().includes(keyword));
  $('#inventoryList').innerHTML = rows.map((item) => `
    <article class="card">
      ${imageHtml(item.productImagePath)}
      <div class="card-title">${item.name || item.factoryItemNo}</div>
      <div class="meta">条码：${item.barcode || '未填写'}<br>库存：${item.stock || 0}<br>货位：${item.location || '待补充'}</div>
    </article>
  `).join('') || '<p class="meta">暂无库存</p>';
}

async function loadDelivery() {
  const orders = await request('/orders');
  const tasks = orders.filter((order) => order.status !== 'completed');
  $('#deliveryList').innerHTML = tasks.map((task) => `
    <article class="card">
      <div class="card-title">${task.customerName || '未填写客户'}</div>
      <div class="meta">电话：${task.customerPhone || ''}<br>地址：${task.deliveryAddress || ''}<br>送货时间：${task.deliveryTime || ''}</div>
      <div class="actions">
        <button class="ghost status" data-id="${task.id}" data-status="delivering">开始送货</button>
        <button class="ghost status" data-id="${task.id}" data-status="completed">完成</button>
        <button class="danger status" data-id="${task.id}" data-status="returned">返单</button>
      </div>
    </article>
  `).join('') || '<p class="meta">暂无待送订单</p>';
  $$('.status').forEach((button) => {
    button.addEventListener('click', async () => {
      await request(`/orders/${button.dataset.id}/status`, { method: 'POST', body: { status: button.dataset.status } });
      await refreshAll();
    });
  });
}

async function refreshAll() {
  await Promise.all([loadProducts(), loadOrders(), loadInventory(), loadDelivery()]);
}

$$('.tab').forEach((tab) => tab.addEventListener('click', () => setTab(tab.dataset.tab)));
$('#productForm').addEventListener('submit', saveProduct);
$('#orderForm').addEventListener('submit', saveOrder);
$('#addItem').addEventListener('click', () => addOrderItem());
$('#batchImages').addEventListener('click', () => $('#batchImagesInput').click());
$('#batchImagesInput').addEventListener('change', async (event) => {
  const uploaded = await uploadFiles('products', event.target.files);
  uploaded.forEach((file) => addOrderItem({ productImagePath: file.path, exportImagePath: file.path }));
});
$('#exportExcel').addEventListener('click', () => exportCurrent('excel'));
$('#exportPdf').addEventListener('click', () => exportCurrent('pdf'));
$('#inventorySearch').addEventListener('input', renderInventory);
$('#refreshAll').addEventListener('click', refreshAll);
$('#stopScanner').addEventListener('click', stopScanner);
addOrderItem();
refreshAll().catch((error) => alert(`加载失败：${error.message}`));
