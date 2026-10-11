const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

// Read text only: never copy executable markup from the application into a report.
export function readCostReport(root) {
  if (!root) throw new Error('Cost report is not ready');
  const text = (node) => node?.textContent?.trim() || '';
  return {
    metrics: [...root.querySelectorAll('.stat')].map((card) => ({
      label: text(card.querySelector('.stat-label')),
      value: text(card.querySelector('strong')),
      note: text(card.querySelector('small')),
    })),
    models: [...root.querySelectorAll('[data-cost-model]')].map((row) => [
      text(row.querySelector('span')), text(row.querySelector('strong')),
    ]),
    columns: [...root.querySelectorAll('thead th')].map(text),
    rows: [...root.querySelectorAll('tbody tr')].map((row) => [...row.querySelectorAll('td')].map(text)),
  };
}

export function buildCostReportHtml(data, { isEnglish = false, generatedAt = new Date() } = {}) {
  const copy = isEnglish ? {
    title: 'Cost report by Model', date: 'Generated at',
    notice: 'ILLUSTRATIVE DATA - This page uses sample figures, not actual database costs or an invoice.',
    summary: 'Overview', models: 'API cost allocation by Model', model: 'Model / Service', cost: 'Cost (USD) / Share',
    usage: 'AI resource usage log', empty: 'No data available',
    help: 'Choose Save as PDF in the print dialog. You can also use the button below.', print: 'Print / Save PDF',
    footer: 'CTRN SHIFT N / RAV-13 - Currency: USD. Usage rows are examples, not a complete monthly ledger.',
  } : {
    title: 'Báo cáo chi phí theo Model', date: 'Thời điểm xuất',
    notice: 'DỮ LIỆU MINH HỌA - Trang này sử dụng số liệu mẫu, không phải chi phí thực tế từ database hoặc hóa đơn.',
    summary: 'Tổng quan', models: 'Phân bổ chi phí API theo Mô hình', model: 'Mô hình / Dịch vụ', cost: 'Chi phí (USD) / Tỷ trọng',
    usage: 'Nhật ký sử dụng tài nguyên AI', empty: 'Chưa có dữ liệu',
    help: 'Chọn Lưu dưới dạng PDF (Save as PDF) trong hộp thoại in. Bạn cũng có thể dùng nút bên dưới.', print: 'In / Lưu PDF',
    footer: 'CTRN SHIFT N / RAV-13 - Đơn vị tiền tệ: USD. Các dòng nhật ký là ví dụ, không phải toàn bộ giao dịch trong tháng.',
  };
  const table = (columns, rows) => `<table><thead><tr>${columns.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead><tbody>${rows.length
    ? rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${Math.max(1, columns.length)}">${copy.empty}</td></tr>`}</tbody></table>`;
  return `<!doctype html><html lang="${isEnglish ? 'en' : 'vi'}"><head><meta charset="utf-8">
  <title>${escapeHtml(copy.title)} - ${generatedAt.toISOString().slice(0, 10)}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #153047; background: #fff; font: 11pt/1.5 Arial, sans-serif; }
    main { max-width: 180mm; margin: 24px auto; padding: 0 12px; }
    .toolbar { padding: 16px; background: #edf4fa; text-align: center; }
    button { border: 0; border-radius: 6px; padding: 10px 20px; background: #12334b; color: white; cursor: pointer; }
    .brand { font-size: 10pt; letter-spacing: 2px; font-weight: bold; }
    h1 { font-size: 24pt; line-height: 1.2; margin: 12px 0; }
    h2 { font-size: 14pt; margin: 24px 0 10px; break-after: avoid; }
    .date, footer { color: #526779; font-size: 9pt; }
    .notice { border: 1px solid #bc821b; padding: 12px; margin: 20px 0; font-size: 10pt; }
    .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .metric { border: 1px solid #ccd8e0; padding: 12px; break-inside: avoid; }
    .metric strong { display: block; font-size: 21pt; margin: 6px 0; }
    .metric span, .metric small { font-size: 9pt; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9pt; }
    th, td { padding: 10px 8px; border: 1px solid #ccd8e0; text-align: left; overflow-wrap: anywhere; }
    th { background: #edf4fa; } thead { display: table-header-group; } tr { break-inside: avoid; }
    footer { border-top: 1px solid #ccd8e0; padding-top: 12px; margin-top: 24px; }
    @media print { .toolbar { display: none; } main { margin: 0; padding: 0; max-width: none; } }
  </style></head><body>
  <div class="toolbar"><p>${copy.help}</p><button type="button" onclick="window.print()">${copy.print}</button></div>
  <main><div class="brand">CTRN SHIFT N / RAV-13</div><h1>${copy.title}</h1>
  <p class="date">${copy.date}: ${escapeHtml(generatedAt.toLocaleString(isEnglish ? 'en-US' : 'vi-VN'))}</p>
  <div class="notice">${copy.notice}</div><h2>${copy.summary}</h2>
  <div class="metrics">${data.metrics.map((metric) => `<div class="metric"><span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}</strong><small>${escapeHtml(metric.note)}</small></div>`).join('')}</div>
  <h2>${copy.models}</h2>${table([copy.model, copy.cost], data.models)}
  <h2>${copy.usage}</h2>${table(data.columns, data.rows)}<footer>${copy.footer}</footer></main></body></html>`;
}

export async function printCostReport(data, options) {
  const html = buildCostReportHtml(data, options);
  // Open synchronously from the click to avoid popup blockers caused by awaited work.
  const reportWindow = window.open('', '_blank');
  if (!reportWindow) throw new Error('POPUP_BLOCKED');
  try {
    reportWindow.opener = null;
    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
    await reportWindow.document.fonts.ready;
    if (reportWindow.closed) return;
    reportWindow.focus();
    reportWindow.print();
    // Keep the preview available if printing is cancelled; never claim a file was saved.
  } catch (error) {
    if (!reportWindow.closed) reportWindow.close();
    throw error;
  }
}
