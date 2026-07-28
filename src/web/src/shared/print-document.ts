const printDocumentStyle = `
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #111827; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; }
  table { width: 100%; border-collapse: collapse; table-layout: auto; }
  thead { display: table-header-group; }
  tfoot { display: table-row-group; }
  tr { break-inside: avoid; }
  th, td { border: 1px solid #4b5563; padding: 5px 6px; vertical-align: top; }
  th { background: #f3f4f6; font-weight: 700; text-align: left; }
  td.number, th.number { text-align: right; font-variant-numeric: tabular-nums; }
  td.center, th.center { text-align: center; }
  tfoot td { background: #f9fafb; font-weight: 700; }
  .details { margin-bottom: 8px; }
  .details th { width: 12%; white-space: nowrap; }
  .details td { width: 21%; }
  .summary { margin-top: 8px; margin-left: auto; width: auto; min-width: 420px; }
  .summary th { white-space: nowrap; }
  .empty { padding: 24px; text-align: center; }
`;

export function openPrintDocument(body: string): boolean {
  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) return false;

  printWindow.opener = null;
  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title></title>
    <style>${printDocumentStyle}</style>
  </head>
  <body>${body}</body>
</html>`);
  printWindow.document.close();
  let printStarted = false;
  const startPrint = () => {
    if (printStarted) return;
    printStarted = true;
    printWindow.focus();
    printWindow.print();
  };
  printWindow.addEventListener("load", startPrint, { once: true });
  printWindow.addEventListener("afterprint", () => printWindow.close(), { once: true });
  if (printWindow.document.readyState === "complete") window.setTimeout(startPrint, 0);
  return true;
}

export function escapePrintText(value: number | string): string {
  return String(value).replace(
    /[&<>"']/gu,
    (character) =>
      ({
        '"': "&quot;",
        "&": "&amp;",
        "'": "&#039;",
        "<": "&lt;",
        ">": "&gt;"
      })[character] ?? character
  );
}

export function formatPrintMoney(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value);
}
