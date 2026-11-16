import { toPng } from "html-to-image";

/**
 * Escapes a cell value for CSV format.
 */
function escapeCSVValue(val) {
  if (val === null || val === undefined) return '""';
  const stringVal = String(val).replace(/"/g, '""');
  return `"${stringVal}"`;
}

/**
 * Exports data to a CSV file and triggers a browser download.
 * @param {Array<Object>} transactions - List of transactions
 * @param {string} filename - Desired filename
 */
export function exportTransactionsToCSV(transactions, filename = "transactions.csv") {
  if (!transactions || transactions.length === 0) {
    throw new Error("No transactions to export");
  }

  const headers = [
    "Date",
    "Description",
    "Category",
    "Type",
    "Amount (INR)",
    "Status",
    "Recurring",
    "Recurring Interval",
    "Next Recurring Date",
  ];

  const rows = transactions.map((t) => [
    t.date ? new Date(t.date).toISOString().split("T")[0] : "",
    t.description || "",
    t.category || "",
    t.type || "",
    typeof t.amount === "number" ? t.amount.toFixed(2) : t.amount,
    t.status || "COMPLETED",
    t.isRecurring ? "Yes" : "No",
    t.recurringInterval || "N/A",
    t.nextRecurringDate ? new Date(t.nextRecurringDate).toISOString().split("T")[0] : "N/A",
  ]);

  const csvContent =
    "\uFEFF" + // UTF-8 BOM for Excel compatibility
    [headers.map(escapeCSVValue).join(","), ...rows.map((row) => row.map(escapeCSVValue).join(","))].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Captures an HTML element and triggers a PNG download.
 * @param {HTMLElement} element - DOM element to capture
 * @param {string} filename - Desired image filename
 */
export async function exportElementAsPNG(element, filename = "chart.png") {
  if (!element) {
    throw new Error("Element not found for download");
  }

  // Slight wait to ensure render settles
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2, // High resolution (retina)
    backgroundColor: "#ffffff",
    style: {
      borderRadius: "0.5rem",
    },
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Opens a print-friendly summary view of transactions for saving as PDF.
 */
export function printTransactionsPDF(transactions, accountName = "Account") {
  if (!transactions || transactions.length === 0) {
    throw new Error("No transactions to print");
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Popup blocked. Please allow popups to print/export PDF.");
  }

  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const rowsHtml = transactions
    .map(
      (t) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${new Date(t.date).toLocaleDateString()}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${t.description || "-"}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${t.category}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: 500; color: ${
          t.type === "EXPENSE" ? "#dc2626" : "#16a34a"
        };">${t.type}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold; color: ${
          t.type === "EXPENSE" ? "#dc2626" : "#16a34a"
        };">${t.type === "EXPENSE" ? "-" : "+"}₹${Number(t.amount).toFixed(2)}</td>
      </tr>
    `
    )
    .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${accountName} - Transactions Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; }
          h1 { margin-bottom: 4px; }
          .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
          .summary { display: flex; gap: 20px; margin-bottom: 24px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; min-width: 140px; }
          .card-title { font-size: 12px; color: #64748b; margin-bottom: 4px; }
          .card-value { font-size: 18px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th { text-align: left; padding: 8px; border-bottom: 2px solid #cbd5e1; background: #f1f5f9; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1>FinanceScan - Transaction Report</h1>
        <div class="meta">${accountName} • Generated on ${new Date().toLocaleString()} • ${transactions.length} Transactions</div>
        
        <div class="summary">
          <div class="card">
            <div class="card-title">TOTAL INCOME</div>
            <div class="card-value" style="color: #16a34a;">+₹${totalIncome.toFixed(2)}</div>
          </div>
          <div class="card">
            <div class="card-title">TOTAL EXPENSE</div>
            <div class="card-value" style="color: #dc2626;">-₹${totalExpense.toFixed(2)}</div>
          </div>
          <div class="card">
            <div class="card-title">NET CASH FLOW</div>
            <div class="card-value" style="color: ${totalIncome - totalExpense >= 0 ? "#16a34a" : "#dc2626"};">
              ${totalIncome - totalExpense >= 0 ? "+" : ""}₹${(totalIncome - totalExpense).toFixed(2)}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Type</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

