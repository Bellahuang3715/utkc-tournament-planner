import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/** Higher scale = sharper bracket image in the PDF (2 = retina-style). */
const CAPTURE_SCALE = 3;

const html2canvasOptions = {
  scale: CAPTURE_SCALE,
  backgroundColor: "#ffffff",
  useCORS: true,
  logging: false,
} as const;

const PDF_MARGIN = 36;
const TITLE_TOP = PDF_MARGIN;
const TITLE_MAIN_SIZE = 16;
const TITLE_GROUP_SIZE = 12;
const TITLE_BLOCK_HEIGHT = 40;

/** Draw division and group title as PDF text. Division name is bold; both use Helvetica to match bracket player text. */
function addTitleToPdf(
  pdf: jsPDF,
  divisionName: string,
  groupTitle: string,
  pageWidth: number,
) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(TITLE_MAIN_SIZE);
  pdf.text(divisionName, PDF_MARGIN, TITLE_TOP + TITLE_MAIN_SIZE);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(TITLE_GROUP_SIZE);
  pdf.text(groupTitle, PDF_MARGIN, TITLE_TOP + TITLE_MAIN_SIZE + 8 + TITLE_GROUP_SIZE);
}

/** Content area below the title block (max space for the bracket image). */
function getBracketContentArea(pageWidth: number, pageHeight: number) {
  const contentTop = TITLE_TOP + TITLE_BLOCK_HEIGHT;
  const contentWidth = pageWidth - 2 * PDF_MARGIN;
  const contentHeight = pageHeight - contentTop - PDF_MARGIN;
  return { contentTop, contentWidth, contentHeight };
}

/** Division G teams booklet: shift right and use slightly larger content area (smaller title block). */
const DIVISION_G_LEFT_OFFSET = 56;
const DIVISION_G_TITLE_BLOCK_HEIGHT = 28;
const DIVISION_G_BOTTOM_MARGIN = 28;

/** Add a bracket image to the PDF below the title block. Scale to max size that fits in the content area; center if smaller. */
function addBracketImageToPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  pageWidth: number,
  pageHeight: number,
  divisionName?: string,
): boolean {
  const cw = canvas.width;
  const ch = canvas.height;
  if (cw < 1 || ch < 1) return false;

  const isDivisionG = divisionName === "Division G";
  const contentTop = isDivisionG
    ? TITLE_TOP + DIVISION_G_TITLE_BLOCK_HEIGHT
    : getBracketContentArea(pageWidth, pageHeight).contentTop;
  const contentWidth = pageWidth - 2 * PDF_MARGIN;
  const contentWidthG = isDivisionG ? contentWidth - DIVISION_G_LEFT_OFFSET : contentWidth;
  const contentHeight = isDivisionG
    ? pageHeight - contentTop - DIVISION_G_BOTTOM_MARGIN
    : getBracketContentArea(pageWidth, pageHeight).contentHeight;

  const widthForScale = isDivisionG ? contentWidthG : contentWidth;
  if (widthForScale < 1 || contentHeight < 1) return false;

  const scale = Math.min(widthForScale / cw, contentHeight / ch);
  if (!Number.isFinite(scale) || scale <= 0) return false;

  const imgWidth = cw * scale;
  const imgHeight = ch * scale;
  const x = isDivisionG
    ? PDF_MARGIN + DIVISION_G_LEFT_OFFSET
    : PDF_MARGIN + (contentWidth - imgWidth) / 2;
  const y = contentTop + (contentHeight - imgHeight) / 2;

  const imgData = canvas.toDataURL("image/png");
  pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
  return true;
}

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
    const firstPage = pageEls[0];
    const divisionName = firstPage.getAttribute("data-division-name");
    const bracketEl = firstPage.querySelector<HTMLElement>("[data-export-bracket]");

    if (divisionName != null && bracketEl != null) {
      // Allow first page's bracket to finish layout/paint (fixes Group 1 & 2 blank when multiple group pairs).
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );

      // Titles as PDF text (sharp), bracket captured as image and scaled to max size in content area.
      for (let i = 0; i < pageEls.length; i++) {
        const pageEl = pageEls[i];
        if (i > 0) pdf.addPage(orientation as "p" | "l");

        const divName = pageEl.getAttribute("data-division-name") ?? "";
        const groupTitle = pageEl.getAttribute("data-group-title") ?? "";
        addTitleToPdf(pdf, divName, groupTitle, pageWidth);

        const bracket = pageEl.querySelector<HTMLElement>("[data-export-bracket]");
        let bracketDrew = false;
        if (bracket) {
          const canvas = await html2canvas(bracket, html2canvasOptions);
          bracketDrew = addBracketImageToPdf(
            pdf,
            canvas,
            pageWidth,
            pageHeight,
            divName,
          );
        }
        if (!bracketDrew) {
          // Bracket-only capture failed (e.g. zero size off-screen); capture whole page so content appears.
          const fullCanvas = await html2canvas(pageEl, html2canvasOptions);
          addPageFromCanvas(pdf, fullCanvas, pageWidth, pageHeight, true);
        }
      }
    } else {
      // Fallback: capture entire page as image (no data attributes).
      const fitWithinPage = true;
      const canvases = await Promise.all(
        Array.from(pageEls).map((pageEl) =>
          html2canvas(pageEl, html2canvasOptions),
        ),
      );
      for (let i = 0; i < canvases.length; i++) {
        if (i > 0) pdf.addPage(orientation as "p" | "l");
        addPageFromCanvas(pdf, canvases[i], pageWidth, pageHeight, fitWithinPage);
      }
    }
  } else {
    const target = el.firstElementChild as HTMLElement | null;
    const toCapture = target ?? el;
    const canvas = await html2canvas(toCapture, html2canvasOptions);
    addPageFromCanvas(pdf, canvas, pageWidth, pageHeight, true);
  }

  pdf.save(filename);
}