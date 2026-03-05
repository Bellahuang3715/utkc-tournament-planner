import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const html2canvasOptions = {
  scale: 2,
  backgroundColor: "#ffffff",
  useCORS: true,
} as const;

/** Add one captured image to the PDF. If fitWithinPage, scale to fit entirely on one page and center; otherwise scale to page width and tile vertically if needed. */
function addPageFromCanvas(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  pageWidth: number,
  pageHeight: number,
  fitWithinPage: boolean = false,
) {
  const imgData = canvas.toDataURL("image/png");

  if (fitWithinPage) {
    // Scale to fit page: use actual canvas size so the full bracket fits without clipping
    const scale = Math.min(
      pageWidth / canvas.width,
      pageHeight / canvas.height,
    );
    const imgWidth = canvas.width * scale;
    const imgHeight = canvas.height * scale;
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;
    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
    return;
  }

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight <= pageHeight) {
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;
    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
  } else {
    const x = (pageWidth - imgWidth) / 2;
    let y = 0;
    let remaining = imgHeight;
    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
    remaining -= pageHeight;
    while (remaining > 0) {
      pdf.addPage();
      y -= pageHeight;
      pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
      remaining -= pageHeight;
    }
  }
}

export type ExportFormat = "booklet" | "poster";

export async function exportElementToPdf(
  el: HTMLElement,
  filename: string,
  format: ExportFormat = "booklet",
) {
  const pageEls = el.querySelectorAll<HTMLElement>("[data-export-page]");

  // Poster: landscape (horizontal); Booklet: portrait
  const orientation = format === "poster" ? "l" : "p";
  const pdf = new jsPDF(orientation as "p" | "l", "pt", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  if (pageEls.length > 0) {
    const fitWithinPage = format === "poster";
    for (let i = 0; i < pageEls.length; i++) {
      const canvas = await html2canvas(pageEls[i], html2canvasOptions);
      if (i > 0) pdf.addPage(orientation as "p" | "l");
      addPageFromCanvas(pdf, canvas, pageWidth, pageHeight, fitWithinPage);
    }
  } else {
    const target = el.firstElementChild as HTMLElement | null;
    const toCapture = target ?? el;
    const canvas = await html2canvas(toCapture, html2canvasOptions);
    addPageFromCanvas(pdf, canvas, pageWidth, pageHeight, true);
  }

  pdf.save(filename);
}