import { describe, expect, it } from 'vitest';
import { assertQuebecInvoiceReady } from '../invoices/compliance.js';

describe('Quebec invoice compliance guard', () => {
  it('requires high-value Quebec invoice fields before PDF or send', () => {
    const result = assertQuebecInvoiceReady({
      invoiceNumber: 'FAC-2026-001',
      invoiceDate: '2026-06-01',
      supplierName: '9493-1011 QUEBEC INC',
      clientName: 'Cofomo',
      clientAddress: '1000 De la Gauchetiere',
      documentReference: 'REF-001',
      resourceName: 'Consultant',
      lines: [
        {
          description: 'Consulting services',
          serviceDate: '2026-06-01',
          quantity: 1,
          unitRateCents: 10000,
          lineTotalCents: 10000,
        },
      ],
      gstNumber: '',
      qstNumber: '',
      subtotalCents: 10000,
      gstCents: 500,
      qstCents: 998,
      totalCents: 11498,
      paymentTerms: '',
      language: 'fr-QC',
    });

    expect(result).toEqual({
      ok: false,
      error:
        'Complete required Quebec invoice fields before generating PDF: payment terms, GST/TPS registration number, QST/TVQ registration number.',
      missing: ['payment terms', 'GST/TPS registration number', 'QST/TVQ registration number'],
    });
  });
});
