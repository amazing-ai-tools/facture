import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InvoicePreview } from '../components/InvoicePreview';
import { uiCopy } from '../i18n';

describe('InvoicePreview', () => {
  it('shows Quebec invoice blockers before PDF or send', () => {
    render(
      <InvoicePreview
        draft={{
          invoiceNumber: '2026-001',
          invoiceDate: '2026-06-01',
          paymentTerms: '',
          lines: [{ description: 'Services', quantity: 1, unitPrice: 100 }],
          gstRate: 5,
          qstRate: 9.975,
        }}
        copy={uiCopy.en}
        totals={{ subtotalCents: 10000, gstCents: 500, qstCents: 998, totalCents: 11498 }}
        company={{
          legalName: '9493-1011 QUEBEC INC',
          companyNumber: '',
          gstNumber: '',
          qstNumber: '',
          defaultHourlyRateCents: 9400,
          address: '',
        }}
        client={{ name: 'Cofomo', email: '', billingAddress: '1000 De la Gauchetiere' }}
        canSend={false}
        issueBlockers={['GST/TPS number', 'QST/TVQ number', 'payment terms']}
        onOpenPdf={() => undefined}
        onSend={() => undefined}
      />,
    );

    expect(screen.getByText(/Complete before PDF\/send: GST\/TPS number, QST\/TVQ number, payment terms\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open PDF' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send by email' })).toBeDisabled();
  });
});
