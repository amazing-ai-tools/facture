import { describe, expect, it } from 'vitest';
import { calculateInvoiceTotals } from '../invoices/totals.js';

describe('calculateInvoiceTotals', () => {
  it('matches the sample Quebec invoice totals', () => {
    const totals = calculateInvoiceTotals({
      lines: [{ quantity: 40.5, unitRateCents: 9400 }],
      gstRate: 0.05,
      qstRate: 0.09975,
    });

    expect(totals).toEqual({
      subtotalCents: 380700,
      gstCents: 19035,
      qstCents: 37975,
      totalCents: 437710,
    });
  });
});
