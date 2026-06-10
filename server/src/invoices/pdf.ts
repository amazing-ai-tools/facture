import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface InvoicePdfLine {
  description: string;
  serviceDate: string | Date;
  quantity: number;
  unitRateCents: number;
  lineTotalCents: number;
}

export interface InvoicePdfInput {
  invoiceNumber: string;
  invoiceDate: string | Date;
  supplierName: string;
  supplierAddress?: string;
  supplierEmail?: string;
  supplierNumber?: string;
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

  draw('FACTURE', 54, 748, 22, bold);

  draw(input.supplierName, 54, 710, 13, bold);
  const supplierAddressParts = (input.supplierAddress ?? '').split('\n').filter(Boolean);
  supplierAddressParts.slice(0, 2).forEach((part, index) => draw(part, 54, 692 - index * 14, 10, regular, muted));
  draw(`Courriel : ${input.supplierEmail ?? '-'}`, 54, 658, 9, regular, muted);
  draw(`No TPS : ${input.gstNumber}`, 54, 630, 9, regular, muted);
  draw(`No TVQ : ${input.qstNumber}`, 54, 616, 9, regular, muted);
  draw(`NEQ : ${input.supplierNumber ?? '-'}`, 54, 602, 9, regular, muted);

  drawRight('Facture no :', 480, 710, 10, bold);
  drawRight(input.invoiceNumber, 558, 710, 10, regular);
  drawRight('Date :', 480, 692, 10, bold);
  drawRight(dateLabel(input.invoiceDate), 558, 692, 10, regular);
  drawRight('Echeance :', 480, 674, 10, bold);
  drawRight(input.paymentTerms, 558, 674, 10, regular);

  page.drawLine({ start: { x: 54, y: 580 }, end: { x: 558, y: 580 }, thickness: 1, color: line });

  draw('FACTURER A', 54, 552, 10, bold);
  draw(input.clientName, 54, 532, 11, bold);
  const addressParts = input.clientAddress.match(/.{1,58}(\s|$)/g) ?? [input.clientAddress];
  addressParts.slice(0, 3).forEach((part, index) => draw(part.trim(), 54, 515 - index * 14, 9, regular, muted));

  const tableTop = 452;
  page.drawRectangle({ x: 54, y: tableTop, width: 504, height: 26, color: rgb(0.93, 0.95, 0.97) });
  draw('Description', 66, tableTop + 9, 9, bold);
  drawRight('Quantite', 356, tableTop + 9, 9, bold);
  drawRight('Prix unit. ($)', 462, tableTop + 9, 9, bold);
  drawRight('Montant ($)', 546, tableTop + 9, 9, bold);

  input.lines.forEach((invoiceLine, index) => {
    const y = tableTop - 28 - index * 24;
    draw(invoiceLine.description, 66, y, 9);
    drawRight(invoiceLine.quantity.toFixed(2), 356, y, 9);
    drawRight(money(invoiceLine.unitRateCents), 462, y, 9);
    drawRight(money(invoiceLine.lineTotalCents), 546, y, 9);
    page.drawLine({ start: { x: 54, y: y - 10 }, end: { x: 558, y: y - 10 }, thickness: 0.5, color: line });
  });

  const totalsTop = 220;
  drawRight('Sous-total', 440, totalsTop, 10);
  drawRight(money(input.subtotalCents), 546, totalsTop, 10);
  drawRight('TPS (5 %)', 440, totalsTop - 22, 10);
  drawRight(money(input.gstCents), 546, totalsTop - 22, 10);
  drawRight('TVQ (9,975 %)', 440, totalsTop - 44, 10);
  drawRight(money(input.qstCents), 546, totalsTop - 44, 10);
  page.drawLine({ start: { x: 350, y: totalsTop - 58 }, end: { x: 558, y: totalsTop - 58 }, thickness: 1, color: line });
  drawRight('TOTAL', 440, totalsTop - 82, 12, bold);
  drawRight(money(input.totalCents), 546, totalsTop - 82, 12, bold);

  draw('MODALITES DE PAIEMENT', 54, 118, 10, bold);
  draw(`Paiement du sous ${input.paymentTerms}.`, 54, 100, 9, regular, muted);
  draw(input.supplierEmail ? `Virement Interac a ${input.supplierEmail}.` : '', 54, 86, 9, regular, muted);

  return Buffer.from(await document.save());
}
