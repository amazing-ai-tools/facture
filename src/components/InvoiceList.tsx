import { FileText } from 'lucide-react';
import type { InvoiceSummary } from '../types';

interface InvoiceListProps {
  invoices: InvoiceSummary[];
  selectedInvoiceId: string;
  onSelectInvoice: (invoiceId: string) => void;
}

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

export function InvoiceList({ invoices, selectedInvoiceId, onSelectInvoice }: InvoiceListProps) {
  return (
    <section className="panel invoice-list" aria-labelledby="invoice-list-heading">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Archive</span>
          <h2 id="invoice-list-heading">Factures</h2>
        </div>
        <FileText size={20} aria-hidden="true" />
      </div>

      <div className="list-stack">
        {invoices.map((invoice) => (
          <button
            className={invoice.id === selectedInvoiceId ? 'invoice-row selected' : 'invoice-row'}
            key={invoice.id}
            type="button"
            onClick={() => onSelectInvoice(invoice.id)}
          >
            <span>
              <strong>{invoice.invoiceNumber}</strong>
              <small>{invoice.clientName}</small>
            </span>
            <span>
              <strong>{currencyFormatter.format(invoice.totalCents / 100)}</strong>
              <small className={`status-tag ${invoice.status}`}>{invoice.status}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
