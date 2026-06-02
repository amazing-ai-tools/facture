import { FileText, Plus, Trash2 } from 'lucide-react';
import type { InvoiceSummary } from '../types';

interface InvoiceListProps {
  invoices: InvoiceSummary[];
  selectedInvoiceId: string;
  onSelectInvoice: (invoiceId: string) => void;
  onStartNewInvoice: () => void;
  onDeleteInvoice: (invoiceId: string) => void;
  showDeleted: boolean;
  onToggleDeleted: (showDeleted: boolean) => void;
  showNewButton?: boolean;
}

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

export function InvoiceList({
  invoices,
  selectedInvoiceId,
  onSelectInvoice,
  onStartNewInvoice,
  onDeleteInvoice,
  showDeleted,
  onToggleDeleted,
  showNewButton = true,
}: InvoiceListProps) {
  return (
    <section className="panel invoice-list" aria-labelledby="invoice-list-heading" aria-label="Facture history">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Archive</span>
          <h2 id="invoice-list-heading">Facture history</h2>
        </div>
        <FileText size={20} aria-hidden="true" />
      </div>

      {showNewButton ? (
        <button className="primary-button full-width-button" type="button" onClick={onStartNewInvoice}>
          <Plus size={16} aria-hidden="true" />
          Create new facture
        </button>
      ) : null}

      <label className="inline-toggle">
        <input
          type="checkbox"
          checked={showDeleted}
          onChange={(event) => onToggleDeleted(event.target.checked)}
        />
        Show deleted factures
      </label>

      <div className="list-stack">
        {invoices.length === 0 ? (
          <p className="empty-state">No saved factures yet.</p>
        ) : (
          invoices.map((invoice) => (
            <div className={invoice.id === selectedInvoiceId ? 'invoice-row selected' : 'invoice-row'} key={invoice.id}>
              <button className="invoice-row-main" type="button" onClick={() => onSelectInvoice(invoice.id)}>
                <span>
                  <strong>{invoice.invoiceNumber}</strong>
                  <small>{invoice.clientName}</small>
                </span>
                <span>
                  <strong>{currencyFormatter.format(invoice.totalCents / 100)}</strong>
                  <small className={`status-tag ${invoice.deletedAt ? 'deleted' : invoice.status}`}>
                    {invoice.deletedAt ? 'deleted' : invoice.status}
                  </small>
                </span>
              </button>
              {!invoice.deletedAt ? (
                <button
                  className="icon-danger-button"
                  type="button"
                  aria-label={`Delete ${invoice.invoiceNumber}`}
                  onClick={() => onDeleteInvoice(invoice.id)}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
