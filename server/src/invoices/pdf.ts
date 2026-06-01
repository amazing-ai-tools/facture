import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { invoicePdfLabels, normalizeInvoiceLanguage, type InvoiceLanguage } from './localization.js';

export interface InvoicePdfLine {
  description: string;
  serviceDate: string | Date;
  quantity: number;
  unitRateCents: number;
  lineTotalCents: number;
}

export interface InvoicePdfInput {
  invoiceNumber: string;
  language?: InvoiceLanguage;
  invoiceDate: string | Date;
  supplierName: string;
  supplierAddress?: string;
  clientName: string;
  clientAddress: string;
  documentReference: string;
  resourceName: string;
  lines: InvoicePdfLine[];
  gstNumber: string;
  qstNumber: string;
  subtotalCents: number;
  gstCents: number;
  qstCents: number;
  totalCents: number;
  paymentTerms: string;
}

function money(cents: number) {
  return `$${(cents / 100).toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function dateLabel(value: string | Date) {
  const date =
    value instanceof Date
      ? value
      : /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T00:00:00.000Z`)
        : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(date);
}

export async function renderInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const labels = invoicePdfLabels(normalizeInvoiceLanguage(input.language));
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const dark = rgb(0.1, 0.12, 0.16);
  const muted = rgb(0.35, 0.38, 0.42);
  const line = rgb(0.78, 0.8, 0.84);

  const safeText = (value: unknown) => {
    const normalized = String(value ?? '')
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .trim();

    const encoded = Array.from(normalized)
      .filter((character) => {
        try {
          regular.encodeText(character);
          return true;
        } catch {
          return false;
        }
      })
      .join('')
      .trim();

    return encoded || '-';
  };

  const draw = (text: string, x: number, y: number, size = 10, font = regular, color = dark) => {
    page.drawText(safeText(text), { x, y, size, font, color });
  };

  const drawRight = (text: string, rightX: number, y: number, size = 10, font = regular) => {
    const encodedText = safeText(text);
    page.drawText(encodedText, { x: rightX - font.widthOfTextAtSize(encodedText, size), y, size, font, color: dark });
  };

  draw(input.supplierName, 54, 728, 16, bold);
  draw(input.supplierAddress ?? 'Montreal, Quebec', 54, 707, 10, regular, muted);
  draw(`GST/TPS: ${input.gstNumber}`, 54, 690, 9, regular, muted);
  draw(`QST/TVQ: ${input.qstNumber}`, 54, 675, 9, regular, muted);

  draw(labels.documentTitle, 466, 728, 22, bold);
  drawRight(input.invoiceNumber, 558, 704, 10, regular);
  drawRight(`${labels.date}: ${dateLabel(input.invoiceDate)}`, 558, 686, 10, regular);
  drawRight(`${labels.terms}: ${input.paymentTerms}`, 558, 668, 10, regular);

  page.drawLine({ start: { x: 54, y: 640 }, end: { x: 558, y: 640 }, thickness: 1, color: line });

  draw(labels.billTo, 54, 610, 10, bold);
  draw(input.clientName, 54, 590, 11, bold);
  const addressParts = input.clientAddress.match(/.{1,58}(\s|$)/g) ?? [input.clientAddress];
  addressParts.slice(0, 3).forEach((part, index) => draw(part.trim(), 54, 573 - index * 14, 9, regular, muted));

  draw(labels.details, 350, 610, 10, bold);
  draw(`${labels.documentReference}: ${input.documentReference}`, 350, 590, 9, regular, muted);
  draw(`${labels.resource}: ${input.resourceName}`, 350, 574, 9, regular, muted);

  const tableTop = 500;
  page.drawRectangle({ x: 54, y: tableTop, width: 504, height: 26, color: rgb(0.93, 0.95, 0.97) });
  draw(labels.description, 66, tableTop + 9, 9, bold);
  draw(labels.serviceDate, 255, tableTop + 9, 9, bold);
  drawRight(labels.quantity, 386, tableTop + 9, 9, bold);
  drawRight(labels.rate, 465, tableTop + 9, 9, bold);
  drawRight(labels.amount, 546, tableTop + 9, 9, bold);

  input.lines.forEach((invoiceLine, index) => {
    const y = tableTop - 28 - index * 24;
    draw(invoiceLine.description, 66, y, 9);
    draw(dateLabel(invoiceLine.serviceDate), 255, y, 9);
    drawRight(invoiceLine.quantity.toFixed(2), 386, y, 9);
    drawRight(money(invoiceLine.unitRateCents), 465, y, 9);
    drawRight(money(invoiceLine.lineTotalCents), 546, y, 9);
    page.drawLine({ start: { x: 54, y: y - 10 }, end: { x: 558, y: y - 10 }, thickness: 0.5, color: line });
  });

  const totalsTop = 310;
  drawRight(labels.subtotal, 440, totalsTop, 10);
  drawRight(money(input.subtotalCents), 546, totalsTop, 10);
  drawRight(`${labels.gst} / TPS`, 440, totalsTop - 22, 10);
  drawRight(money(input.gstCents), 546, totalsTop - 22, 10);
  drawRight(`${labels.qst} / TVQ`, 440, totalsTop - 44, 10);
  drawRight(money(input.qstCents), 546, totalsTop - 44, 10);
  page.drawLine({ start: { x: 350, y: totalsTop - 58 }, end: { x: 558, y: totalsTop - 58 }, thickness: 1, color: line });
  drawRight(labels.totalToPay, 440, totalsTop - 82, 12, bold);
  drawRight(money(input.totalCents), 546, totalsTop - 82, 12, bold);

  draw(labels.paymentNote, 54, 120, 9, regular, muted);
  draw(labels.thanks, 54, 104, 9, regular, muted);

  return Buffer.from(await document.save());
}
