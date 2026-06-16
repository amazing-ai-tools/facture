import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InvoicePreview } from '../components/InvoicePreview';
import { uiCopy } from '../i18n';

describe('InvoicePreview', () => {
  it('places supplier tax and NEQ lines right after the address', () => {
    render(
      <InvoicePreview
        draft={{
          invoiceNumber: '2026-001',
          invoiceDate: '2026-06-01',
          paymentTerms: '30 jours',
          lines: [{ description: 'Services', quantity: 1, unitPrice: 100 }],
          gstRate: 5,
          qstRate: 9.975,
        }}
        copy={uiCopy['fr-QC']}
        totals={{ subtotalCents: 10000, gstCents: 500, qstCents: 998, totalCents: 11498 }}
        company={{
          legalName: '9493-1011 QUEBEC INC',
          companyNumber: '949301',
          gstNumber: '744492612',
          qstNumber: '1230724969',
          defaultHourlyRateCents: 9400,
          address: '123 rue Example\nMontreal QC H2X 1Y4',
          email: 'factures@example.com',
        }}
        client={{ name: 'Cofomo', email: 'ap@example.com', billingAddress: '1000 De la Gauchetiere' }}
        canSend
        onOpenPdf={() => undefined}
        onSend={() => undefined}
      />,
    );

    const supplierBlock = screen.getByLabelText('Supplier identity preview').textContent ?? '';
    expect(supplierBlock).toMatch(
      /123 rue Example\s*Montreal QC H2X 1Y4\s*TPS : 744492612\s*TVQ : 1230724969\s*NEQ : 949301\s*Courriel : factures@example\.com/,
    );
    expect(supplierBlock).not.toContain('No TPS');
    expect(supplierBlock).not.toContain('No TVQ');
    expect(screen.getByText('TPS')).toBeInTheDocument();
    expect(screen.getByText('TVQ')).toBeInTheDocument();
    expect(screen.queryByText('GST')).not.toBeInTheDocument();
    expect(screen.queryByText('QST')).not.toBeInTheDocument();
  });

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
    const supplierBlocks = screen.getAllByLabelText('Supplier identity preview');
    expect(supplierBlocks[supplierBlocks.length - 1]).toHaveTextContent('Courriel : missing');
    expect(screen.getByRole('button', { name: 'Open PDF' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send by email' })).toBeDisabled();
  });

  it('shows a local confirmation after the email is sent', () => {
    render(
      <InvoicePreview
        draft={{
          invoiceNumber: '2026-001',
          invoiceDate: '2026-06-01',
          paymentTerms: 'Net 30',
          lines: [{ description: 'Services', quantity: 1, unitPrice: 100 }],
          gstRate: 5,
          qstRate: 9.975,
        }}
        copy={uiCopy.en}
        totals={{ subtotalCents: 10000, gstCents: 500, qstCents: 998, totalCents: 11498 }}
        company={{
          legalName: '9493-1011 QUEBEC INC',
          companyNumber: '949301',
          gstNumber: '744492612',
          qstNumber: '1230724969',
          defaultHourlyRateCents: 9400,
          address: 'Montreal, QC',
        }}
        client={{ name: 'Cofomo', email: 'ap@example.com', billingAddress: '1000 De la Gauchetiere' }}
        canSend
        onOpenPdf={() => undefined}
        onSend={() => undefined}
        sendConfirmation="Email sent successfully."
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Email sent successfully.');
  });
});
