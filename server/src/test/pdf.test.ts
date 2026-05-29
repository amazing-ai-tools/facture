import { describe, expect, it } from 'vitest';
import { renderInvoicePdf } from '../invoices/pdf.js';

describe('renderInvoicePdf', () => {
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
});
