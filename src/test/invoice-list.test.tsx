import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InvoiceList } from '../components/InvoiceList';

describe('InvoiceList', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows reporting exports and can mark sent factures as paid with a date', () => {
    const onMarkPaid = vi.fn();

    render(
      <InvoiceList
        invoices={[
          {
            id: 'invoice-123',
            invoiceNumber: '2026-001',
            clientName: 'Cofomo',
            invoiceDate: '2026-06-10',
            totalCents: 11498,
            status: 'sent',
          },
        ]}
        selectedInvoiceId=""
        onSelectInvoice={vi.fn()}
        onStartNewInvoice={vi.fn()}
        onDeleteInvoice={vi.fn()}
        onMarkPaid={onMarkPaid}
        showDeleted={false}
        onToggleDeleted={vi.fn()}
        reportUrl="https://facture.api.amazing-ai.tools/invoices/report.csv"
        batchExportUrl="https://facture.api.amazing-ai.tools/invoices/export/sent.zip"
      />,
    );

    expect(screen.getByRole('link', { name: /Rapport des factures emises/ })).toHaveAttribute(
      'href',
      'https://facture.api.amazing-ai.tools/invoices/report.csv',
    );
    expect(screen.getByRole('link', { name: /Exporter les PDFs envoyes/ })).toHaveAttribute(
      'href',
      'https://facture.api.amazing-ai.tools/invoices/export/sent.zip',
    );

    const history = screen.getByRole('region', { name: 'Facture history' });
    fireEvent.change(within(history).getByLabelText('Payee le'), { target: { value: '2026-06-15' } });
    fireEvent.click(within(history).getByRole('button', { name: /Marquer payee/ }));

    expect(onMarkPaid).toHaveBeenCalledWith('invoice-123', '2026-06-15');
  });

  it('displays paid factures with their payment date instead of payment controls', () => {
    render(
      <InvoiceList
        invoices={[
          {
            id: 'invoice-123',
            invoiceNumber: '2026-001',
            clientName: 'Cofomo',
            invoiceDate: '2026-06-10',
            totalCents: 11498,
            status: 'paid',
            paidAt: '2026-06-15',
          },
        ]}
        selectedInvoiceId=""
        onSelectInvoice={vi.fn()}
        onStartNewInvoice={vi.fn()}
        onDeleteInvoice={vi.fn()}
        onMarkPaid={vi.fn()}
        showDeleted={false}
        onToggleDeleted={vi.fn()}
        reportUrl="/invoices/report.csv"
        batchExportUrl="/invoices/export/sent.zip"
      />,
    );

    expect(screen.getByText('Payee le 2026-06-15')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Marquer payee/ })).not.toBeInTheDocument();
  });
});
