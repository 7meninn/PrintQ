import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PRINTQ_QR_PNG_BASE64 } from "../assets/qr";

interface SeparatorOptions {
  orderId: number;
  studentName: string;
  paperSize?: "A3" | "A4";
}

const fitRect = (maxWidth: number, maxHeight: number, imgWidth: number, imgHeight: number) => {
  const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
  return { width: imgWidth * ratio, height: imgHeight * ratio };
};

export const createSeparatorPdf = async ({ orderId, studentName, paperSize = "A4" }: SeparatorOptions): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.create();
  const pageSize: [number, number] = paperSize === "A3" ? [842, 1191] : [595, 842];
  const page = pdfDoc.addPage(pageSize);
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 36;
  const brandBlue = rgb(0.12, 0.33, 0.78);
  const textDark = rgb(0.1, 0.1, 0.12);
  const textMuted = rgb(0.45, 0.45, 0.5);

  const brandY = height - margin - 18;

  page.drawText("PrintQ", {
    x: margin,
    y: brandY,
    size: 26,
    font: fontBold,
    color: brandBlue
  });

  page.drawText("Separator Sheet", {
    x: margin,
    y: brandY - 20,
    size: 10,
    font: fontRegular,
    color: textMuted
  });

  const orderText = `ORDER #${orderId}`;
  const orderSize = 24;
  const orderY = brandY - 64;
  page.drawText(orderText, {
    x: margin,
    y: orderY,
    size: orderSize,
    font: fontBold,
    color: textDark
  });

  const safeName = studentName && studentName.trim().length > 0 ? studentName.trim() : "Student";
  const nameSize = safeName.length > 26 ? 16 : 20;
  page.drawText("Student", {
    x: margin,
    y: orderY - 26,
    size: 10,
    font: fontRegular,
    color: textMuted
  });
  page.drawText(safeName, {
    x: margin,
    y: orderY - 52,
    size: nameSize,
    font: fontBold,
    color: textDark
  });

  const adStartY = orderY - 110;
  page.drawText("Skip the line.", {
    x: margin,
    y: adStartY,
    size: 20,
    font: fontBold,
    color: textDark
  });
  page.drawText("Print smart.", {
    x: margin,
    y: adStartY - 26,
    size: 20,
    font: fontBold,
    color: brandBlue
  });
  page.drawText("Upload your documents from anywhere and collect at any station.", {
    x: margin,
    y: adStartY - 54,
    size: 11,
    font: fontRegular,
    color: textMuted
  });
  page.drawText("Secure, fast, and paperless until you need it.", {
    x: margin,
    y: adStartY - 72,
    size: 11,
    font: fontRegular,
    color: textMuted
  });
  page.drawText("Instant Upload - Secure Payment - 24/7 Access", {
    x: margin,
    y: adStartY - 92,
    size: 10,
    font: fontRegular,
    color: textMuted
  });

  const qrSize = 120;
  const qrX = width - margin - qrSize;
  const qrY = margin + 24;

  const qrImageBytes = PRINTQ_QR_PNG_BASE64
    ? Buffer.from(PRINTQ_QR_PNG_BASE64, "base64")
    : null;

  if (qrImageBytes) {
    const qrImage = await pdfDoc.embedPng(qrImageBytes);
    const qrFit = fitRect(qrSize, qrSize, qrImage.width, qrImage.height);
    page.drawRectangle({
      x: qrX - 6,
      y: qrY - 6,
      width: qrSize + 12,
      height: qrSize + 12,
      borderColor: rgb(0.88, 0.88, 0.9),
      borderWidth: 1
    });
    page.drawImage(qrImage, {
      x: qrX + (qrSize - qrFit.width) / 2,
      y: qrY + (qrSize - qrFit.height) / 2,
      width: qrFit.width,
      height: qrFit.height
    });
  }

  page.drawText("Scan to visit PrintQ", {
    x: margin,
    y: qrY + qrSize + 6,
    size: 12,
    font: fontBold,
    color: textDark
  });
  page.drawText("Offers, tips, and instant support.", {
    x: margin,
    y: qrY + qrSize - 12,
    size: 10,
    font: fontRegular,
    color: textMuted
  });
  page.drawText("Place this sheet on top of the print stack.", {
    x: margin,
    y: qrY - 8,
    size: 10,
    font: fontRegular,
    color: textMuted
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};
