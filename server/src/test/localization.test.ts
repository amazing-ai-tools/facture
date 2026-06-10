import { describe, expect, it } from 'vitest';
import { invoiceEmailContent, invoicePdfLabels } from '../invoices/localization.js';

describe('invoice localization', () => {
  it('keeps issued invoice documents on the French Quebec template', () => {
    expect(invoicePdfLabels().documentTitle).toBe('FACTURE');
    expect(invoicePdfLabels().totalToPay).toBe('Total a payer');
    expect(invoiceEmailContent('FAC-2026-001').subject).toBe('Facture FAC-2026-001');
  });

  it('does not translate invoice email content from the site interface language', () => {
    expect(invoiceEmailContent('FAC-2026-001').body).toContain('facture FAC-2026-001');
  });
});
