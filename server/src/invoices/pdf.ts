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
  let page = document.addPage([612, 792]);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const dark = rgb(0, 0, 0);
  const excelBlue = rgb(0.12, 0.22, 0.39);
  const excelYellow = rgb(1, 0.95, 0.8);
  const muted = rgb(0.4, 0.4, 0.4);
  const line = rgb(0.78, 0.78, 0.78);

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

  const drawRight = (text: string, rightX: number, y: number, size = 10, font = regular, color = dark) => {
    const encodedText = safeText(text);
    page.drawText(encodedText, { x: rightX - font.widthOfTextAtSize(encodedText, size), y, size, font, color });
  };

  const drawTableHeader = (tableTop: number) => {
    page.drawRectangle({ x: 54, y: tableTop, width: 504, height: 22, color: excelBlue });
    draw('Description', 60, tableTop + 7, 10, bold, rgb(1, 1, 1));
    drawRight('Quantite', 350, tableTop + 7, 10, bold, rgb(1, 1, 1));
    drawRight('Prix unit. ($)', 456, tableTop + 7, 10, bold, rgb(1, 1, 1));
    drawRight('Montant ($)', 552, tableTop + 7, 10, bold, rgb(1, 1, 1));
  };

  const startContinuationPage = () => {
    page = document.addPage([612, 792]);
    draw('FACTURE', 54, 748, 16, bold, excelBlue);
    drawRight('Facture no :', 480, 748, 9, bold, excelBlue);
    page.drawRectangle({ x: 486, y: 742, width: 72, height: 16, color: excelYellow });
    drawRight(input.invoiceNumber, 554, 746, 9, regular);
    drawTableHeader(708);
    return 680;
  };

  draw('FACTURE', 54, 748, 20, bold, excelBlue);

  draw(input.supplierName, 54, 710, 13, bold);
  const supplierAddressParts = (input.supplierAddress ?? '').split('\n').filter(Boolean);
  supplierAddressParts.slice(0, 2).forEach((part, index) => draw(part, 54, 692 - index * 14, 10, regular));
  draw(`Courriel : ${input.supplierEmail ?? '-'}`, 54, 650, 10);
  draw(`No TPS : ${input.gstNumber}`, 54, 622, 10, bold, excelBlue);
  draw(`No TVQ : ${input.qstNumber}`, 54, 608, 10, bold, excelBlue);
  draw(`NEQ : ${input.supplierNumber ?? '-'}`, 54, 594, 10, bold, excelBlue);

  drawRight('Facture no :', 480, 710, 10, bold, excelBlue);
  page.drawRectangle({ x: 486, y: 704, width: 72, height: 16, color: excelYellow });
  drawRight(input.invoiceNumber, 554, 708, 10);
  drawRight('Date :', 480, 692, 10, bold, excelBlue);
  page.drawRectangle({ x: 486, y: 686, width: 72, height: 16, color: excelYellow });
  drawRight(dateLabel(input.invoiceDate), 554, 690, 10);
  drawRight('Echeance :', 480, 674, 10, bold, excelBlue);
  page.drawRectangle({ x: 486, y: 668, width: 72, height: 16, color: excelYellow });
  drawRight(input.paymentTerms, 554, 672, 10);

  draw('FACTURER A', 54, 552, 10, bold, excelBlue);
  draw(input.clientName, 54, 532, 11, bold);
  const addressParts = input.clientAddress.match(/.{1,58}(\s|$)/g) ?? [input.clientAddress];
  addressParts.slice(0, 3).forEach((part, index) => draw(part.trim(), 54, 515 - index * 14, 10));

  drawTableHeader(452);

  let rowY = 424;
  input.lines.forEach((invoiceLine) => {
    if (rowY < 92) {
      rowY = startContinuationPage();
    }
    draw(invoiceLine.description, 60, rowY, 10);
    drawRight(invoiceLine.quantity.toFixed(2), 350, rowY, 10);
    drawRight(money(invoiceLine.unitRateCents), 456, rowY, 10);
    drawRight(money(invoiceLine.lineTotalCents), 552, rowY, 10);
    page.drawLine({ start: { x: 54, y: rowY - 8 }, end: { x: 558, y: rowY - 8 }, thickness: 0.5, color: line });
    rowY -= 24;
  });

  if (rowY < 180) {
    rowY = startContinuationPage();
  }

  const totalsTop = Math.min(rowY - 8, 220);
  drawRight('Sous-total', 440, totalsTop, 10);
  drawRight(money(input.subtotalCents), 552, totalsTop, 10);
  drawRight('TPS (5 %)', 440, totalsTop - 20, 10);
  drawRight(money(input.gstCents), 552, totalsTop - 20, 10);
  drawRight('TVQ (9,975 %)', 440, totalsTop - 40, 10);
  drawRight(money(input.qstCents), 552, totalsTop - 40, 10);
  page.drawRectangle({ x: 350, y: totalsTop - 68, width: 208, height: 22, color: excelBlue });
  drawRight('TOTAL', 440, totalsTop - 62, 11, bold, rgb(1, 1, 1));
  drawRight(money(input.totalCents), 552, totalsTop - 62, 11, bold, rgb(1, 1, 1));

  const paymentTop = totalsTop - 110;
  draw('MODALITES DE PAIEMENT', 54, paymentTop, 10, bold, excelBlue);
  draw(`Paiement du sous ${input.paymentTerms}.`, 54, paymentTop - 18, 10);
  draw(input.supplierEmail ? `Virement Interac a ${input.supplierEmail}.` : '', 54, paymentTop - 32, 10);
  draw('Champs en jaune = a remplir. La TPS et la TVQ se calculent automatiquement.', 54, 42, 8, regular, muted);

  return Buffer.from(await document.save());
}
