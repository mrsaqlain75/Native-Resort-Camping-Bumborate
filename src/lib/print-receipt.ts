export interface ReceiptItemRow {
  name: string;
  qty?: number;
  unitPrice?: number;
  amount: number;
  tag?: string;
}

export interface ReceiptMetaRow {
  label: string;
  value: string;
}

export interface ReceiptPrintData {
  documentTitle: string;
  receiptLabel: string;
  receiptNumber?: string;
  customerName: string;
  meta: ReceiptMetaRow[];
  items: ReceiptItemRow[];
  showQtyColumn: boolean;
  subtotal: number;
  discountAmount: number;
  discountLabel?: string;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
  note?: string | null;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const money = (amount: number) => `Rs. ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function buildReceiptHtml(data: ReceiptPrintData): string {
  const logoUrl = `${window.location.origin}/logo.png`;

  const metaRows = data.meta
    .map(
      (row) => `<div class="row"><span class="label">${escapeHtml(row.label)}</span><span>${escapeHtml(row.value)}</span></div>`
    )
    .join("");

  const itemRows = data.items
    .map((item, index) => {
      const qtyCell = data.showQtyColumn ? `<td class="num">${item.qty ?? 1}</td><td class="amount">${money(item.unitPrice ?? item.amount)}</td>` : "";
      return `
        <tr>
          <td class="num">${index + 1}</td>
          <td>${item.tag ? `<span class="tag">${escapeHtml(item.tag)}</span> ` : ""}${escapeHtml(item.name)}</td>
          ${qtyCell}
          <td class="amount">${money(item.amount)}</td>
        </tr>`;
    })
    .join("");

  const headerCols = data.showQtyColumn
    ? `<th class="num">#</th><th>Item</th><th class="num">Qty</th><th class="amount">Price</th><th class="amount">Total</th>`
    : `<th class="num">#</th><th>Item</th><th class="amount">Amount</th>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(data.documentTitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
    color: #23211c;
    margin: 0;
    padding: 28px 24px;
    width: 320px;
  }
  .header { text-align: center; margin-bottom: 14px; }
  .header .logo-badge {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: #3f6f52;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 8px;
  }
  .header .logo-badge img { width: 34px; height: 34px; display: block; }
  .header h1 {
    font-family: "Fraunces", Georgia, "Times New Roman", serif;
    font-size: 19px;
    font-weight: 700;
    margin: 0;
    color: #3f6f52;
  }
  .header .tagline { font-size: 10px; color: #6c6558; margin: 3px 0 0; letter-spacing: 0.3px; }
  .header .receipt-label {
    display: inline-block;
    margin-top: 10px;
    font-size: 10px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: #3f6f52;
    border: 1px solid #3f6f52;
    border-radius: 999px;
    padding: 3px 12px;
  }
  hr.divider { border: none; border-top: 1px dashed rgba(35, 33, 28, 0.3); margin: 14px 0; }
  .meta { font-size: 11.5px; margin-bottom: 4px; }
  .meta .row { display: flex; justify-content: space-between; padding: 2px 0; }
  .meta .label { color: #6c6558; }
  table.items { width: 100%; border-collapse: collapse; font-size: 11.5px; margin: 10px 0; }
  table.items thead th {
    text-align: left;
    padding: 5px 3px;
    font-size: 9.5px;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: #6c6558;
    border-bottom: 1.5px solid #23211c;
  }
  table.items td { padding: 5px 3px; vertical-align: top; border-bottom: 1px solid rgba(35, 33, 28, 0.08); }
  table.items th.num, table.items td.num { text-align: center; width: 22px; }
  table.items th.amount, table.items td.amount { text-align: right; }
  .tag { color: #3f6f52; }
  .totals { font-size: 12px; margin-top: 6px; }
  .totals .row { display: flex; justify-content: space-between; padding: 2.5px 0; }
  .totals .discount { color: #3f6f52; }
  .totals .tax { color: #a15c1f; }
  .totals .grand {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    font-size: 15px;
    border-top: 1.5px solid #23211c;
    margin-top: 8px;
    padding-top: 8px;
  }
  .note { font-size: 10.5px; color: #6c6558; margin-top: 10px; }
  .thanks {
    text-align: center;
    margin-top: 20px;
    font-family: "Fraunces", Georgia, serif;
    font-size: 13px;
    font-style: italic;
    color: #3f6f52;
  }
  .footer { text-align: center; margin-top: 4px; font-size: 9.5px; color: #6c6558; }
  @media print {
    body { width: auto; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-badge"><img src="${logoUrl}" alt="Logo" /></div>
    <h1>Native Camping and Restaurant</h1>
    <p class="tagline">Bumburate &middot; Guides &middot; Cuisines &middot; Events</p>
    <span class="receipt-label">${escapeHtml(data.receiptLabel)}</span>
  </div>

  <hr class="divider" />

  <div class="meta">
    ${data.receiptNumber ? `<div class="row"><span class="label">Receipt #</span><span>${escapeHtml(data.receiptNumber)}</span></div>` : ""}
    <div class="row"><span class="label">Customer</span><span>${escapeHtml(data.customerName)}</span></div>
    ${metaRows}
  </div>

  <table class="items">
    <thead><tr>${headerCols}</tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${money(data.subtotal)}</span></div>
    ${data.discountAmount > 0 ? `<div class="row discount"><span>${escapeHtml(data.discountLabel || "Discount")}</span><span>- ${money(data.discountAmount)}</span></div>` : ""}
    ${data.taxPercent > 0 ? `<div class="row tax"><span>Sales Tax (${data.taxPercent}%)</span><span>+ ${money(data.taxAmount)}</span></div>` : ""}
    <div class="grand"><span>Total</span><span>${money(data.totalAmount)}</span></div>
  </div>

  ${data.note ? `<p class="note">Note: ${escapeHtml(data.note)}</p>` : ""}

  <p class="thanks">Thank you, ${escapeHtml(data.customerName)}! We hope to see you again soon.</p>
  <p class="footer">Native Camping and Restaurant &middot; Bumburate</p>
</body>
</html>`;
}

export function printReceipt(data: ReceiptPrintData) {
  const printWindow = window.open("", "_blank", "width=420,height=640");
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(buildReceiptHtml(data));
  printWindow.document.close();

  const triggerPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  const logo = printWindow.document.querySelector("img");
  if (logo && !(logo as HTMLImageElement).complete) {
    logo.addEventListener("load", triggerPrint, { once: true });
    logo.addEventListener("error", triggerPrint, { once: true });
    setTimeout(triggerPrint, 1500);
  } else {
    setTimeout(triggerPrint, 150);
  }
}
