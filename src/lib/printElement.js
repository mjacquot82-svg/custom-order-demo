export function printElement(element, options = {}) {
  if (typeof window === "undefined" || !element) return;

  const title = options.title || document.title || "Print";
  const printFrame = document.createElement("iframe");
  printFrame.setAttribute("aria-hidden", "true");
  printFrame.style.position = "fixed";
  printFrame.style.right = "0";
  printFrame.style.bottom = "0";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.style.border = "0";
  printFrame.style.visibility = "hidden";

  document.body.appendChild(printFrame);

  const frameWindow = printFrame.contentWindow;
  const frameDocument = frameWindow?.document;

  if (!frameWindow || !frameDocument) {
    printFrame.remove();
    return;
  }

  const cleanup = () => {
    window.setTimeout(() => {
      printFrame.remove();
    }, 0);
  };

  const copyHeadStyles = () => {
    Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).forEach((node) => {
      frameDocument.head.appendChild(node.cloneNode(true));
    });
  };

  const waitForStyles = () => Promise.allSettled(
    Array.from(frameDocument.querySelectorAll('link[rel="stylesheet"]')).map((link) => new Promise((resolve) => {
      if (link.sheet) {
        resolve();
        return;
      }

      link.addEventListener("load", resolve, { once: true });
      link.addEventListener("error", resolve, { once: true });
    }))
  );

  const waitForImages = () => Promise.allSettled(
    Array.from(frameDocument.images).map((image) => {
      if (image.complete) {
        return Promise.resolve();
      }

      if (typeof image.decode === "function") {
        return image.decode().catch(() => undefined);
      }

      return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    })
  );

  const waitForLayout = () => new Promise((resolve) => {
    frameWindow.requestAnimationFrame(() => {
      frameWindow.requestAnimationFrame(resolve);
    });
  });

  frameDocument.open();
  frameDocument.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    <base href="${window.location.origin}/">
  </head>
  <body></body>
</html>`);
  frameDocument.close();

  copyHeadStyles();

  const printStyles = frameDocument.createElement("style");
  printStyles.textContent = `
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
  `;
  frameDocument.head.appendChild(printStyles);

  const printRoot = frameDocument.createElement("div");
  printRoot.className = "print-root";
  printRoot.appendChild(element.cloneNode(true));
  frameDocument.body.appendChild(printRoot);

  let printed = false;
  const runPrint = async () => {
    if (printed) return;
    printed = true;

    await waitForStyles();
    await waitForImages();

    if (frameDocument.fonts?.ready) {
      await frameDocument.fonts.ready.catch(() => undefined);
    }

    await waitForLayout();

    frameWindow.focus();
    frameWindow.print();
  };

  frameWindow.addEventListener("afterprint", cleanup, { once: true });
  window.setTimeout(cleanup, 60_000);
  void runPrint();
}
