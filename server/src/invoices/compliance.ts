import type { InvoicePdfInput } from './pdf.js';

export function missingQuebecInvoiceFields(input: InvoicePdfInput) {
  const missing: string[] = [];
  const requireText = (value: unknown, label: string) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      missing.push(label);
    }
  };

  requireText(input.supplierName, 'supplier name');
  requireText(input.invoiceDate, 'invoice date');
  requireText(input.invoiceNumber, 'invoice number');
  requireText(input.clientName, 'client name');
  requireText(input.paymentTerms, 'payment terms');
  requireText(input.gstNumber, 'GST/TPS registration number');
  requireText(input.qstNumber, 'QST/TVQ registration number');

  if (!input.lines.some((line) => line.description.trim().length > 0)) {
    missing.push('service description');
  }

  if (input.totalCents <= 0) {
    missing.push('total payable');
  }

  return missing;
}

export function assertQuebecInvoiceReady(input: InvoicePdfInput) {
  const missing = missingQuebecInvoiceFields(input);
  if (missing.length > 0) {
    return {
      ok: false as const,
      error: `Complete required Quebec invoice fields before generating PDF: ${missing.join(', ')}.`,
      missing,
    };
  }

  return { ok: true as const, missing: [] };
}
