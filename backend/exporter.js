const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const store = require('./store');
const { toAbsolutePath } = require('./upload');

const templatePath = path.resolve(__dirname, 'templates/contract-template.xlsx');
const exportRoot = path.resolve(__dirname, 'exports');
const chineseFontPath = [
  'C:/Windows/Fonts/simhei.ttf',
  'C:/Windows/Fonts/simsun.ttc',
  'C:/Windows/Fonts/msyh.ttc'
].find((fontPath) => fs.existsSync(fontPath));

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function safeName(value) {
  return String(value || 'order').replace(/[\\/:*?"<>|]/g, '-');
}

function setCell(sheet, address, value) {
  const cell = sheet.getCell(address);
  const prefix = typeof cell.value === 'string' && cell.value.includes('：') ? cell.value : '';
  cell.value = prefix ? `${prefix}${value || ''}` : value || '';
}

function fillHeader(sheet, order) {
  setCell(sheet, 'I1', order.customerName);
  setCell(sheet, 'K1', order.orderNo || order.id);
  setCell(sheet, 'B4', order.contactName);
  setCell(sheet, 'D4', order.customerPhone);
  setCell(sheet, 'H4', order.paymentMethod);
  setCell(sheet, 'K4', order.orderTime);
  setCell(sheet, 'B5', order.companyAddress);
  setCell(sheet, 'E5', order.deliveryAddress);
  setCell(sheet, 'K5', order.deliveryTime);
  if (order.notes) {
    const notesCell = sheet.getCell('A27');
    notesCell.value = `${notesCell.value || '正唛2面如图：'}\n备注：${order.notes}`;
  }
}

function fillItems(sheet, workbook, order) {
  const tableConfig = store.getSetting('orderTableConfig', null);
  if (tableConfig && Array.isArray(tableConfig.columns)) {
    fillItemsFromConfig(sheet, workbook, order, tableConfig);
    return;
  }
  const startRow = 8;
  const maxTemplateRows = 18;
  order.items.forEach((item, index) => {
    const rowNo = startRow + index;
    if (index >= maxTemplateRows) {
      sheet.insertRow(rowNo, []);
    }
    const row = sheet.getRow(rowNo);
    row.height = 68;
    row.getCell(1).value = item.customerItemNo;
    row.getCell(3).value = item.factoryItemNo;
    row.getCell(4).value = item.productDescription;
    row.getCell(5).value = item.innerPack;
    row.getCell(6).value = item.cartons;
    row.getCell(7).value = item.cartonQty;
    row.getCell(8).value = item.unitPrice;
    row.getCell(9).value = { formula: `F${rowNo}*G${rowNo}*H${rowNo}`, result: Number(item.totalAmount || 0) };
    row.getCell(10).value = item.cbmPerCarton;
    row.getCell(11).value = { formula: `J${rowNo}*F${rowNo}`, result: Number(item.totalCbm || 0) };
    addImage(workbook, sheet, item.exportImagePath || item.productImagePath, {
      tl: { col: 1.05, row: rowNo - 0.9 },
      ext: { width: 70, height: 58 }
    });
  });

  const totalRow = 26 + Math.max(0, order.items.length - maxTemplateRows);
  const firstItemRow = startRow;
  const lastItemRow = startRow + Math.max(order.items.length, 1) - 1;
  sheet.getCell(`F${totalRow}`).value = { formula: `SUM(F${firstItemRow}:F${lastItemRow})`, result: order.items.reduce((sum, item) => sum + Number(item.cartons || 0), 0) };
  sheet.getCell(`I${totalRow}`).value = { formula: `SUM(I${firstItemRow}:I${lastItemRow})`, result: order.items.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0) };
  sheet.getCell(`K${totalRow}`).value = { formula: `SUM(K${firstItemRow}:K${lastItemRow})`, result: order.items.reduce((sum, item) => sum + Number(item.totalCbm || 0), 0) };

  addImage(workbook, sheet, order.frontMarkImagePath, {
    tl: { col: 0.2, row: totalRow + 1.1 },
    ext: { width: 140, height: 110 }
  });
  addImage(workbook, sheet, order.sideMarkImagePath, {
    tl: { col: 3.2, row: totalRow + 1.1 },
    ext: { width: 180, height: 110 }
  });
  addImage(workbook, sheet, order.barcodeFilePath, {
    tl: { col: 8.2, row: totalRow + 1.1 },
    ext: { width: 130, height: 80 }
  });
}

function fillItemsFromConfig(sheet, workbook, order, tableConfig) {
  const startRow = 8;
  const headerRow = 6;
  const subHeaderRow = 7;
  const columns = tableConfig.columns.filter((column) => !['actions', 'status'].includes(column.type));
  for (let rowNo = startRow; rowNo <= 30; rowNo += 1) {
    for (let columnNo = 1; columnNo <= 20; columnNo += 1) {
      sheet.getRow(rowNo).getCell(columnNo).value = null;
    }
  }
  columns.forEach((column, index) => {
    const cellNo = index + 1;
    sheet.getColumn(cellNo).width = Math.max(8, Number(column.width || 100) / 9);
    sheet.getRow(headerRow).getCell(cellNo).value = column.label || column.key;
    sheet.getRow(subHeaderRow).getCell(cellNo).value = column.subLabel || '';
  });

  order.items.forEach((item, rowIndex) => {
    const rowNo = startRow + rowIndex;
    const row = sheet.getRow(rowNo);
    row.height = Number(tableConfig.rowHeight || 64);
    columns.forEach((column, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      if (column.type === 'image') {
        addImage(workbook, sheet, item.exportImagePath || item.productImagePath, {
          tl: { col: columnIndex + 0.05, row: rowNo - 0.9 },
          ext: { width: Math.min(Number(column.width || 100) - 12, 90), height: Math.max(Number(tableConfig.rowHeight || 64) - 12, 42) }
        });
        return;
      }
      if (column.type === 'formula' && column.formula) {
        cell.value = {
          formula: formulaToExcel(column.formula, columns, rowNo),
          result: Number(item[column.key] || 0)
        };
        return;
      }
      cell.value = item[column.key] ?? '';
    });
  });

  const totalRow = startRow + Math.max(order.items.length, 1);
  sheet.getRow(totalRow).getCell(1).value = '合计';
  const firstItemRow = startRow;
  const lastItemRow = startRow + Math.max(order.items.length, 1) - 1;
  columns.forEach((column, index) => {
    if (column.total === 'sum') {
      const letter = sheet.getColumn(index + 1).letter;
      sheet.getRow(totalRow).getCell(index + 1).value = {
        formula: `SUM(${letter}${firstItemRow}:${letter}${lastItemRow})`,
        result: order.items.reduce((sum, item) => sum + Number(item[column.key] || 0), 0)
      };
    }
    if (column.totalKey) {
      sheet.getRow(totalRow).getCell(index + 1).value = order.items.reduce((sum, item) => sum + Number(item[column.totalKey] || 0), 0);
    }
  });
}

function formulaToExcel(formula, columns, rowNo) {
  return formula.replace(/[A-Za-z_]\w*/g, (key) => {
    const index = columns.findIndex((column) => column.key === key);
    if (index === -1) return '0';
    return `${columnNumberToName(index + 1)}${rowNo}`;
  });
}

function columnNumberToName(number) {
  let name = '';
  while (number > 0) {
    const remainder = (number - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    number = Math.floor((number - 1) / 26);
  }
  return name;
}

function addImage(workbook, sheet, publicPath, range) {
  const absolutePath = toAbsolutePath(publicPath);
  if (!absolutePath || !fs.existsSync(absolutePath)) return;
  const ext = path.extname(absolutePath).slice(1).toLowerCase();
  if (!['png', 'jpg', 'jpeg'].includes(ext)) return;
  const imageId = workbook.addImage({ filename: absolutePath, extension: ext === 'jpg' ? 'jpeg' : ext });
  sheet.addImage(imageId, range);
}

async function exportExcel(orderId) {
  ensureDir(exportRoot);
  const order = store.getOrder(orderId);
  if (!order) return null;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const sheet = workbook.worksheets[0];
  fillHeader(sheet, order);
  fillItems(sheet, workbook, order);
  sheet.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  const outputPath = path.join(exportRoot, `${safeName(order.orderNo || order.id)}.xlsx`);
  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
}

async function exportPdf(orderId) {
  ensureDir(exportRoot);
  const order = store.getOrder(orderId);
  if (!order) return null;

  const outputPath = path.join(exportRoot, `${safeName(order.orderNo || order.id)}.pdf`);
  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 24 });
    const stream = fs.createWriteStream(outputPath);
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.pipe(stream);
    if (chineseFontPath) {
      doc.registerFont('cn', chineseFontPath);
      doc.font('cn');
    }

    doc.fontSize(16).text('义乌市展邦圣诞工艺品合同', { align: 'center' });
    doc.fontSize(8).text('Yiwu Zhanbang Christmas Ornaments Sales Confirmation', { align: 'center' });
    doc.moveDown(0.6);
    doc.fontSize(9);
    doc.text(`客户名称：${order.customerName || ''}    单号：${order.orderNo || order.id}`);
    doc.text(`联系人：${order.contactName || ''}    电话：${order.customerPhone || ''}    付款方式：${order.paymentMethod || ''}`);
    doc.text(`公司地址：${order.companyAddress || ''}`);
    doc.text(`送货地址：${order.deliveryAddress || ''}`);
    doc.text(`下单时间：${order.orderTime || ''}    送货时间：${order.deliveryTime || ''}`);
    if (order.notes) doc.text(`备注：${order.notes}`);
    doc.moveDown(0.6);

    const columns = [24, 75, 130, 195, 285, 325, 365, 405, 455, 515];
    const headers = ['客货号', '图片', '厂家货号', '描述', '内装', '件数', '装箱数', '单价', '金额', '体积'];
    headers.forEach((header, i) => doc.text(header, columns[i], doc.y, { width: i === 3 ? 85 : 45 }));
    doc.moveDown(0.8);

    order.items.forEach((item) => {
      const y = doc.y;
      doc.fontSize(7);
      doc.text(item.customerItemNo || '', columns[0], y, { width: 48 });
      drawPdfImage(doc, item.exportImagePath || item.productImagePath, columns[1], y, 48, 42);
      doc.text(item.factoryItemNo || '', columns[2], y, { width: 60 });
      doc.text(item.productDescription || '', columns[3], y, { width: 86 });
      doc.text(item.innerPack || '', columns[4], y, { width: 36 });
      doc.text(String(item.cartons || 0), columns[5], y, { width: 34 });
      doc.text(String(item.cartonQty || 0), columns[6], y, { width: 34 });
      doc.text(String(item.unitPrice || 0), columns[7], y, { width: 45 });
      doc.text(String(item.totalAmount || 0), columns[8], y, { width: 55 });
      doc.text(String(item.totalCbm || 0), columns[9], y, { width: 45 });
      doc.y = y + 48;
      if (doc.y > 690) doc.addPage();
    });

    doc.moveDown(0.5);
    doc.fontSize(9).text(
      `合计 件数：${order.items.reduce((s, i) => s + Number(i.cartons || 0), 0)}    总金额：${order.items.reduce((s, i) => s + Number(i.totalAmount || 0), 0).toFixed(2)}    总体积：${order.items.reduce((s, i) => s + Number(i.totalCbm || 0), 0).toFixed(3)}`
    );
    doc.moveDown(0.7);
    doc.text('正唛：');
    drawPdfImage(doc, order.frontMarkImagePath, 24, doc.y + 4, 120, 90);
    doc.text('侧唛：', 180, doc.y);
    drawPdfImage(doc, order.sideMarkImagePath, 180, doc.y + 4, 150, 90);
    doc.text('条码：', 370, doc.y);
    drawPdfImage(doc, order.barcodeFilePath, 370, doc.y + 4, 120, 70);
    doc.end();
  });
  return outputPath;
}

function drawPdfImage(doc, publicPath, x, y, width, height) {
  const absolutePath = toAbsolutePath(publicPath);
  if (!absolutePath || !fs.existsSync(absolutePath)) return;
  try {
    doc.image(absolutePath, x, y, { fit: [width, height], align: 'center', valign: 'center' });
  } catch (error) {
    // Ignore unsupported image formats in PDF export; originals remain downloadable.
  }
}

module.exports = {
  exportExcel,
  exportPdf
};
