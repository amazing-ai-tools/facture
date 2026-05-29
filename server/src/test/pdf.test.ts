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
});
