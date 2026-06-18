import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { buildSupplierBlockLines, renderInvoicePdf } from '../invoices/pdf.js';

describe('renderInvoicePdf', () => {
  it('places tax lines immediately after the supplier address without NEQ', () => {
    expect(
      buildSupplierBlockLines({
        supplierAddress: '123 rue Example\nMontreal QC H2X 1Y4',
        supplierEmail: 'factures@example.com',
        gstNumber: '744492612',
        qstNumber: '1230724969',
      }),
    ).toEqual([
      '123 rue Example',
      'Montreal QC H2X 1Y4',
      'TPS : 744492612',
      'TVQ : 1230724969',
      'Courriel : factures@example.com',
    ]);
  });

  it('returns a PDF buffer', async () => {
    const pdf = await renderInvoicePdf({
      invoiceNumber: 'C997672026-03-21001',
      invoiceDate: '2026-03-21',
      supplierName: '9493-1011 QUEBEC INC',
      clientName: 'Cofomo',
      clientAddress: '1000 De la Gauchetiere, Bureau 1500, Montreal, QC, H3B 4W5',
      documentReference: 'F00000349957',
      resourceName: 'Machado Da Silva, Eduardo (C99767)',
      lines: [
        {
          description: "Main d'oeuvre",
          serviceDate: '2026-03-21',
          quantity: 40.5,
          unitRateCents: 9400,
          lineTotalCents: 380700,
        },
      ],
      gstNumber: '744492612',
      qstNumber: '1230724969',
      subtotalCents: 380700,
      gstCents: 19035,
      qstCents: 37975,
      totalCents: 437710,
      paymentTerms: 'MOIS-SUIV',
    });

    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('renders database date values and text outside WinAnsi safely', async () => {
    const pdf = await renderInvoicePdf({
      invoiceNumber: 'FAC-2026-001',
      invoiceDate: new Date('2026-05-29T00:00:00.000Z') as unknown as string,
      supplierName: '9493-1011 Québec Inc 🧾',
      supplierAddress: '100 rue de lʼÉglise, Montréal',
      clientName: 'Client 😀',
      clientAddress: '1 Main Street 🏢, Montreal, QC',
      documentReference: 'REF-001',
      resourceName: 'Eduardo Machado Da Silva',
      lines: [
        {
          description: 'Services 😀',
          serviceDate: new Date('2026-05-29T00:00:00.000Z') as unknown as string,
          quantity: 1,
          unitRateCents: 9400,
          lineTotalCents: 9400,
        },
      ],
      gstNumber: '744492612',
      qstNumber: '1230724969',
      subtotalCents: 9400,
      gstCents: 470,
      qstCents: 938,
      totalCents: 10808,
      paymentTerms: 'MOIS-SUIV',
    });

    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('flows long invoices onto additional pages', async () => {
    const lines = Array.from({ length: 34 }, (_, index) => ({
      description: `Service line ${index + 1}`,
      serviceDate: '2026-06-10',
      quantity: 1,
      unitRateCents: 10000,
      lineTotalCents: 10000,
    }));

    const pdf = await renderInvoicePdf({
      invoiceNumber: '2026-034',
      invoiceDate: '2026-06-10',
      supplierName: '9493-1011 QUEBEC INC',
      clientName: 'Cofomo',
      clientAddress: '1000 De la Gauchetiere, Bureau 1500, Montreal, QC, H3B 4W5',
      documentReference: '',
      resourceName: '',
      lines,
      gstNumber: '744492612',
      qstNumber: '1230724969',
      subtotalCents: 340000,
      gstCents: 17000,
      qstCents: 33915,
      totalCents: 390915,
      paymentTerms: '30 jours',
    });

    const loaded = await PDFDocument.load(new Uint8Array(pdf));

    expect(loaded.getPageCount()).toBeGreaterThan(1);
  });
});
