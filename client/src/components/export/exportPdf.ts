import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function exportElementToPdf(
  el: HTMLElement,
  filename: string,
) {
  const canvas = await html2canvas(el, {
    scale: 2,            // higher = sharper
    backgroundColor: "#ffffff",
    useCORS: true,
  });

  const imgData = canvas.toDataURL("image/png");

  // A4 portrait in pt
  const pdf = new jsPDF("p", "pt", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let y = 0;
  let remaining = imgHeight;

  // draw first page
  pdf.addImage(imgData, "PNG", 0, y, imgWidth, imgHeight);
  remaining -= pageHeight;

  // add more pages if needed
  while (remaining > 0) {
    pdf.addPage();
    y -= pageHeight;
    pdf.addImage(imgData, "PNG", 0, y, imgWidth, imgHeight);
    remaining -= pageHeight;
  }

  pdf.save(filename);
}