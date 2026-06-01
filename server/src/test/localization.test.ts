import { describe, expect, it } from 'vitest';
import { invoiceEmailContent, invoicePdfLabels, normalizeInvoiceLanguage } from '../invoices/localization.js';

describe('invoice localization', () => {
  it('defaults to French Quebec', () => {
    expect(normalizeInvoiceLanguage(undefined)).toBe('fr-QC');
    expect(invoicePdfLabels('fr-QC').documentTitle).toBe('FACTURE');
    expect(invoiceEmailContent('fr-QC', 'FAC-2026-001').subject).toBe('Facture FAC-2026-001');
  });

  it('supports English and Brazilian Portuguese invoice language', () => {
    expect(invoicePdfLabels('en').documentTitle).toBe('INVOICE');
    expect(invoicePdfLabels('pt-BR').documentTitle).toBe('FATURA');
    expect(invoiceEmailContent('pt-BR', 'FAC-2026-001').body).toContain('fatura FAC-2026-001');
  });
});
