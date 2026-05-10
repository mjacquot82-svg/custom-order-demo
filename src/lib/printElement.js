export function printElement(element, options = {}) {
  if (typeof window === "undefined" || !element) return;

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=980,height=760");
  if (!printWindow) return;

  const title = options.title || document.title || "Print";
  const stylesheetLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((link) => link.href)
    .filter(Boolean)
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join("");

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    <base href="${window.location.origin}/">
    ${stylesheetLinks}
    <style>
      @page { margin: 10mm; }
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #171717;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body {
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .print-root {
        padding: 0;
      }
    </style>
  </head>
  <body>
    <div class="print-root">${element.outerHTML}</div>
  </body>
</html>`);
  printWindow.document.close();

  const runPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  printWindow.addEventListener("afterprint", () => {
    printWindow.close();
  });

  if (printWindow.document.readyState === "complete") {
    window.setTimeout(runPrint, 50);
    return;
  }

  printWindow.addEventListener("load", () => {
    window.setTimeout(runPrint, 50);
  }, { once: true });
}
