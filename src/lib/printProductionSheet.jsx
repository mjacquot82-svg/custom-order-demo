import { createRoot } from "react-dom/client";
import ProductionPrintSheet from "../components/print/ProductionPrintSheet";

const PRINT_DOCUMENT_STYLES = `
  @page {
    margin: 10mm;
    size: auto;
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
    padding: 18px;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  .print-avoid-break {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  @media print {
    html, body {
      background: #ffffff !important;
    }

    #production-print-root {
      padding: 0;
    }
  }
`;

function waitForRender(printWindow, container) {
  return new Promise((resolve) => {
    let attempts = 0;

    const checkReady = () => {
      attempts += 1;

      if (container.textContent?.trim() || attempts >= 10) {
        resolve();
        return;
      }

      printWindow.requestAnimationFrame(checkReady);
    };

    printWindow.requestAnimationFrame(checkReady);
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

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
  if (!printWindow) return false;

  const title = options.title || `Production Sheet ${order.order_number || ""}`.trim();
  const printDocument = printWindow.document;

  printDocument.open();
  printDocument.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>${PRINT_DOCUMENT_STYLES}</style>
  </head>
  <body>
    <div id="production-print-root"></div>
  </body>
</html>`);
  printDocument.close();

  const container = printDocument.getElementById("production-print-root");
  if (!container) {
    printWindow.close();
    return false;
  }

  const root = createRoot(container);
  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    root.unmount();
    window.setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.close();
      }
    }, 0);
  };

  printWindow.addEventListener("afterprint", cleanup, { once: true });
  printWindow.addEventListener("beforeunload", cleanup, { once: true });
  window.setTimeout(cleanup, 60_000);

  root.render(<ProductionPrintSheet order={order} />);

  const runPrint = async () => {
    await waitForRender(printWindow, container);

    if (printDocument.fonts?.ready) {
      await printDocument.fonts.ready.catch(() => undefined);
    }

    await waitForLayout(printWindow);

    if (!container.textContent?.trim()) {
      cleanup();
      return;
    }

    printWindow.focus();
    printWindow.print();
  };

  void runPrint();
  return true;
}
