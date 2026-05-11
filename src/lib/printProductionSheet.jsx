import { renderToStaticMarkup } from "react-dom/server";
import ProductionPrintSheet from "../components/print/ProductionPrintSheet";

const PRINT_DOCUMENT_STYLES = `
  @page {
    margin: 10mm;
    size: auto;
  }

  :root {
    color-scheme: light;
  }

  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #111111;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    font-family: "Helvetica Neue", Arial, sans-serif;
  }

  #production-print-root {
    box-sizing: border-box;
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    padding: 24px;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  .print-avoid-break {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  @media screen {
    body {
      background: #f5f5f5;
    }

    #production-print-root {
      margin: 24px auto;
      background: #ffffff;
    }
  }

  @media print {
    html, body {
      background: #ffffff !important;
    }

    #production-print-root {
      max-width: none;
      margin: 0;
      padding: 0;
    }
  }
`;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function waitForWindowLoad(printWindow) {
  return new Promise((resolve) => {
    if (printWindow.document.readyState === "complete") {
      resolve();
      return;
    }

    printWindow.addEventListener("load", () => resolve(), { once: true });
  });
}

function waitForLayout(printWindow) {
  return new Promise((resolve) => {
    printWindow.requestAnimationFrame(() => {
      printWindow.requestAnimationFrame(resolve);
    });
  });
}

export function printProductionSheet(order, options = {}) {
  if (typeof window === "undefined" || !order) return false;

  const printWindow = window.open("", "_blank", "width=960,height=720");
  if (!printWindow) return false;

  const title = options.title || `Production Sheet ${order.order_number || ""}`.trim();
  const markup = renderToStaticMarkup(<ProductionPrintSheet order={order} />);
  const printDocument = printWindow.document;

  if (!markup.trim()) {
    printWindow.close();
    return false;
  }

  printDocument.open();
  printDocument.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>${PRINT_DOCUMENT_STYLES}</style>
  </head>
  <body>
    <div id="production-print-root">${markup}</div>
  </body>
</html>`);
  printDocument.close();

  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;

    window.setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.close();
      }
    }, 0);
  };

  printWindow.addEventListener("afterprint", cleanup, { once: true });
  printWindow.addEventListener("beforeunload", cleanup, { once: true });
  window.setTimeout(cleanup, 60_000);

  const runPrint = async () => {
    await waitForWindowLoad(printWindow);

    if (printDocument.fonts?.ready) {
      await printDocument.fonts.ready.catch(() => undefined);
    }

    await waitForLayout(printWindow);

    const container = printDocument.getElementById("production-print-root");
    if (!container?.textContent?.trim()) {
      cleanup();
      return;
    }

    printWindow.focus();
    printWindow.print();
  };

  void runPrint();
  return true;
}
